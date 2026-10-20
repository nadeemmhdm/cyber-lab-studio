import type { AwsSimulatorState } from "@/lib/simulators/aws/types";

const FIXED_TIME = "2026-01-01T00:00:00.000Z";

export function createInitialAwsState(labNumber: number): AwsSimulatorState {
  const accountId = "123456789012";
  const vpcId = "vpc-00000001";
  const subnetId = "subnet-00000001";
  const securityGroupId = "sg-00000001";
  const instanceId = "i-00000001";
  const volumeId = "vol-00000001";
  const bucketName = `cyberlab-${labNumber}-training-bucket`;

  const state: AwsSimulatorState = {
    kind: "aws",
    schemaVersion: 1,
    labNumber,
    accountId,
    region: "us-east-1",
    revision: 0,
    principal: {
      arn: `arn:aws:iam::${accountId}:user/cyberlab-student`,
      userName: "cyberlab-student",
      allowedActions: ["*"],
      deniedActions: [],
    },
    counters: { user: 2, group: 2, role: 2, key: 2, vpc: 2, subnet: 2, routeTable: 2, gateway: 2, securityGroup: 2, networkAcl: 2, flowLog: 2, instance: 2, volume: 2, snapshot: 1, objectVersion: 2 },
    iam: {
      users: [
        {
          userName: "analyst",
          userId: "AIDASIM000000000001",
          arn: `arn:aws:iam::${accountId}:user/analyst`,
          createDate: FIXED_TIME,
          groups: ["SecurityStudents"],
          accessKeys: [{ accessKeyId: "AKIASIM000000000001", status: "Active", createDate: FIXED_TIME, lastUsedDate: "2026-01-15T10:00:00.000Z" }],
          inlinePolicies: {
            LegacyAdmin: { Version: "2012-10-17", Statement: { Effect: "Allow", Action: "*", Resource: "*" } },
          },
        },
      ],
      groups: [{ groupName: "SecurityStudents", groupId: "AGPASIM000000000001", arn: `arn:aws:iam::${accountId}:group/SecurityStudents`, users: ["analyst"] }],
      roles: [{ roleName: "ReadOnlyRole", roleId: "AROASIM000000000001", arn: `arn:aws:iam::${accountId}:role/ReadOnlyRole`, assumeRolePolicyDocument: { Version: "2012-10-17", Statement: { Effect: "Allow", Action: "sts:AssumeRole", Resource: "*" } }, inlinePolicies: {} }],
    },
    network: {
      vpcs: [{ vpcId, cidrBlock: "10.0.0.0/16", state: "available", isDefault: false }],
      subnets: [{ subnetId, vpcId, cidrBlock: "10.0.1.0/24", availabilityZone: "us-east-1a", mapPublicIpOnLaunch: true }],
      routeTables: [{ routeTableId: "rtb-00000001", vpcId, routes: [{ destinationCidrBlock: "10.0.0.0/16", state: "active" }, { destinationCidrBlock: "0.0.0.0/0", gatewayId: "igw-00000001", state: "active" }] }],
      internetGateways: [{ internetGatewayId: "igw-00000001", attachments: [{ vpcId, state: "available" }] }],
      securityGroups: [{
        groupId: securityGroupId,
        groupName: "web-open",
        description: "Training security group with intentionally broad SSH exposure",
        vpcId,
        ingress: [{ ipProtocol: "tcp", fromPort: 22, toPort: 22, cidrIp: "0.0.0.0/0" }, { ipProtocol: "tcp", fromPort: 443, toPort: 443, cidrIp: "0.0.0.0/0" }],
        egress: [{ ipProtocol: "-1", fromPort: -1, toPort: -1, cidrIp: "0.0.0.0/0" }],
      }],
      networkAcls: [{ networkAclId: "acl-00000001", vpcId, isDefault: true, entries: [{ ruleNumber: 100, protocol: "-1", ruleAction: "allow", egress: false, cidrBlock: "0.0.0.0/0" }, { ruleNumber: 100, protocol: "-1", ruleAction: "allow", egress: true, cidrBlock: "0.0.0.0/0" }] }],
      flowLogs: [{ flowLogId: "fl-00000001", resourceId: vpcId, trafficType: "ALL", logGroupName: "/aws/vpc/flowlogs" }],
    },
    compute: {
      instances: [{
        instanceId,
        imageId: "ami-cyberlab001",
        instanceType: "t3.micro",
        state: "running",
        subnetId,
        securityGroupIds: [securityGroupId],
        iamRole: "ReadOnlyRole",
        metadataOptions: { httpTokens: "optional", httpEndpoint: "enabled" },
        tags: { Name: "training-web" },
        services: [{ port: 22, protocol: "tcp", name: "ssh" }, { port: 443, protocol: "tcp", name: "https" }],
        patchState: { missingCount: 4, failedCount: 0, installedCount: 87, cves: ["CVE-2026-1001", "CVE-2026-1002"] },
      }],
      volumes: [{ volumeId, size: 16, encrypted: false, state: "in-use", attachedInstanceId: instanceId }],
      snapshots: [],
    },
    s3: {
      buckets: [{
        name: bucketName,
        region: "us-east-1",
        creationDate: FIXED_TIME,
        versioning: "Disabled",
        encryption: null,
        publicAccessBlock: { blockPublicAcls: false, ignorePublicAcls: false, blockPublicPolicy: false, restrictPublicBuckets: false },
        policy: { Version: "2012-10-17", Statement: { Effect: "Allow", Action: "s3:GetObject", Resource: `arn:aws:s3:::${bucketName}/*` } },
        objects: [{ key: "welcome.txt", body: "CyberLab training object", etag: "sim-etag-1", lastModified: FIXED_TIME, versionId: "sim-v1" }],
      }],
    },
    logs: {
      "/aws/vpc/flowlogs": [{ timestamp: FIXED_TIME, message: `2 ${accountId} eni-sim 203.0.113.10 10.0.1.10 51234 22 6 3 180 1767225600 1767225660 ACCEPT OK` }],
      "/aws/cloudtrail/cyberlab": [],
    },
    findings: [],
    audit: [],
    resourceInventory: [],
  };

  refreshAwsDerivedState(state);
  return state;
}

export function refreshAwsDerivedState(state: AwsSimulatorState) {
  const inventory: AwsSimulatorState["resourceInventory"] = [];
  for (const user of state.iam.users) inventory.push({ provider: "AWS", type: "iam:user", id: user.userName });
  for (const role of state.iam.roles) inventory.push({ provider: "AWS", type: "iam:role", id: role.roleName });
  for (const vpc of state.network.vpcs) inventory.push({ provider: "AWS", type: "ec2:vpc", id: vpc.vpcId });
  for (const subnet of state.network.subnets) inventory.push({ provider: "AWS", type: "ec2:subnet", id: subnet.subnetId });
  for (const sg of state.network.securityGroups) inventory.push({ provider: "AWS", type: "ec2:security-group", id: sg.groupId });
  for (const instance of state.compute.instances) inventory.push({ provider: "AWS", type: "ec2:instance", id: instance.instanceId });
  for (const volume of state.compute.volumes) inventory.push({ provider: "AWS", type: "ec2:volume", id: volume.volumeId });
  for (const snapshot of state.compute.snapshots) inventory.push({ provider: "AWS", type: "ec2:snapshot", id: snapshot.snapshotId });
  for (const bucket of state.s3.buckets) inventory.push({ provider: "AWS", type: "s3:bucket", id: bucket.name });
  state.resourceInventory = inventory;

  const findings: AwsSimulatorState["findings"] = [];
  for (const user of state.iam.users) {
    for (const [name, policy] of Object.entries(user.inlinePolicies)) {
      const statements = Array.isArray(policy.Statement) ? policy.Statement : [policy.Statement];
      if (statements.some((s) => s.Effect === "Allow" && (s.Action === "*" || (Array.isArray(s.Action) && s.Action.includes("*"))))) {
        findings.push({ id: `iam-wildcard-${user.userName}-${name}`, severity: "HIGH", resource: user.arn, title: "IAM wildcard permission", description: `Inline policy ${name} grants wildcard actions.` });
      }
    }
  }
  for (const sg of state.network.securityGroups) {
    if (sg.ingress.some((rule) => rule.cidrIp === "0.0.0.0/0" && rule.ipProtocol === "tcp" && rule.fromPort <= 22 && rule.toPort >= 22)) {
      findings.push({ id: `sg-public-ssh-${sg.groupId}`, severity: "HIGH", resource: sg.groupId, title: "SSH exposed to the internet", description: "TCP/22 is reachable from 0.0.0.0/0." });
    }
  }
  for (const instance of state.compute.instances) {
    if (instance.metadataOptions.httpTokens !== "required") findings.push({ id: `imds-v1-${instance.instanceId}`, severity: "MEDIUM", resource: instance.instanceId, title: "IMDSv1 permitted", description: "Require IMDSv2 tokens to harden instance metadata." });
    if (instance.patchState.missingCount > 0) findings.push({ id: `patch-${instance.instanceId}`, severity: "MEDIUM", resource: instance.instanceId, title: "Missing security patches", description: `${instance.patchState.missingCount} simulated patches are missing.` });
  }
  for (const bucket of state.s3.buckets) {
    const publicBlock = bucket.publicAccessBlock;
    if (!publicBlock.blockPublicPolicy || !publicBlock.restrictPublicBuckets) findings.push({ id: `s3-public-${bucket.name}`, severity: "HIGH", resource: bucket.name, title: "S3 public access protections incomplete", description: "Public access block is not fully enabled." });
    if (!bucket.encryption) findings.push({ id: `s3-encryption-${bucket.name}`, severity: "MEDIUM", resource: bucket.name, title: "S3 default encryption missing", description: "Configure default server-side encryption." });
  }
  for (const volume of state.compute.volumes) if (!volume.encrypted) findings.push({ id: `ebs-encryption-${volume.volumeId}`, severity: "MEDIUM", resource: volume.volumeId, title: "EBS volume is unencrypted", description: "The simulated volume has encryption disabled." });
  state.findings = findings;
}
