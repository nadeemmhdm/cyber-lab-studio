import { createHash } from "node:crypto";
import { refreshAwsDerivedState } from "@/lib/simulators/aws/initial-state";
import { AwsCliParseError, optionBoolean, optionNumber, optionString, parseAwsCommand } from "@/lib/simulators/aws/parser";
import type { AwsExecutionResult, AwsPolicyDocument, AwsSimulatorState, ParsedAwsCommand } from "@/lib/simulators/aws/types";

export type AwsErrorCode = "AccessDenied" | "InvalidParameter" | "InvalidParameterValue" | "ResourceNotFound" | "EntityAlreadyExists" | "DependencyViolation" | "UnsupportedOperation";

export class AwsSimulatorError extends Error {
  constructor(public readonly code: AwsErrorCode, message: string, public readonly operation = "Unknown") {
    super(message);
    this.name = "AwsSimulatorError";
  }

  cliMessage() {
    return `An error occurred (${this.code}) when calling the ${this.operation} operation: ${this.message}`;
  }
}

type Handler = { action: string; mutates: boolean; run: (state: AwsSimulatorState, command: ParsedAwsCommand) => unknown };

function globMatch(pattern: string, value: string) {
  if (pattern === "*") return true;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(value);
}

export function isActionAllowed(state: AwsSimulatorState, action: string) {
  if (state.principal.deniedActions.some((pattern) => globMatch(pattern, action))) return false;
  return state.principal.allowedActions.some((pattern) => globMatch(pattern, action));
}

function requirePermission(state: AwsSimulatorState, action: string, operation: string) {
  if (!isActionAllowed(state, action)) throw new AwsSimulatorError("AccessDenied", `User ${state.principal.arn} is not authorized to perform ${action}.`, operation);
}

function required(command: ParsedAwsCommand, name: string, operation: string) {
  try {
    return optionString(command, name, true)!;
  } catch (error) {
    throw new AwsSimulatorError("InvalidParameter", error instanceof Error ? error.message : `Missing --${name}.`, operation);
  }
}

function requiredNumber(command: ParsedAwsCommand, name: string, operation: string) {
  try {
    return optionNumber(command, name, true)!;
  } catch (error) {
    throw new AwsSimulatorError("InvalidParameterValue", error instanceof Error ? error.message : `Invalid --${name}.`, operation);
  }
}

function nextId(state: AwsSimulatorState, counter: string, prefix: string, width = 8) {
  const value = state.counters[counter] ?? 1;
  state.counters[counter] = value + 1;
  return `${prefix}${String(value).padStart(width, "0")}`;
}

function now() {
  return new Date().toISOString();
}

function parsePolicy(raw: string, operation: string): AwsPolicyDocument {
  try {
    const value = JSON.parse(raw) as AwsPolicyDocument;
    if (!value || !value.Statement) throw new Error("Policy requires Statement.");
    return value;
  } catch (error) {
    throw new AwsSimulatorError("InvalidParameterValue", `Invalid JSON policy document: ${error instanceof Error ? error.message : "unknown error"}`, operation);
  }
}

function getUser(state: AwsSimulatorState, name: string, operation: string) {
  const user = state.iam.users.find((entry) => entry.userName === name);
  if (!user) throw new AwsSimulatorError("ResourceNotFound", `The user with name ${name} cannot be found.`, operation);
  return user;
}
function getVpc(state: AwsSimulatorState, id: string, operation: string) {
  const vpc = state.network.vpcs.find((entry) => entry.vpcId === id);
  if (!vpc) throw new AwsSimulatorError("ResourceNotFound", `VPC ${id} does not exist.`, operation);
  return vpc;
}
function getSecurityGroup(state: AwsSimulatorState, id: string, operation: string) {
  const group = state.network.securityGroups.find((entry) => entry.groupId === id);
  if (!group) throw new AwsSimulatorError("ResourceNotFound", `Security group ${id} does not exist.`, operation);
  return group;
}
function getInstance(state: AwsSimulatorState, id: string, operation: string) {
  const instance = state.compute.instances.find((entry) => entry.instanceId === id);
  if (!instance) throw new AwsSimulatorError("ResourceNotFound", `Instance ${id} does not exist.`, operation);
  return instance;
}
function getBucket(state: AwsSimulatorState, name: string, operation: string) {
  const bucket = state.s3.buckets.find((entry) => entry.name === name);
  if (!bucket) throw new AwsSimulatorError("ResourceNotFound", `The specified bucket ${name} does not exist.`, operation);
  return bucket;
}

const registry: Record<string, Handler> = {
  "sts.get-caller-identity": { action: "sts:GetCallerIdentity", mutates: false, run: (s) => ({ UserId: s.principal.userName, Account: s.accountId, Arn: s.principal.arn }) },

  "iam.list-users": { action: "iam:ListUsers", mutates: false, run: (s) => ({ Users: s.iam.users.map((u) => ({ Path: "/", UserName: u.userName, UserId: u.userId, Arn: u.arn, CreateDate: u.createDate })) }) },
  "iam.get-user": { action: "iam:GetUser", mutates: false, run: (s, c) => { const u = getUser(s, optionString(c, "user-name") ?? s.principal.userName, "GetUser"); return { User: { Path: "/", UserName: u.userName, UserId: u.userId, Arn: u.arn, CreateDate: u.createDate } }; } },
  "iam.create-user": { action: "iam:CreateUser", mutates: true, run: (s, c) => { const name = required(c, "user-name", "CreateUser"); if (s.iam.users.some((u) => u.userName === name)) throw new AwsSimulatorError("EntityAlreadyExists", `User ${name} already exists.`, "CreateUser"); const id = nextId(s, "user", "AIDASIM", 12); const user = { userName: name, userId: id, arn: `arn:aws:iam::${s.accountId}:user/${name}`, createDate: now(), groups: [], accessKeys: [], inlinePolicies: {} }; s.iam.users.push(user); return { User: { Path: "/", UserName: name, UserId: id, Arn: user.arn, CreateDate: user.createDate } }; } },
  "iam.delete-user": { action: "iam:DeleteUser", mutates: true, run: (s, c) => { const name = required(c, "user-name", "DeleteUser"); const u = getUser(s, name, "DeleteUser"); if (u.groups.length || u.accessKeys.length || Object.keys(u.inlinePolicies).length) throw new AwsSimulatorError("DependencyViolation", "Remove groups, access keys, and inline policies before deleting the user.", "DeleteUser"); s.iam.users = s.iam.users.filter((x) => x.userName !== name); return {}; } },
  "iam.list-groups": { action: "iam:ListGroups", mutates: false, run: (s) => ({ Groups: s.iam.groups.map((g) => ({ Path: "/", GroupName: g.groupName, GroupId: g.groupId, Arn: g.arn })) }) },
  "iam.create-group": { action: "iam:CreateGroup", mutates: true, run: (s, c) => { const name = required(c, "group-name", "CreateGroup"); if (s.iam.groups.some((g) => g.groupName === name)) throw new AwsSimulatorError("EntityAlreadyExists", `Group ${name} already exists.`, "CreateGroup"); const id = nextId(s, "group", "AGPASIM", 12); const group = { groupName: name, groupId: id, arn: `arn:aws:iam::${s.accountId}:group/${name}`, users: [] as string[] }; s.iam.groups.push(group); return { Group: { Path: "/", GroupName: name, GroupId: id, Arn: group.arn } }; } },
  "iam.add-user-to-group": { action: "iam:AddUserToGroup", mutates: true, run: (s, c) => { const userName = required(c, "user-name", "AddUserToGroup"); const groupName = required(c, "group-name", "AddUserToGroup"); const user = getUser(s, userName, "AddUserToGroup"); const group = s.iam.groups.find((g) => g.groupName === groupName); if (!group) throw new AwsSimulatorError("ResourceNotFound", `Group ${groupName} not found.`, "AddUserToGroup"); if (!user.groups.includes(groupName)) user.groups.push(groupName); if (!group.users.includes(userName)) group.users.push(userName); return {}; } },
  "iam.list-roles": { action: "iam:ListRoles", mutates: false, run: (s) => ({ Roles: s.iam.roles.map((r) => ({ Path: "/", RoleName: r.roleName, RoleId: r.roleId, Arn: r.arn, AssumeRolePolicyDocument: r.assumeRolePolicyDocument })) }) },
  "iam.create-role": { action: "iam:CreateRole", mutates: true, run: (s, c) => { const name = required(c, "role-name", "CreateRole"); if (s.iam.roles.some((r) => r.roleName === name)) throw new AwsSimulatorError("EntityAlreadyExists", `Role ${name} already exists.`, "CreateRole"); const policy = parsePolicy(required(c, "assume-role-policy-document", "CreateRole"), "CreateRole"); const id = nextId(s, "role", "AROASIM", 12); const role = { roleName: name, roleId: id, arn: `arn:aws:iam::${s.accountId}:role/${name}`, assumeRolePolicyDocument: policy, inlinePolicies: {} }; s.iam.roles.push(role); return { Role: { Path: "/", RoleName: name, RoleId: id, Arn: role.arn, AssumeRolePolicyDocument: policy } }; } },
  "iam.list-access-keys": { action: "iam:ListAccessKeys", mutates: false, run: (s, c) => { const u = getUser(s, required(c, "user-name", "ListAccessKeys"), "ListAccessKeys"); return { AccessKeyMetadata: u.accessKeys.map((k) => ({ UserName: u.userName, AccessKeyId: k.accessKeyId, Status: k.status, CreateDate: k.createDate })) }; } },
  "iam.create-access-key": { action: "iam:CreateAccessKey", mutates: true, run: (s, c) => { const u = getUser(s, required(c, "user-name", "CreateAccessKey"), "CreateAccessKey"); if (u.accessKeys.length >= 2) throw new AwsSimulatorError("DependencyViolation", "A user cannot have more than two simulated access keys.", "CreateAccessKey"); const seq = s.counters.key ?? 1; s.counters.key = seq + 1; const accessKeyId = `AKIASIM${String(seq).padStart(12, "0")}`; const secret = `SIMULATED${createHash("sha256").update(`${u.userName}:${seq}`).digest("hex").slice(0, 32).toUpperCase()}`; const key = { accessKeyId, status: "Active" as const, createDate: now(), lastUsedDate: null }; u.accessKeys.push(key); return { AccessKey: { UserName: u.userName, AccessKeyId: accessKeyId, Status: "Active", SecretAccessKey: secret, CreateDate: key.createDate } }; } },
  "iam.update-access-key": { action: "iam:UpdateAccessKey", mutates: true, run: (s, c) => { const u = getUser(s, required(c, "user-name", "UpdateAccessKey"), "UpdateAccessKey"); const id = required(c, "access-key-id", "UpdateAccessKey"); const status = required(c, "status", "UpdateAccessKey"); if (status !== "Active" && status !== "Inactive") throw new AwsSimulatorError("InvalidParameterValue", "Status must be Active or Inactive.", "UpdateAccessKey"); const key = u.accessKeys.find((k) => k.accessKeyId === id); if (!key) throw new AwsSimulatorError("ResourceNotFound", `Access key ${id} not found.`, "UpdateAccessKey"); key.status = status; return {}; } },
  "iam.put-user-policy": { action: "iam:PutUserPolicy", mutates: true, run: (s, c) => { const u = getUser(s, required(c, "user-name", "PutUserPolicy"), "PutUserPolicy"); const name = required(c, "policy-name", "PutUserPolicy"); u.inlinePolicies[name] = parsePolicy(required(c, "policy-document", "PutUserPolicy"), "PutUserPolicy"); return {}; } },
  "iam.list-user-policies": { action: "iam:ListUserPolicies", mutates: false, run: (s, c) => ({ PolicyNames: Object.keys(getUser(s, required(c, "user-name", "ListUserPolicies"), "ListUserPolicies").inlinePolicies) }) },
  "iam.delete-user-policy": { action: "iam:DeleteUserPolicy", mutates: true, run: (s, c) => { const u = getUser(s, required(c, "user-name", "DeleteUserPolicy"), "DeleteUserPolicy"); const name = required(c, "policy-name", "DeleteUserPolicy"); if (!u.inlinePolicies[name]) throw new AwsSimulatorError("ResourceNotFound", `Policy ${name} not found.`, "DeleteUserPolicy"); delete u.inlinePolicies[name]; return {}; } },

  "ec2.describe-vpcs": { action: "ec2:DescribeVpcs", mutates: false, run: (s) => ({ Vpcs: s.network.vpcs.map((v) => ({ VpcId: v.vpcId, CidrBlock: v.cidrBlock, State: v.state, IsDefault: v.isDefault })) }) },
  "ec2.create-vpc": { action: "ec2:CreateVpc", mutates: true, run: (s, c) => { const cidr = required(c, "cidr-block", "CreateVpc"); if (!/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(cidr)) throw new AwsSimulatorError("InvalidParameterValue", "Invalid CIDR block.", "CreateVpc"); const vpcId = nextId(s, "vpc", "vpc-"); const vpc = { vpcId, cidrBlock: cidr, state: "available" as const, isDefault: false }; s.network.vpcs.push(vpc); return { Vpc: { VpcId: vpcId, CidrBlock: cidr, State: "available", IsDefault: false } }; } },
  "ec2.describe-subnets": { action: "ec2:DescribeSubnets", mutates: false, run: (s) => ({ Subnets: s.network.subnets.map((x) => ({ SubnetId: x.subnetId, VpcId: x.vpcId, CidrBlock: x.cidrBlock, AvailabilityZone: x.availabilityZone, MapPublicIpOnLaunch: x.mapPublicIpOnLaunch })) }) },
  "ec2.create-subnet": { action: "ec2:CreateSubnet", mutates: true, run: (s, c) => { const vpcId = required(c, "vpc-id", "CreateSubnet"); getVpc(s, vpcId, "CreateSubnet"); const cidr = required(c, "cidr-block", "CreateSubnet"); const subnetId = nextId(s, "subnet", "subnet-"); const subnet = { subnetId, vpcId, cidrBlock: cidr, availabilityZone: optionString(c, "availability-zone") ?? `${s.region}a`, mapPublicIpOnLaunch: false }; s.network.subnets.push(subnet); return { Subnet: { SubnetId: subnetId, VpcId: vpcId, CidrBlock: cidr, AvailabilityZone: subnet.availabilityZone } }; } },
  "ec2.describe-route-tables": { action: "ec2:DescribeRouteTables", mutates: false, run: (s) => ({ RouteTables: s.network.routeTables.map((r) => ({ RouteTableId: r.routeTableId, VpcId: r.vpcId, Routes: r.routes.map((x) => ({ DestinationCidrBlock: x.destinationCidrBlock, GatewayId: x.gatewayId, State: x.state })) })) }) },
  "ec2.create-route-table": { action: "ec2:CreateRouteTable", mutates: true, run: (s, c) => { const vpcId = required(c, "vpc-id", "CreateRouteTable"); const vpc = getVpc(s, vpcId, "CreateRouteTable"); const routeTableId = nextId(s, "routeTable", "rtb-"); const table = { routeTableId, vpcId, routes: [{ destinationCidrBlock: vpc.cidrBlock, state: "active" as const }] }; s.network.routeTables.push(table); return { RouteTable: { RouteTableId: routeTableId, VpcId: vpcId, Routes: table.routes } }; } },
  "ec2.create-route": { action: "ec2:CreateRoute", mutates: true, run: (s, c) => { const id = required(c, "route-table-id", "CreateRoute"); const table = s.network.routeTables.find((r) => r.routeTableId === id); if (!table) throw new AwsSimulatorError("ResourceNotFound", `Route table ${id} not found.`, "CreateRoute"); const destination = required(c, "destination-cidr-block", "CreateRoute"); const gatewayId = optionString(c, "gateway-id"); if (table.routes.some((r) => r.destinationCidrBlock === destination)) throw new AwsSimulatorError("EntityAlreadyExists", `Route ${destination} already exists.`, "CreateRoute"); table.routes.push({ destinationCidrBlock: destination, gatewayId, state: "active" }); return { Return: true }; } },
  "ec2.create-internet-gateway": { action: "ec2:CreateInternetGateway", mutates: true, run: (s) => { const id = nextId(s, "gateway", "igw-"); s.network.internetGateways.push({ internetGatewayId: id, attachments: [] }); return { InternetGateway: { InternetGatewayId: id, Attachments: [] } }; } },
  "ec2.attach-internet-gateway": { action: "ec2:AttachInternetGateway", mutates: true, run: (s, c) => { const gatewayId = required(c, "internet-gateway-id", "AttachInternetGateway"); const vpcId = required(c, "vpc-id", "AttachInternetGateway"); getVpc(s, vpcId, "AttachInternetGateway"); const gateway = s.network.internetGateways.find((g) => g.internetGatewayId === gatewayId); if (!gateway) throw new AwsSimulatorError("ResourceNotFound", `Internet gateway ${gatewayId} not found.`, "AttachInternetGateway"); if (!gateway.attachments.some((a) => a.vpcId === vpcId)) gateway.attachments.push({ vpcId, state: "available" }); return {}; } },
  "ec2.describe-security-groups": { action: "ec2:DescribeSecurityGroups", mutates: false, run: (s) => ({ SecurityGroups: s.network.securityGroups.map((g) => ({ GroupId: g.groupId, GroupName: g.groupName, Description: g.description, VpcId: g.vpcId, IpPermissions: g.ingress, IpPermissionsEgress: g.egress })) }) },
  "ec2.create-security-group": { action: "ec2:CreateSecurityGroup", mutates: true, run: (s, c) => { const name = required(c, "group-name", "CreateSecurityGroup"); const vpcId = required(c, "vpc-id", "CreateSecurityGroup"); getVpc(s, vpcId, "CreateSecurityGroup"); if (s.network.securityGroups.some((g) => g.groupName === name && g.vpcId === vpcId)) throw new AwsSimulatorError("EntityAlreadyExists", `Security group ${name} already exists.`, "CreateSecurityGroup"); const groupId = nextId(s, "securityGroup", "sg-"); s.network.securityGroups.push({ groupId, groupName: name, description: required(c, "description", "CreateSecurityGroup"), vpcId, ingress: [], egress: [{ ipProtocol: "-1", fromPort: -1, toPort: -1, cidrIp: "0.0.0.0/0" }] }); return { GroupId: groupId, SecurityGroupArn: `arn:aws:ec2:${s.region}:${s.accountId}:security-group/${groupId}` }; } },
  "ec2.authorize-security-group-ingress": { action: "ec2:AuthorizeSecurityGroupIngress", mutates: true, run: (s, c) => { const group = getSecurityGroup(s, required(c, "group-id", "AuthorizeSecurityGroupIngress"), "AuthorizeSecurityGroupIngress"); const rule = { ipProtocol: required(c, "protocol", "AuthorizeSecurityGroupIngress"), fromPort: requiredNumber(c, "port", "AuthorizeSecurityGroupIngress"), toPort: requiredNumber(c, "port", "AuthorizeSecurityGroupIngress"), cidrIp: required(c, "cidr", "AuthorizeSecurityGroupIngress") }; if (group.ingress.some((r) => JSON.stringify(r) === JSON.stringify(rule))) throw new AwsSimulatorError("EntityAlreadyExists", "The specified rule already exists.", "AuthorizeSecurityGroupIngress"); group.ingress.push(rule); return { Return: true }; } },
  "ec2.revoke-security-group-ingress": { action: "ec2:RevokeSecurityGroupIngress", mutates: true, run: (s, c) => { const group = getSecurityGroup(s, required(c, "group-id", "RevokeSecurityGroupIngress"), "RevokeSecurityGroupIngress"); const protocol = required(c, "protocol", "RevokeSecurityGroupIngress"); const port = requiredNumber(c, "port", "RevokeSecurityGroupIngress"); const cidr = required(c, "cidr", "RevokeSecurityGroupIngress"); const before = group.ingress.length; group.ingress = group.ingress.filter((r) => !(r.ipProtocol === protocol && r.fromPort === port && r.toPort === port && r.cidrIp === cidr)); if (before === group.ingress.length) throw new AwsSimulatorError("ResourceNotFound", "The specified ingress rule does not exist.", "RevokeSecurityGroupIngress"); return { Return: true }; } },
  "ec2.describe-network-acls": { action: "ec2:DescribeNetworkAcls", mutates: false, run: (s) => ({ NetworkAcls: s.network.networkAcls.map((a) => ({ NetworkAclId: a.networkAclId, VpcId: a.vpcId, IsDefault: a.isDefault, Entries: a.entries })) }) },
  "ec2.create-network-acl": { action: "ec2:CreateNetworkAcl", mutates: true, run: (s, c) => { const vpcId = required(c, "vpc-id", "CreateNetworkAcl"); getVpc(s, vpcId, "CreateNetworkAcl"); const id = nextId(s, "networkAcl", "acl-"); const acl = { networkAclId: id, vpcId, isDefault: false, entries: [] as AwsSimulatorState["network"]["networkAcls"][number]["entries"] }; s.network.networkAcls.push(acl); return { NetworkAcl: { NetworkAclId: id, VpcId: vpcId, IsDefault: false, Entries: [] } }; } },
  "ec2.create-network-acl-entry": { action: "ec2:CreateNetworkAclEntry", mutates: true, run: (s, c) => { const id = required(c, "network-acl-id", "CreateNetworkAclEntry"); const acl = s.network.networkAcls.find((a) => a.networkAclId === id); if (!acl) throw new AwsSimulatorError("ResourceNotFound", `Network ACL ${id} not found.`, "CreateNetworkAclEntry"); const ruleNumber = requiredNumber(c, "rule-number", "CreateNetworkAclEntry"); const egress = optionBoolean(c, "egress") ?? false; if (acl.entries.some((e) => e.ruleNumber === ruleNumber && e.egress === egress)) throw new AwsSimulatorError("EntityAlreadyExists", `Rule ${ruleNumber} already exists.`, "CreateNetworkAclEntry"); const port = optionNumber(c, "port"); acl.entries.push({ ruleNumber, protocol: required(c, "protocol", "CreateNetworkAclEntry"), ruleAction: required(c, "rule-action", "CreateNetworkAclEntry") === "deny" ? "deny" : "allow", egress, cidrBlock: required(c, "cidr-block", "CreateNetworkAclEntry"), ...(port !== undefined ? { portRange: { from: port, to: port } } : {}) }); return {}; } },
  "ec2.describe-flow-logs": { action: "ec2:DescribeFlowLogs", mutates: false, run: (s) => ({ FlowLogs: s.network.flowLogs.map((f) => ({ FlowLogId: f.flowLogId, ResourceId: f.resourceId, TrafficType: f.trafficType, LogGroupName: f.logGroupName, FlowLogStatus: "ACTIVE" })) }) },

  "ec2.describe-instances": { action: "ec2:DescribeInstances", mutates: false, run: (s) => ({ Reservations: [{ Instances: s.compute.instances.map((i) => ({ InstanceId: i.instanceId, ImageId: i.imageId, InstanceType: i.instanceType, State: { Name: i.state }, SubnetId: i.subnetId, SecurityGroups: i.securityGroupIds.map((id) => ({ GroupId: id })), IamInstanceProfile: i.iamRole ? { Arn: `arn:aws:iam::${s.accountId}:instance-profile/${i.iamRole}` } : undefined, MetadataOptions: { HttpTokens: i.metadataOptions.httpTokens, HttpEndpoint: i.metadataOptions.httpEndpoint }, Tags: Object.entries(i.tags).map(([Key, Value]) => ({ Key, Value })) })) }] }) },
  "ec2.run-instances": { action: "ec2:RunInstances", mutates: true, run: (s, c) => { const imageId = required(c, "image-id", "RunInstances"); const instanceType = required(c, "instance-type", "RunInstances"); const subnetId = optionString(c, "subnet-id"); if (subnetId && !s.network.subnets.some((x) => x.subnetId === subnetId)) throw new AwsSimulatorError("ResourceNotFound", `Subnet ${subnetId} not found.`, "RunInstances"); const id = nextId(s, "instance", "i-"); const sgId = optionString(c, "security-group-id"); if (sgId) getSecurityGroup(s, sgId, "RunInstances"); const instance = { instanceId: id, imageId, instanceType, state: "running" as const, subnetId: subnetId ?? null, securityGroupIds: sgId ? [sgId] : [], iamRole: null, metadataOptions: { httpTokens: "optional" as const, httpEndpoint: "enabled" as const }, tags: {}, services: [], patchState: { missingCount: 0, failedCount: 0, installedCount: 0, cves: [] as string[] } }; s.compute.instances.push(instance); return { Instances: [{ InstanceId: id, ImageId: imageId, InstanceType: instanceType, State: { Name: "running" } }] }; } },
  "ec2.stop-instances": { action: "ec2:StopInstances", mutates: true, run: (s, c) => { const id = required(c, "instance-id", "StopInstances"); const i = getInstance(s, id, "StopInstances"); const previous = i.state; i.state = "stopped"; return { StoppingInstances: [{ InstanceId: id, PreviousState: { Name: previous }, CurrentState: { Name: "stopped" } }] }; } },
  "ec2.start-instances": { action: "ec2:StartInstances", mutates: true, run: (s, c) => { const id = required(c, "instance-id", "StartInstances"); const i = getInstance(s, id, "StartInstances"); const previous = i.state; i.state = "running"; return { StartingInstances: [{ InstanceId: id, PreviousState: { Name: previous }, CurrentState: { Name: "running" } }] }; } },
  "ec2.modify-instance-metadata-options": { action: "ec2:ModifyInstanceMetadataOptions", mutates: true, run: (s, c) => { const i = getInstance(s, required(c, "instance-id", "ModifyInstanceMetadataOptions"), "ModifyInstanceMetadataOptions"); const tokens = required(c, "http-tokens", "ModifyInstanceMetadataOptions"); if (tokens !== "optional" && tokens !== "required") throw new AwsSimulatorError("InvalidParameterValue", "--http-tokens must be optional or required.", "ModifyInstanceMetadataOptions"); i.metadataOptions.httpTokens = tokens; return { InstanceId: i.instanceId, InstanceMetadataOptions: { HttpTokens: tokens, HttpEndpoint: i.metadataOptions.httpEndpoint }, State: "applied" }; } },
  "ec2.describe-volumes": { action: "ec2:DescribeVolumes", mutates: false, run: (s) => ({ Volumes: s.compute.volumes.map((v) => ({ VolumeId: v.volumeId, Size: v.size, Encrypted: v.encrypted, State: v.state, Attachments: v.attachedInstanceId ? [{ InstanceId: v.attachedInstanceId, State: "attached" }] : [] })) }) },
  "ec2.create-snapshot": { action: "ec2:CreateSnapshot", mutates: true, run: (s, c) => { const volumeId = required(c, "volume-id", "CreateSnapshot"); const volume = s.compute.volumes.find((v) => v.volumeId === volumeId); if (!volume) throw new AwsSimulatorError("ResourceNotFound", `Volume ${volumeId} not found.`, "CreateSnapshot"); const snapshotId = nextId(s, "snapshot", "snap-"); const snapshot = { snapshotId, volumeId, state: "completed" as const, encrypted: volume.encrypted, createdAt: now(), public: false }; s.compute.snapshots.push(snapshot); return { SnapshotId: snapshotId, VolumeId: volumeId, State: "completed", Encrypted: snapshot.encrypted, StartTime: snapshot.createdAt }; } },
  "ec2.describe-snapshots": { action: "ec2:DescribeSnapshots", mutates: false, run: (s) => ({ Snapshots: s.compute.snapshots.map((x) => ({ SnapshotId: x.snapshotId, VolumeId: x.volumeId, State: x.state, Encrypted: x.encrypted, StartTime: x.createdAt, Public: x.public })) }) },

  "ssm.describe-instance-patch-states": { action: "ssm:DescribeInstancePatchStates", mutates: false, run: (s) => ({ InstancePatchStates: s.compute.instances.map((i) => ({ InstanceId: i.instanceId, MissingCount: i.patchState.missingCount, FailedCount: i.patchState.failedCount, InstalledCount: i.patchState.installedCount, CriticalNonCompliantCount: i.patchState.cves.length })) }) },

  "s3.ls": { action: "s3:ListAllMyBuckets", mutates: false, run: (s) => s.s3.buckets.map((b) => `${b.creationDate} ${b.name}`).join("\n") },
  "s3api.list-buckets": { action: "s3:ListAllMyBuckets", mutates: false, run: (s) => ({ Buckets: s.s3.buckets.map((b) => ({ Name: b.name, CreationDate: b.creationDate })), Owner: { ID: s.accountId, DisplayName: "cyberlab-student" } }) },
  "s3api.create-bucket": { action: "s3:CreateBucket", mutates: true, run: (s, c) => { const name = required(c, "bucket", "CreateBucket"); if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name)) throw new AwsSimulatorError("InvalidParameterValue", "Bucket name is invalid.", "CreateBucket"); if (s.s3.buckets.some((b) => b.name === name)) throw new AwsSimulatorError("EntityAlreadyExists", `Bucket ${name} already exists.`, "CreateBucket"); s.s3.buckets.push({ name, region: s.region, creationDate: now(), versioning: "Disabled", encryption: null, publicAccessBlock: { blockPublicAcls: true, ignorePublicAcls: true, blockPublicPolicy: true, restrictPublicBuckets: true }, policy: null, objects: [] }); return { Location: `/${name}` }; } },
  "s3api.put-object": { action: "s3:PutObject", mutates: true, run: (s, c) => { const bucket = getBucket(s, required(c, "bucket", "PutObject"), "PutObject"); const key = required(c, "key", "PutObject"); const body = required(c, "body", "PutObject"); const seq = s.counters.objectVersion ?? 1; s.counters.objectVersion = seq + 1; const object = { key, body, etag: createHash("md5").update(body).digest("hex"), lastModified: now(), versionId: `sim-v${seq}` }; if (bucket.versioning === "Enabled") bucket.objects.push(object); else { bucket.objects = bucket.objects.filter((o) => o.key !== key); bucket.objects.push(object); } return { ETag: `\"${object.etag}\"`, VersionId: bucket.versioning === "Enabled" ? object.versionId : undefined }; } },
  "s3api.get-object": { action: "s3:GetObject", mutates: false, run: (s, c) => { const bucket = getBucket(s, required(c, "bucket", "GetObject"), "GetObject"); const key = required(c, "key", "GetObject"); const object = [...bucket.objects].reverse().find((o) => o.key === key); if (!object) throw new AwsSimulatorError("ResourceNotFound", `Object ${key} not found.`, "GetObject"); return { Body: object.body, ETag: `\"${object.etag}\"`, LastModified: object.lastModified, VersionId: object.versionId }; } },
  "s3api.delete-object": { action: "s3:DeleteObject", mutates: true, run: (s, c) => { const bucket = getBucket(s, required(c, "bucket", "DeleteObject"), "DeleteObject"); const key = required(c, "key", "DeleteObject"); const before = bucket.objects.length; bucket.objects = bucket.objects.filter((o) => o.key !== key); if (before === bucket.objects.length) throw new AwsSimulatorError("ResourceNotFound", `Object ${key} not found.`, "DeleteObject"); return {}; } },
  "s3api.list-objects-v2": { action: "s3:ListBucket", mutates: false, run: (s, c) => { const bucket = getBucket(s, required(c, "bucket", "ListObjectsV2"), "ListObjectsV2"); const latest = new Map<string, typeof bucket.objects[number]>(); for (const object of bucket.objects) latest.set(object.key, object); return { IsTruncated: false, Name: bucket.name, KeyCount: latest.size, Contents: [...latest.values()].map((o) => ({ Key: o.key, LastModified: o.lastModified, ETag: `\"${o.etag}\"`, Size: o.body.length })) }; } },
  "s3api.get-public-access-block": { action: "s3:GetBucketPublicAccessBlock", mutates: false, run: (s, c) => { const b = getBucket(s, required(c, "bucket", "GetPublicAccessBlock"), "GetPublicAccessBlock"); return { PublicAccessBlockConfiguration: { BlockPublicAcls: b.publicAccessBlock.blockPublicAcls, IgnorePublicAcls: b.publicAccessBlock.ignorePublicAcls, BlockPublicPolicy: b.publicAccessBlock.blockPublicPolicy, RestrictPublicBuckets: b.publicAccessBlock.restrictPublicBuckets } }; } },
  "s3api.put-public-access-block": { action: "s3:PutBucketPublicAccessBlock", mutates: true, run: (s, c) => { const b = getBucket(s, required(c, "bucket", "PutPublicAccessBlock"), "PutPublicAccessBlock"); const value = required(c, "public-access-block-configuration", "PutPublicAccessBlock"); const parts = Object.fromEntries(value.split(",").map((piece) => piece.split("=").map((x) => x.trim()))); b.publicAccessBlock = { blockPublicAcls: parts.BlockPublicAcls !== "false", ignorePublicAcls: parts.IgnorePublicAcls !== "false", blockPublicPolicy: parts.BlockPublicPolicy !== "false", restrictPublicBuckets: parts.RestrictPublicBuckets !== "false" }; return {}; } },
  "s3api.get-bucket-policy": { action: "s3:GetBucketPolicy", mutates: false, run: (s, c) => { const b = getBucket(s, required(c, "bucket", "GetBucketPolicy"), "GetBucketPolicy"); if (!b.policy) throw new AwsSimulatorError("ResourceNotFound", "The bucket policy does not exist.", "GetBucketPolicy"); return { Policy: JSON.stringify(b.policy) }; } },
  "s3api.put-bucket-policy": { action: "s3:PutBucketPolicy", mutates: true, run: (s, c) => { const b = getBucket(s, required(c, "bucket", "PutBucketPolicy"), "PutBucketPolicy"); b.policy = parsePolicy(required(c, "policy", "PutBucketPolicy"), "PutBucketPolicy"); return {}; } },
  "s3api.get-bucket-encryption": { action: "s3:GetEncryptionConfiguration", mutates: false, run: (s, c) => { const b = getBucket(s, required(c, "bucket", "GetBucketEncryption"), "GetBucketEncryption"); if (!b.encryption) throw new AwsSimulatorError("ResourceNotFound", "Server-side encryption configuration not found.", "GetBucketEncryption"); return { ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: b.encryption.algorithm, KMSMasterKeyID: b.encryption.kmsKeyId } }] } }; } },
  "s3api.put-bucket-encryption": { action: "s3:PutEncryptionConfiguration", mutates: true, run: (s, c) => { const b = getBucket(s, required(c, "bucket", "PutBucketEncryption"), "PutBucketEncryption"); const algorithm = required(c, "algorithm", "PutBucketEncryption"); if (algorithm !== "AES256" && algorithm !== "aws:kms") throw new AwsSimulatorError("InvalidParameterValue", "Algorithm must be AES256 or aws:kms.", "PutBucketEncryption"); b.encryption = { algorithm, ...(algorithm === "aws:kms" && optionString(c, "kms-key-id") ? { kmsKeyId: optionString(c, "kms-key-id") } : {}) }; return {}; } },
  "s3api.get-bucket-versioning": { action: "s3:GetBucketVersioning", mutates: false, run: (s, c) => { const b = getBucket(s, required(c, "bucket", "GetBucketVersioning"), "GetBucketVersioning"); return b.versioning === "Disabled" ? {} : { Status: b.versioning }; } },
  "s3api.put-bucket-versioning": { action: "s3:PutBucketVersioning", mutates: true, run: (s, c) => { const b = getBucket(s, required(c, "bucket", "PutBucketVersioning"), "PutBucketVersioning"); const status = required(c, "status", "PutBucketVersioning"); if (status !== "Enabled" && status !== "Suspended") throw new AwsSimulatorError("InvalidParameterValue", "Status must be Enabled or Suspended.", "PutBucketVersioning"); b.versioning = status; return {}; } },

  "logs.describe-log-groups": { action: "logs:DescribeLogGroups", mutates: false, run: (s) => ({ logGroups: Object.keys(s.logs).map((logGroupName) => ({ logGroupName, storedBytes: JSON.stringify(s.logs[logGroupName]).length })) }) },
  "logs.filter-log-events": { action: "logs:FilterLogEvents", mutates: false, run: (s, c) => { const name = required(c, "log-group-name", "FilterLogEvents"); const events = s.logs[name]; if (!events) throw new AwsSimulatorError("ResourceNotFound", `Log group ${name} not found.`, "FilterLogEvents"); const pattern = optionString(c, "filter-pattern")?.toLowerCase(); return { events: events.filter((e) => !pattern || e.message.toLowerCase().includes(pattern)).map((e, index) => ({ eventId: `${name}:${index}`, timestamp: e.timestamp, message: e.message })) }; } },
  "securityhub.get-findings": { action: "securityhub:GetFindings", mutates: false, run: (s) => ({ Findings: s.findings.map((f) => ({ Id: f.id, Severity: { Label: f.severity }, Resources: [{ Id: f.resource }], Title: f.title, Description: f.description })) }) },
};

export const AWS_SUPPORTED_COMMANDS = Object.keys(registry).sort();

export function executeAwsCommand(state: AwsSimulatorState, input: string): AwsExecutionResult {
  let command: ParsedAwsCommand;
  try {
    command = parseAwsCommand(input);
  } catch (error) {
    throw new AwsSimulatorError("InvalidParameter", error instanceof AwsCliParseError ? error.message : "Unable to parse command.", "ParseCommand");
  }
  const key = `${command.service}.${command.operation}`;
  const handler = registry[key];
  if (!handler) throw new AwsSimulatorError("UnsupportedOperation", `CyberLab does not support '${key}'. Run only commands listed in the compatibility matrix.`, command.operation);
  requirePermission(state, handler.action, command.operation);
  const output = handler.run(state, command);
  if (handler.mutates) {
    state.revision += 1;
    refreshAwsDerivedState(state);
    state.audit.push({ timestamp: now(), action: handler.action, principal: state.principal.arn, resource: key, result: "Success" });
    state.logs["/aws/cloudtrail/cyberlab"] ??= [];
    state.logs["/aws/cloudtrail/cyberlab"].push({ timestamp: now(), message: JSON.stringify({ eventName: command.operation, eventSource: `${command.service}.amazonaws.com`, userIdentity: state.principal.arn, result: "Success" }) });
  }
  return { output, mutated: handler.mutates, action: handler.action };
}
