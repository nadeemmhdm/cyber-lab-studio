export type AzureRoleName = "Owner" | "Contributor" | "Reader" | "User Access Administrator" | "Storage Blob Data Contributor";

export type AzureIdentity = {
  id: string;
  userPrincipalName: string;
  displayName: string;
  accountEnabled: boolean;
  groups: string[];
};

export type AzureGroup = { id: string; displayName: string; members: string[] };
export type AzureRoleAssignment = { id: string; principalId: string; role: AzureRoleName; scope: string };
export type AzureResourceGroup = { id: string; name: string; location: string; tags: Record<string, string> };
export type AzureNsgRule = { name: string; priority: number; direction: "Inbound" | "Outbound"; access: "Allow" | "Deny"; protocol: "Tcp" | "Udp" | "*"; source: string; destination: string; destinationPort: string };
export type AzureNsg = { id: string; name: string; resourceGroup: string; location: string; rules: AzureNsgRule[] };
export type AzureSubnet = { id: string; name: string; addressPrefix: string; nsgId: string | null };
export type AzureVnet = { id: string; name: string; resourceGroup: string; location: string; addressPrefixes: string[]; subnets: AzureSubnet[] };
export type AzureStorageContainer = { name: string; publicAccess: "off" | "blob" | "container"; blobs: { name: string; content: string; lastModified: string }[] };
export type AzureStorageAccount = { id: string; name: string; resourceGroup: string; location: string; sku: string; httpsOnly: boolean; minimumTlsVersion: "TLS1_0" | "TLS1_1" | "TLS1_2"; allowBlobPublicAccess: boolean; encryptionServices: string[]; containers: AzureStorageContainer[] };
export type AzureVm = { id: string; name: string; resourceGroup: string; location: string; size: string; powerState: "VM running" | "VM stopped" | "VM deallocated"; subnetId: string | null; nsgId: string | null; osType: "Linux" | "Windows"; patchStatus: { missingCritical: number; missingSecurity: number; lastAssessment: string }; monitoringEnabled: boolean; tags: Record<string, string> };
export type AzureActivityEvent = { timestamp: string; operation: string; caller: string; resourceId: string; status: "Succeeded" | "Failed"; detail?: string };
export type AzureFinding = { id: string; severity: "Low" | "Medium" | "High" | "Critical"; resourceId: string; title: string; description: string };

export type AzureSimulatorState = {
  kind: "azure";
  schemaVersion: 1;
  labNumber: number;
  tenantId: string;
  subscriptionId: string;
  subscriptionName: string;
  location: string;
  revision: number;
  counters: Record<string, number>;
  principal: { id: string; userPrincipalName: string; allowedActions: string[]; deniedActions: string[] };
  identities: { users: AzureIdentity[]; groups: AzureGroup[] };
  rbac: { assignments: AzureRoleAssignment[] };
  resources: { groups: AzureResourceGroup[]; vnets: AzureVnet[]; nsgs: AzureNsg[]; storageAccounts: AzureStorageAccount[]; vms: AzureVm[] };
  activity: AzureActivityEvent[];
  findings: AzureFinding[];
  resourceInventory: { provider: "AZURE"; type: string; id: string }[];
};

export type ParsedAzureCommand = { group: string; operation: string; options: Record<string, string | boolean>; positionals: string[] };
export type AzureExecutionResult = { output: unknown; mutated: boolean; action: string };
export type AzureCliResult = { exitCode: number; output: unknown; error?: { code: string; message: string } };
