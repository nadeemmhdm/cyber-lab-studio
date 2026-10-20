import { randomUUID } from "node:crypto";
import { LearningMode } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startLab, getWorkspace } from "@/lib/labs/engine";
import { prisma } from "@/lib/prisma";
import { AWS_COMPATIBILITY } from "@/lib/simulators/aws/compatibility";
import { AwsSimulatorError, AWS_SUPPORTED_COMMANDS, executeAwsCommand, isActionAllowed } from "@/lib/simulators/aws/engine";
import { createInitialAwsState } from "@/lib/simulators/aws/initial-state";
import { parseAwsCommand } from "@/lib/simulators/aws/parser";
import { executePersistedAwsCommand } from "@/lib/simulators/aws/persistence";
import type { AwsSimulatorState } from "@/lib/simulators/aws/types";

function state() { return createInitialAwsState(8); }

describe("AWS CLI parser", () => {
  it("parses quoted JSON without using a host shell", () => {
    const command = parseAwsCommand(`aws iam put-user-policy --user-name analyst --policy-name Safe --policy-document '{"Statement":{"Effect":"Allow","Action":"s3:GetObject","Resource":"*"}}'`);
    expect(command.service).toBe("iam");
    expect(command.operation).toBe("put-user-policy");
    expect(command.options["policy-name"]).toBe("Safe");
    expect(String(command.options["policy-document"])).toContain("s3:GetObject");
  });
});

describe("AWS simulator registry", () => {
  it("returns caller identity and exposes the documented registry", () => {
    const s = state();
    const result = executeAwsCommand(s, "aws sts get-caller-identity");
    expect(result.output).toMatchObject({ Account: "123456789012" });
    expect(AWS_SUPPORTED_COMMANDS.length).toBeGreaterThan(40);
    expect(AWS_COMPATIBILITY.every((entry) => entry.tested && entry.testFile === "tests/aws-simulator.test.ts")).toBe(true);
  });

  it("mutates IAM state and rejects duplicates", () => {
    const s = state();
    executeAwsCommand(s, "aws iam create-user --user-name blue-team");
    expect(s.iam.users.some((u) => u.userName === "blue-team")).toBe(true);
    expect(() => executeAwsCommand(s, "aws iam create-user --user-name blue-team")).toThrowError(AwsSimulatorError);
  });

  it("honors explicit deny before allow", () => {
    const s = state();
    s.principal.allowedActions = ["*"];
    s.principal.deniedActions = ["s3:PutObject"];
    expect(isActionAllowed(s, "s3:GetObject")).toBe(true);
    expect(isActionAllowed(s, "s3:PutObject")).toBe(false);
    try { executeAwsCommand(s, `aws s3api put-object --bucket cyberlab-8-training-bucket --key blocked.txt --body blocked`); }
    catch (error) { expect(error).toMatchObject({ code: "AccessDenied" }); }
  });

  it("creates network resources and hardens public SSH findings", () => {
    const s = state();
    const before = s.findings.some((f) => f.id.startsWith("sg-public-ssh"));
    expect(before).toBe(true);
    executeAwsCommand(s, "aws ec2 create-vpc --cidr-block 10.50.0.0/16");
    expect(s.network.vpcs).toHaveLength(2);
    executeAwsCommand(s, "aws ec2 revoke-security-group-ingress --group-id sg-00000001 --protocol tcp --port 22 --cidr 0.0.0.0/0");
    expect(s.findings.some((f) => f.id.startsWith("sg-public-ssh"))).toBe(false);
  });

  it("changes EC2 state, metadata hardening and snapshots", () => {
    const s = state();
    executeAwsCommand(s, "aws ec2 stop-instances --instance-id i-00000001");
    expect(s.compute.instances[0].state).toBe("stopped");
    executeAwsCommand(s, "aws ec2 start-instances --instance-id i-00000001");
    executeAwsCommand(s, "aws ec2 modify-instance-metadata-options --instance-id i-00000001 --http-tokens required");
    expect(s.compute.instances[0].metadataOptions.httpTokens).toBe("required");
    expect(s.findings.some((f) => f.id.startsWith("imds-v1"))).toBe(false);
    executeAwsCommand(s, "aws ec2 create-snapshot --volume-id vol-00000001");
    expect(s.compute.snapshots).toHaveLength(1);
  });

  it("persists S3 object/versioning/encryption/public access changes", () => {
    const s = state();
    const bucket = "cyberlab-8-training-bucket";
    executeAwsCommand(s, `aws s3api put-bucket-versioning --bucket ${bucket} --status Enabled`);
    executeAwsCommand(s, `aws s3api put-bucket-encryption --bucket ${bucket} --algorithm AES256`);
    executeAwsCommand(s, `aws s3api put-public-access-block --bucket ${bucket} --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`);
    executeAwsCommand(s, `aws s3api put-object --bucket ${bucket} --key evidence.txt --body "hello world"`);
    expect(s.s3.buckets[0].versioning).toBe("Enabled");
    expect(s.s3.buckets[0].encryption?.algorithm).toBe("AES256");
    expect(s.s3.buckets[0].objects.some((o) => o.key === "evidence.txt" && o.body === "hello world")).toBe(true);
    expect(s.findings.some((f) => f.id.startsWith("s3-public"))).toBe(false);
    expect(s.findings.some((f) => f.id.startsWith("s3-encryption"))).toBe(false);
  });

  it("returns logs/findings and rejects unsupported commands explicitly", () => {
    const s = state();
    expect(executeAwsCommand(s, "aws securityhub get-findings").output).toHaveProperty("Findings");
    expect(executeAwsCommand(s, "aws logs describe-log-groups").output).toHaveProperty("logGroups");
    try { executeAwsCommand(s, "aws lambda list-functions"); }
    catch (error) { expect(error).toMatchObject({ code: "UnsupportedOperation" }); }
  });
});

describe("AWS persisted student isolation", () => {
  const suffix = randomUUID().slice(0, 8);
  let userA = "";
  let userB = "";

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      prisma.user.create({ data: { email: `aws-a-${suffix}@example.test`, displayName: "AWS A" } }),
      prisma.user.create({ data: { email: `aws-b-${suffix}@example.test`, displayName: "AWS B" } }),
    ]);
    userA = a.id; userB = b.id;
    await startLab(userA, "aws-security-groups", LearningMode.GUIDED);
    await startLab(userB, "aws-security-groups", LearningMode.GUIDED);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB].filter(Boolean) } } });
  });

  it("persists commands only to the caller's environment", async () => {
    const a = await getWorkspace(userA, "aws-security-groups");
    const b = await getWorkspace(userB, "aws-security-groups");
    expect(a && b).toBeTruthy();
    const result = await executePersistedAwsCommand(userA, a!.environment.id, "aws ec2 revoke-security-group-ingress --group-id sg-00000001 --protocol tcp --port 22 --cidr 0.0.0.0/0");
    expect(result.exitCode).toBe(0);
    const afterA = await getWorkspace(userA, "aws-security-groups");
    const afterB = await getWorkspace(userB, "aws-security-groups");
    const stateA = afterA!.environment.environmentState as unknown as AwsSimulatorState;
    const stateB = afterB!.environment.environmentState as unknown as AwsSimulatorState;
    expect(stateA.network.securityGroups[0].ingress.some((r) => r.fromPort === 22 && r.cidrIp === "0.0.0.0/0")).toBe(false);
    expect(stateB.network.securityGroups[0].ingress.some((r) => r.fromPort === 22 && r.cidrIp === "0.0.0.0/0")).toBe(true);
    const history = await prisma.terminalHistory.findMany({ where: { userId: userA, environmentId: a!.environment.id } });
    expect(history.some((item) => item.command.includes("revoke-security-group-ingress") && item.exitCode === 0)).toBe(true);
  });
});
