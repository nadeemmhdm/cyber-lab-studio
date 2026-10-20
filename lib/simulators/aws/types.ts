export type AwsEffect = "Allow" | "Deny";

export type AwsPolicyStatement = {
  Effect: AwsEffect;
  Action: string | string[];
  Resource: string | string[];
};

export type AwsPolicyDocument = {
  Version?: string;
  Statement: AwsPolicyStatement | AwsPolicyStatement[];
};

export type AwsAccessKey = {
  accessKeyId: string;
  status: "Active" | "Inactive";
  createDate: string;
  lastUsedDate: string | null;
};

export type AwsIamUser = {
  userName: string;
  userId: string;
  arn: string;
  createDate: string;
  groups: string[];
  accessKeys: AwsAccessKey[];
  inlinePolicies: Record<string, AwsPolicyDocument>;
};

export type AwsIamGroup = { groupName: string; groupId: string; arn: string; users: string[] };
export type AwsIamRole = { roleName: string; roleId: string; arn: string; assumeRolePolicyDocument: AwsPolicyDocument; inlinePolicies: Record<string, AwsPolicyDocument> };
export type AwsVpc = { vpcId: string; cidrBlock: string; state: "available"; isDefault: boolean };
export type AwsSubnet = { subnetId: string; vpcId: string; cidrBlock: string; availabilityZone: string; mapPublicIpOnLaunch: boolean };
export type AwsRoute = { destinationCidrBlock: string; gatewayId?: string; state: "active" };
export type AwsRouteTable = { routeTableId: string; vpcId: string; routes: AwsRoute[] };
export type AwsInternetGateway = { internetGatewayId: string; attachments: { vpcId: string; state: "available" }[] };
export type AwsSecurityGroupRule = { ipProtocol: string; fromPort: number; toPort: number; cidrIp: string };
export type AwsSecurityGroup = { groupId: string; groupName: string; description: string; vpcId: string; ingress: AwsSecurityGroupRule[]; egress: AwsSecurityGroupRule[] };
export type AwsNetworkAclEntry = { ruleNumber: number; protocol: string; ruleAction: "allow" | "deny"; egress: boolean; cidrBlock: string; portRange?: { from: number; to: number } };
export type AwsNetworkAcl = { networkAclId: string; vpcId: string; isDefault: boolean; entries: AwsNetworkAclEntry[] };
export type AwsFlowLog = { flowLogId: string; resourceId: string; trafficType: "ALL" | "ACCEPT" | "REJECT"; logGroupName: string };

export type AwsInstance = {
  instanceId: string;
  imageId: string;
  instanceType: string;
  state: "pending" | "running" | "stopped";
  subnetId: string | null;
  securityGroupIds: string[];
  iamRole: string | null;
  metadataOptions: { httpTokens: "optional" | "required"; httpEndpoint: "enabled" | "disabled" };
  tags: Record<string, string>;
  services: { port: number; protocol: string; name: string }[];
  patchState: { missingCount: number; failedCount: number; installedCount: number; cves: string[] };
};
export type AwsVolume = { volumeId: string; size: number; encrypted: boolean; state: "available" | "in-use"; attachedInstanceId: string | null };
export type AwsSnapshot = { snapshotId: string; volumeId: string; state: "completed"; encrypted: boolean; createdAt: string; public: boolean };
export type AwsS3Object = { key: string; body: string; etag: string; lastModified: string; versionId: string };
export type AwsS3Bucket = {
  name: string;
  region: string;
  creationDate: string;
  versioning: "Enabled" | "Suspended" | "Disabled";
  encryption: { algorithm: "AES256" | "aws:kms"; kmsKeyId?: string } | null;
  publicAccessBlock: { blockPublicAcls: boolean; ignorePublicAcls: boolean; blockPublicPolicy: boolean; restrictPublicBuckets: boolean };
  policy: AwsPolicyDocument | null;
  objects: AwsS3Object[];
};
export type AwsLogEvent = { timestamp: string; message: string };
export type AwsFinding = { id: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; resource: string; title: string; description: string };
export type AwsAuditEvent = { timestamp: string; action: string; principal: string; resource: string; result: "Success" | "Denied" };

export type AwsSimulatorState = {
  kind: "aws";
  schemaVersion: 1;
  labNumber: number;
  accountId: string;
  region: string;
  revision: number;
  principal: { arn: string; userName: string; allowedActions: string[]; deniedActions: string[] };
  counters: Record<string, number>;
  iam: { users: AwsIamUser[]; groups: AwsIamGroup[]; roles: AwsIamRole[] };
  network: { vpcs: AwsVpc[]; subnets: AwsSubnet[]; routeTables: AwsRouteTable[]; internetGateways: AwsInternetGateway[]; securityGroups: AwsSecurityGroup[]; networkAcls: AwsNetworkAcl[]; flowLogs: AwsFlowLog[] };
  compute: { instances: AwsInstance[]; volumes: AwsVolume[]; snapshots: AwsSnapshot[] };
  s3: { buckets: AwsS3Bucket[] };
  logs: Record<string, AwsLogEvent[]>;
  findings: AwsFinding[];
  audit: AwsAuditEvent[];
  resourceInventory: { provider: "AWS"; type: string; id: string }[];
};

export type ParsedAwsCommand = { service: string; operation: string; options: Record<string, string | boolean>; positionals: string[] };
export type AwsExecutionResult = { output: unknown; mutated: boolean; action: string };
export type AwsCliResult = { exitCode: number; output: unknown; error?: { code: string; message: string } };
