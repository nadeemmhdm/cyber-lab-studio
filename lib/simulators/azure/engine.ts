import type {
  AzureCliResult,
  AzureExecutionResult,
  AzureFinding,
  AzureNsg,
  AzureRoleAssignment,
  AzureRoleName,
  AzureSimulatorState,
  ParsedAzureCommand,
} from "@/lib/simulators/azure/types";

export type AzureErrorCode = "AuthorizationFailed" | "ResourceNotFound" | "InvalidArgument" | "ResourceAlreadyExists" | "Conflict" | "UnsupportedOperation";

export class AzureSimulatorError extends Error {
  constructor(public readonly code: AzureErrorCode, message: string, public readonly operation = "unknown") {
    super(message);
    this.name = "AzureSimulatorError";
  }
  cliMessage() {
    return `(${this.code}) ${this.message}\nCode: ${this.code}`;
  }
}

const OPERATION_WORDS = new Set(["show", "list", "create", "delete", "update", "add", "remove", "start", "stop", "deallocate", "upload", "set-permission", "get-instance-view"]);

function tokenize(input: string) {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaping = false;
  for (const char of input.trim()) {
    if (escaping) { current += char; escaping = false; continue; }
    if (char === "\\" && quote !== "'") { escaping = true; continue; }
    if (quote) { if (char === quote) quote = null; else current += char; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (/\s/.test(char)) { if (current) { tokens.push(current); current = ""; } continue; }
    current += char;
  }
  if (escaping || quote) throw new AzureSimulatorError("InvalidArgument", "Unterminated escape or quoted value.", "parse");
  if (current) tokens.push(current);
  return tokens;
}

export function parseAzureCommand(input: string): ParsedAzureCommand {
  const tokens = tokenize(input);
  if (!tokens.length) throw new AzureSimulatorError("InvalidArgument", "Command is empty.", "parse");
  if (tokens[0] !== "az") throw new AzureSimulatorError("InvalidArgument", "Commands must start with `az`.", "parse");
  const opIndex = tokens.findIndex((token, index) => index > 1 && OPERATION_WORDS.has(token.toLowerCase()));
  if (opIndex < 0) throw new AzureSimulatorError("InvalidArgument", "Expected `az <group> <operation>`.", "parse");
  const group = tokens.slice(1, opIndex).map((x) => x.toLowerCase()).join(" ");
  const operation = tokens[opIndex].toLowerCase();
  const options: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  for (let i = opIndex + 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith("--")) { positionals.push(token); continue; }
    const key = token.slice(2);
    if (!key) throw new AzureSimulatorError("InvalidArgument", "Invalid empty option name.", operation);
    const next = tokens[i + 1];
    if (next && !next.startsWith("--")) { options[key] = next; i += 1; } else options[key] = true;
  }
  return { group, operation, options, positionals };
}

function option(command: ParsedAzureCommand, name: string, required = false) {
  const value = command.options[name];
  if (required && (typeof value !== "string" || !value)) throw new AzureSimulatorError("InvalidArgument", `Missing required argument --${name}.`, command.operation);
  return typeof value === "string" ? value : undefined;
}
function boolOption(command: ParsedAzureCommand, name: string) {
  const value = command.options[name];
  if (value === true) return true;
  if (typeof value !== "string") return undefined;
  if (["true", "yes", "1"].includes(value.toLowerCase())) return true;
  if (["false", "no", "0"].includes(value.toLowerCase())) return false;
  throw new AzureSimulatorError("InvalidArgument", `--${name} expects true or false.`, command.operation);
}
function numberOption(command: ParsedAzureCommand, name: string, required = false) {
  const raw = option(command, name, required);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new AzureSimulatorError("InvalidArgument", `--${name} must be numeric.`, command.operation);
  return value;
}

function globMatch(pattern: string, value: string) {
  if (pattern === "*") return true;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(value);
}
export function isAzureActionAllowed(state: AzureSimulatorState, action: string) {
  if (state.principal.deniedActions.some((p) => globMatch(p, action))) return false;
  return state.principal.allowedActions.some((p) => globMatch(p, action));
}
function requirePermission(state: AzureSimulatorState, action: string, operation: string) {
  if (!isAzureActionAllowed(state, action)) throw new AzureSimulatorError("AuthorizationFailed", `The client '${state.principal.userPrincipalName}' does not have authorization to perform action '${action}'.`, operation);
}
function id(state: AzureSimulatorState, counter: string, prefix: string) {
  const next = state.counters[counter] ?? 1;
  state.counters[counter] = next + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
function now() { return new Date().toISOString(); }
function scope(state: AzureSimulatorState, resourceGroup?: string) {
  return resourceGroup ? `/subscriptions/${state.subscriptionId}/resourceGroups/${resourceGroup}` : `/subscriptions/${state.subscriptionId}`;
}
function resourceId(state: AzureSimulatorState, rg: string, provider: string, type: string, name: string) {
  return `${scope(state, rg)}/providers/${provider}/${type}/${name}`;
}
function getGroup(state: AzureSimulatorState, name: string, operation: string) {
  const group = state.resources.groups.find((x) => x.name === name);
  if (!group) throw new AzureSimulatorError("ResourceNotFound", `Resource group '${name}' could not be found.`, operation);
  return group;
}
function getNsg(state: AzureSimulatorState, rg: string, name: string, operation: string) {
  const nsg = state.resources.nsgs.find((x) => x.resourceGroup === rg && x.name === name);
  if (!nsg) throw new AzureSimulatorError("ResourceNotFound", `Network security group '${name}' was not found.`, operation);
  return nsg;
}
function getVnet(state: AzureSimulatorState, rg: string, name: string, operation: string) {
  const vnet = state.resources.vnets.find((x) => x.resourceGroup === rg && x.name === name);
  if (!vnet) throw new AzureSimulatorError("ResourceNotFound", `Virtual network '${name}' was not found.`, operation);
  return vnet;
}
function getStorage(state: AzureSimulatorState, name: string, operation: string) {
  const account = state.resources.storageAccounts.find((x) => x.name === name);
  if (!account) throw new AzureSimulatorError("ResourceNotFound", `Storage account '${name}' was not found.`, operation);
  return account;
}
function getVm(state: AzureSimulatorState, rg: string, name: string, operation: string) {
  const vm = state.resources.vms.find((x) => x.resourceGroup === rg && x.name === name);
  if (!vm) throw new AzureSimulatorError("ResourceNotFound", `Virtual machine '${name}' was not found.`, operation);
  return vm;
}

function addActivity(state: AzureSimulatorState, operation: string, resourceIdValue: string, status: "Succeeded" | "Failed", detail?: string) {
  state.activity.push({ timestamp: now(), operation, caller: state.principal.userPrincipalName, resourceId: resourceIdValue, status, detail });
  if (state.activity.length > 200) state.activity.splice(0, state.activity.length - 200);
}

export function refreshAzureDerivedState(state: AzureSimulatorState) {
  const inventory: AzureSimulatorState["resourceInventory"] = [];
  for (const rg of state.resources.groups) inventory.push({ provider: "AZURE", type: "resource-group", id: rg.id });
  for (const vnet of state.resources.vnets) { inventory.push({ provider: "AZURE", type: "vnet", id: vnet.id }); for (const subnet of vnet.subnets) inventory.push({ provider: "AZURE", type: "subnet", id: subnet.id }); }
  for (const nsg of state.resources.nsgs) inventory.push({ provider: "AZURE", type: "nsg", id: nsg.id });
  for (const account of state.resources.storageAccounts) inventory.push({ provider: "AZURE", type: "storage-account", id: account.id });
  for (const vm of state.resources.vms) inventory.push({ provider: "AZURE", type: "virtual-machine", id: vm.id });
  state.resourceInventory = inventory;

  const findings: AzureFinding[] = [];
  for (const nsg of state.resources.nsgs) {
    for (const rule of nsg.rules) {
      if (rule.direction === "Inbound" && rule.access === "Allow" && ["*", "0.0.0.0/0", "Internet"].includes(rule.source) && ["22", "3389", "*"].includes(rule.destinationPort)) {
        findings.push({ id: `AZ-NSG-${nsg.name}-${rule.name}`, severity: rule.destinationPort === "*" ? "Critical" : "High", resourceId: nsg.id, title: "Internet-exposed management port", description: `${rule.name} allows ${rule.source} to ${rule.destinationPort}.` });
      }
    }
  }
  for (const account of state.resources.storageAccounts) {
    if (account.allowBlobPublicAccess || account.containers.some((c) => c.publicAccess !== "off")) findings.push({ id: `AZ-STG-PUBLIC-${account.name}`, severity: "High", resourceId: account.id, title: "Public blob access enabled", description: "Disable account-level public blob access and container anonymous access." });
    if (account.minimumTlsVersion !== "TLS1_2") findings.push({ id: `AZ-STG-TLS-${account.name}`, severity: "Medium", resourceId: account.id, title: "Weak minimum TLS version", description: `Minimum TLS is ${account.minimumTlsVersion}; use TLS1_2.` });
    if (!account.httpsOnly) findings.push({ id: `AZ-STG-HTTPS-${account.name}`, severity: "High", resourceId: account.id, title: "Secure transfer not required", description: "Require HTTPS-only storage access." });
  }
  for (const vm of state.resources.vms) {
    if (vm.patchStatus.missingCritical > 0 || vm.patchStatus.missingSecurity > 0) findings.push({ id: `AZ-VM-PATCH-${vm.name}`, severity: vm.patchStatus.missingCritical > 0 ? "High" : "Medium", resourceId: vm.id, title: "VM security updates missing", description: `${vm.patchStatus.missingCritical} critical and ${vm.patchStatus.missingSecurity} security updates are missing.` });
    if (!vm.monitoringEnabled) findings.push({ id: `AZ-VM-MON-${vm.name}`, severity: "Medium", resourceId: vm.id, title: "VM monitoring disabled", description: "Enable monitoring to collect security telemetry." });
  }
  state.findings = findings;
  return state;
}

export function createInitialAzureState(labNumber: number): AzureSimulatorState {
  const subscriptionId = "11111111-2222-3333-4444-555555555555";
  const tenantId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const rgId = `/subscriptions/${subscriptionId}/resourceGroups/cyberlab-rg`;
  const nsgId = `${rgId}/providers/Microsoft.Network/networkSecurityGroups/web-nsg`;
  const vnetId = `${rgId}/providers/Microsoft.Network/virtualNetworks/cyberlab-vnet`;
  const subnetId = `${vnetId}/subnets/default`;
  const storageId = `${rgId}/providers/Microsoft.Storage/storageAccounts/cyberlabstore`;
  const vmId = `${rgId}/providers/Microsoft.Compute/virtualMachines/web-vm`;
  const state: AzureSimulatorState = {
    kind: "azure", schemaVersion: 1, labNumber, tenantId, subscriptionId, subscriptionName: "CyberLab Training", location: "centralindia", revision: 0,
    counters: { user: 2, group: 2, role: 2, nsg: 2, vnet: 2, storage: 2, vm: 2 },
    principal: { id: "usr-0001", userPrincipalName: "student@cyberlab.local", allowedActions: ["Microsoft.*", "Directory.*"], deniedActions: [] },
    identities: {
      users: [{ id: "usr-0001", userPrincipalName: "student@cyberlab.local", displayName: "CyberLab Student", accountEnabled: true, groups: ["Security Learners"] }],
      groups: [{ id: "grp-0001", displayName: "Security Learners", members: ["usr-0001"] }],
    },
    rbac: { assignments: [{ id: "ra-0001", principalId: "usr-0001", role: "Owner", scope: `/subscriptions/${subscriptionId}` }] },
    resources: {
      groups: [{ id: rgId, name: "cyberlab-rg", location: "centralindia", tags: { environment: "training" } }],
      nsgs: [{ id: nsgId, name: "web-nsg", resourceGroup: "cyberlab-rg", location: "centralindia", rules: [
        { name: "AllowSSHInternet", priority: 100, direction: "Inbound", access: "Allow", protocol: "Tcp", source: "0.0.0.0/0", destination: "*", destinationPort: "22" },
        { name: "AllowHttps", priority: 120, direction: "Inbound", access: "Allow", protocol: "Tcp", source: "Internet", destination: "*", destinationPort: "443" },
      ] }],
      vnets: [{ id: vnetId, name: "cyberlab-vnet", resourceGroup: "cyberlab-rg", location: "centralindia", addressPrefixes: ["10.20.0.0/16"], subnets: [{ id: subnetId, name: "default", addressPrefix: "10.20.1.0/24", nsgId }] }],
      storageAccounts: [{ id: storageId, name: "cyberlabstore", resourceGroup: "cyberlab-rg", location: "centralindia", sku: "Standard_LRS", httpsOnly: false, minimumTlsVersion: "TLS1_0", allowBlobPublicAccess: true, encryptionServices: ["blob", "file"], containers: [{ name: "evidence", publicAccess: "blob", blobs: [{ name: "readme.txt", content: "Synthetic CyberLab evidence", lastModified: "2026-01-01T00:00:00.000Z" }] }] }],
      vms: [{ id: vmId, name: "web-vm", resourceGroup: "cyberlab-rg", location: "centralindia", size: "Standard_B2s", powerState: "VM running", subnetId, nsgId, osType: "Linux", patchStatus: { missingCritical: 2, missingSecurity: 4, lastAssessment: "2026-01-01T00:00:00.000Z" }, monitoringEnabled: false, tags: { role: "web" } }],
    },
    activity: [], findings: [], resourceInventory: [],
  };
  return refreshAzureDerivedState(state);
}

const ROLE_NAMES: AzureRoleName[] = ["Owner", "Contributor", "Reader", "User Access Administrator", "Storage Blob Data Contributor"];
function roleName(raw: string, operation: string): AzureRoleName {
  const role = ROLE_NAMES.find((x) => x.toLowerCase() === raw.toLowerCase());
  if (!role) throw new AzureSimulatorError("InvalidArgument", `Unsupported role '${raw}'.`, operation);
  return role;
}

type Handler = { action: string; mutates: boolean; run: (state: AzureSimulatorState, command: ParsedAzureCommand) => unknown };

const registry: Record<string, Handler> = {
  "account.show": { action: "Microsoft.Subscription/read", mutates: false, run: (s) => ({ environmentName: "AzureCloud", id: s.subscriptionId, name: s.subscriptionName, state: "Enabled", tenantId: s.tenantId, user: { name: s.principal.userPrincipalName, type: "user" } }) },
  "account.list": { action: "Microsoft.Subscription/read", mutates: false, run: (s) => [{ id: s.subscriptionId, name: s.subscriptionName, state: "Enabled", tenantId: s.tenantId, isDefault: true }] },

  "group.list": { action: "Microsoft.Resources/subscriptions/resourceGroups/read", mutates: false, run: (s) => s.resources.groups },
  "group.show": { action: "Microsoft.Resources/subscriptions/resourceGroups/read", mutates: false, run: (s, c) => getGroup(s, option(c, "name", true)!, "group show") },
  "group.create": { action: "Microsoft.Resources/subscriptions/resourceGroups/write", mutates: true, run: (s, c) => { const name = option(c, "name", true)!; if (s.resources.groups.some((x) => x.name === name)) throw new AzureSimulatorError("ResourceAlreadyExists", `Resource group '${name}' already exists.`, "group create"); const location = option(c, "location") ?? s.location; const value = { id: scope(s, name), name, location, tags: {} as Record<string, string> }; s.resources.groups.push(value); return value; } },
  "group.delete": { action: "Microsoft.Resources/subscriptions/resourceGroups/delete", mutates: true, run: (s, c) => { const name = option(c, "name", true)!; getGroup(s, name, "group delete"); const dependent = [...s.resources.vnets, ...s.resources.nsgs, ...s.resources.storageAccounts, ...s.resources.vms].some((x) => x.resourceGroup === name); if (dependent) throw new AzureSimulatorError("Conflict", `Resource group '${name}' contains resources. Delete them first in this simulator.`, "group delete"); s.resources.groups = s.resources.groups.filter((x) => x.name !== name); return {}; } },

  "resource.list": { action: "Microsoft.Resources/resources/read", mutates: false, run: (s, c) => { const rg = option(c, "resource-group"); const all = [...s.resources.vnets.map((x) => ({ id: x.id, name: x.name, type: "Microsoft.Network/virtualNetworks", resourceGroup: x.resourceGroup, location: x.location })), ...s.resources.nsgs.map((x) => ({ id: x.id, name: x.name, type: "Microsoft.Network/networkSecurityGroups", resourceGroup: x.resourceGroup, location: x.location })), ...s.resources.storageAccounts.map((x) => ({ id: x.id, name: x.name, type: "Microsoft.Storage/storageAccounts", resourceGroup: x.resourceGroup, location: x.location })), ...s.resources.vms.map((x) => ({ id: x.id, name: x.name, type: "Microsoft.Compute/virtualMachines", resourceGroup: x.resourceGroup, location: x.location }))]; return rg ? all.filter((x) => x.resourceGroup === rg) : all; } },
  "resource.show": { action: "Microsoft.Resources/resources/read", mutates: false, run: (s, c) => { const target = option(c, "ids") ?? option(c, "id", true)!; const list = [...s.resources.vnets, ...s.resources.nsgs, ...s.resources.storageAccounts, ...s.resources.vms]; const found = list.find((x) => x.id === target); if (!found) throw new AzureSimulatorError("ResourceNotFound", `Resource '${target}' was not found.`, "resource show"); return found; } },

  "ad user.list": { action: "Directory.Users/read", mutates: false, run: (s) => s.identities.users },
  "ad user.show": { action: "Directory.Users/read", mutates: false, run: (s, c) => { const target = option(c, "id", true)!; const user = s.identities.users.find((x) => x.id === target || x.userPrincipalName === target); if (!user) throw new AzureSimulatorError("ResourceNotFound", `User '${target}' was not found.`, "ad user show"); return user; } },
  "ad user.create": { action: "Directory.Users/write", mutates: true, run: (s, c) => { const upn = option(c, "user-principal-name", true)!; if (s.identities.users.some((x) => x.userPrincipalName === upn)) throw new AzureSimulatorError("ResourceAlreadyExists", `User '${upn}' already exists.`, "ad user create"); const user = { id: id(s, "user", "usr-"), userPrincipalName: upn, displayName: option(c, "display-name") ?? upn.split("@")[0], accountEnabled: true, groups: [] as string[] }; s.identities.users.push(user); return user; } },
  "ad user.update": { action: "Directory.Users/write", mutates: true, run: (s, c) => { const target = option(c, "id", true)!; const user = s.identities.users.find((x) => x.id === target || x.userPrincipalName === target); if (!user) throw new AzureSimulatorError("ResourceNotFound", `User '${target}' was not found.`, "ad user update"); const enabled = boolOption(c, "account-enabled"); if (enabled !== undefined) user.accountEnabled = enabled; const display = option(c, "display-name"); if (display) user.displayName = display; return user; } },
  "ad group.list": { action: "Directory.Groups/read", mutates: false, run: (s) => s.identities.groups },
  "ad group.create": { action: "Directory.Groups/write", mutates: true, run: (s, c) => { const name = option(c, "display-name", true)!; if (s.identities.groups.some((x) => x.displayName === name)) throw new AzureSimulatorError("ResourceAlreadyExists", `Group '${name}' already exists.`, "ad group create"); const group = { id: id(s, "group", "grp-"), displayName: name, members: [] as string[] }; s.identities.groups.push(group); return group; } },
  "ad group member.add": { action: "Directory.Groups/write", mutates: true, run: (s, c) => { const groupId = option(c, "group", true)!; const memberId = option(c, "member-id", true)!; const group = s.identities.groups.find((x) => x.id === groupId || x.displayName === groupId); const user = s.identities.users.find((x) => x.id === memberId || x.userPrincipalName === memberId); if (!group || !user) throw new AzureSimulatorError("ResourceNotFound", "Group or member was not found.", "ad group member add"); if (!group.members.includes(user.id)) group.members.push(user.id); if (!user.groups.includes(group.displayName)) user.groups.push(group.displayName); return {}; } },

  "role assignment.list": { action: "Microsoft.Authorization/roleAssignments/read", mutates: false, run: (s, c) => { const principal = option(c, "assignee"); const targetScope = option(c, "scope"); return s.rbac.assignments.filter((x) => (!principal || x.principalId === principal || s.identities.users.find((u) => u.id === x.principalId)?.userPrincipalName === principal) && (!targetScope || x.scope === targetScope)); } },
  "role assignment.create": { action: "Microsoft.Authorization/roleAssignments/write", mutates: true, run: (s, c) => { const assignee = option(c, "assignee", true)!; const user = s.identities.users.find((x) => x.id === assignee || x.userPrincipalName === assignee); if (!user) throw new AzureSimulatorError("ResourceNotFound", `Principal '${assignee}' was not found.`, "role assignment create"); const role = roleName(option(c, "role", true)!, "role assignment create"); const targetScope = option(c, "scope") ?? scope(s); if (s.rbac.assignments.some((x) => x.principalId === user.id && x.role === role && x.scope === targetScope)) throw new AzureSimulatorError("ResourceAlreadyExists", "The role assignment already exists.", "role assignment create"); const assignment: AzureRoleAssignment = { id: id(s, "role", "ra-"), principalId: user.id, role, scope: targetScope }; s.rbac.assignments.push(assignment); return assignment; } },
  "role assignment.delete": { action: "Microsoft.Authorization/roleAssignments/delete", mutates: true, run: (s, c) => { const assignee = option(c, "assignee", true)!; const role = roleName(option(c, "role", true)!, "role assignment delete"); const user = s.identities.users.find((x) => x.id === assignee || x.userPrincipalName === assignee); if (!user) throw new AzureSimulatorError("ResourceNotFound", `Principal '${assignee}' was not found.`, "role assignment delete"); const before = s.rbac.assignments.length; s.rbac.assignments = s.rbac.assignments.filter((x) => !(x.principalId === user.id && x.role === role)); if (before === s.rbac.assignments.length) throw new AzureSimulatorError("ResourceNotFound", "Matching role assignment was not found.", "role assignment delete"); return {}; } },

  "network vnet.list": { action: "Microsoft.Network/virtualNetworks/read", mutates: false, run: (s, c) => { const rg = option(c, "resource-group"); return rg ? s.resources.vnets.filter((x) => x.resourceGroup === rg) : s.resources.vnets; } },
  "network vnet.show": { action: "Microsoft.Network/virtualNetworks/read", mutates: false, run: (s, c) => getVnet(s, option(c, "resource-group", true)!, option(c, "name", true)!, "network vnet show") },
  "network vnet.create": { action: "Microsoft.Network/virtualNetworks/write", mutates: true, run: (s, c) => { const rg = option(c, "resource-group", true)!; getGroup(s, rg, "network vnet create"); const name = option(c, "name", true)!; if (s.resources.vnets.some((x) => x.resourceGroup === rg && x.name === name)) throw new AzureSimulatorError("ResourceAlreadyExists", `VNet '${name}' already exists.`, "network vnet create"); const prefix = option(c, "address-prefixes") ?? "10.0.0.0/16"; const vnet = { id: resourceId(s, rg, "Microsoft.Network", "virtualNetworks", name), name, resourceGroup: rg, location: option(c, "location") ?? s.location, addressPrefixes: prefix.split(","), subnets: [] as { id: string; name: string; addressPrefix: string; nsgId: string | null }[] }; s.resources.vnets.push(vnet); return vnet; } },
  "network vnet subnet.create": { action: "Microsoft.Network/virtualNetworks/subnets/write", mutates: true, run: (s, c) => { const rg = option(c, "resource-group", true)!; const vnet = getVnet(s, rg, option(c, "vnet-name", true)!, "network vnet subnet create"); const name = option(c, "name", true)!; if (vnet.subnets.some((x) => x.name === name)) throw new AzureSimulatorError("ResourceAlreadyExists", `Subnet '${name}' already exists.`, "network vnet subnet create"); const nsgName = option(c, "network-security-group"); const nsg = nsgName ? getNsg(s, rg, nsgName, "network vnet subnet create") : null; const subnet = { id: `${vnet.id}/subnets/${name}`, name, addressPrefix: option(c, "address-prefixes") ?? option(c, "address-prefix") ?? "10.0.1.0/24", nsgId: nsg?.id ?? null }; vnet.subnets.push(subnet); return subnet; } },
  "network vnet subnet.update": { action: "Microsoft.Network/virtualNetworks/subnets/write", mutates: true, run: (s, c) => { const rg = option(c, "resource-group", true)!; const vnet = getVnet(s, rg, option(c, "vnet-name", true)!, "network vnet subnet update"); const subnet = vnet.subnets.find((x) => x.name === option(c, "name", true)!); if (!subnet) throw new AzureSimulatorError("ResourceNotFound", "Subnet was not found.", "network vnet subnet update"); const nsgName = option(c, "network-security-group"); if (nsgName) subnet.nsgId = getNsg(s, rg, nsgName, "network vnet subnet update").id; return subnet; } },
  "network nsg.list": { action: "Microsoft.Network/networkSecurityGroups/read", mutates: false, run: (s, c) => { const rg = option(c, "resource-group"); return rg ? s.resources.nsgs.filter((x) => x.resourceGroup === rg) : s.resources.nsgs; } },
  "network nsg.show": { action: "Microsoft.Network/networkSecurityGroups/read", mutates: false, run: (s, c) => getNsg(s, option(c, "resource-group", true)!, option(c, "name", true)!, "network nsg show") },
  "network nsg.create": { action: "Microsoft.Network/networkSecurityGroups/write", mutates: true, run: (s, c) => { const rg = option(c, "resource-group", true)!; getGroup(s, rg, "network nsg create"); const name = option(c, "name", true)!; if (s.resources.nsgs.some((x) => x.resourceGroup === rg && x.name === name)) throw new AzureSimulatorError("ResourceAlreadyExists", `NSG '${name}' already exists.`, "network nsg create"); const nsg: AzureNsg = { id: resourceId(s, rg, "Microsoft.Network", "networkSecurityGroups", name), name, resourceGroup: rg, location: option(c, "location") ?? s.location, rules: [] }; s.resources.nsgs.push(nsg); return nsg; } },
  "network nsg rule.list": { action: "Microsoft.Network/networkSecurityGroups/securityRules/read", mutates: false, run: (s, c) => getNsg(s, option(c, "resource-group", true)!, option(c, "nsg-name", true)!, "network nsg rule list").rules },
  "network nsg rule.create": { action: "Microsoft.Network/networkSecurityGroups/securityRules/write", mutates: true, run: (s, c) => { const nsg = getNsg(s, option(c, "resource-group", true)!, option(c, "nsg-name", true)!, "network nsg rule create"); const name = option(c, "name", true)!; if (nsg.rules.some((x) => x.name === name)) throw new AzureSimulatorError("ResourceAlreadyExists", `NSG rule '${name}' already exists.`, "network nsg rule create"); const priority = numberOption(c, "priority", true)!; if (nsg.rules.some((x) => x.priority === priority)) throw new AzureSimulatorError("Conflict", `Priority ${priority} is already in use.`, "network nsg rule create"); const access = (option(c, "access") ?? "Allow") as "Allow" | "Deny"; const direction = (option(c, "direction") ?? "Inbound") as "Inbound" | "Outbound"; if (!["Allow", "Deny"].includes(access) || !["Inbound", "Outbound"].includes(direction)) throw new AzureSimulatorError("InvalidArgument", "Invalid access or direction.", "network nsg rule create"); const rule = { name, priority, direction, access, protocol: (option(c, "protocol") ?? "Tcp") as "Tcp" | "Udp" | "*", source: option(c, "source-address-prefixes") ?? option(c, "source-address-prefix") ?? "*", destination: option(c, "destination-address-prefixes") ?? option(c, "destination-address-prefix") ?? "*", destinationPort: option(c, "destination-port-ranges") ?? option(c, "destination-port-range") ?? "*" }; nsg.rules.push(rule); return rule; } },
  "network nsg rule.delete": { action: "Microsoft.Network/networkSecurityGroups/securityRules/delete", mutates: true, run: (s, c) => { const nsg = getNsg(s, option(c, "resource-group", true)!, option(c, "nsg-name", true)!, "network nsg rule delete"); const name = option(c, "name", true)!; const before = nsg.rules.length; nsg.rules = nsg.rules.filter((x) => x.name !== name); if (before === nsg.rules.length) throw new AzureSimulatorError("ResourceNotFound", `Rule '${name}' was not found.`, "network nsg rule delete"); return {}; } },

  "storage account.list": { action: "Microsoft.Storage/storageAccounts/read", mutates: false, run: (s, c) => { const rg = option(c, "resource-group"); return rg ? s.resources.storageAccounts.filter((x) => x.resourceGroup === rg) : s.resources.storageAccounts; } },
  "storage account.show": { action: "Microsoft.Storage/storageAccounts/read", mutates: false, run: (s, c) => getStorage(s, option(c, "name", true)!, "storage account show") },
  "storage account.create": { action: "Microsoft.Storage/storageAccounts/write", mutates: true, run: (s, c) => { const rg = option(c, "resource-group", true)!; getGroup(s, rg, "storage account create"); const name = option(c, "name", true)!; if (!/^[a-z0-9]{3,24}$/.test(name)) throw new AzureSimulatorError("InvalidArgument", "Storage account names must be 3-24 lowercase letters or numbers.", "storage account create"); if (s.resources.storageAccounts.some((x) => x.name === name)) throw new AzureSimulatorError("ResourceAlreadyExists", `Storage account '${name}' already exists.`, "storage account create"); const account = { id: resourceId(s, rg, "Microsoft.Storage", "storageAccounts", name), name, resourceGroup: rg, location: option(c, "location") ?? s.location, sku: option(c, "sku") ?? "Standard_LRS", httpsOnly: boolOption(c, "https-only") ?? true, minimumTlsVersion: (option(c, "min-tls-version") ?? "TLS1_2") as "TLS1_0" | "TLS1_1" | "TLS1_2", allowBlobPublicAccess: boolOption(c, "allow-blob-public-access") ?? false, encryptionServices: ["blob", "file"], containers: [] as { name: string; publicAccess: "off" | "blob" | "container"; blobs: { name: string; content: string; lastModified: string }[] }[] }; s.resources.storageAccounts.push(account); return account; } },
  "storage account.update": { action: "Microsoft.Storage/storageAccounts/write", mutates: true, run: (s, c) => { const account = getStorage(s, option(c, "name", true)!, "storage account update"); const https = boolOption(c, "https-only"); if (https !== undefined) account.httpsOnly = https; const pub = boolOption(c, "allow-blob-public-access"); if (pub !== undefined) account.allowBlobPublicAccess = pub; const tls = option(c, "min-tls-version"); if (tls) { if (!["TLS1_0", "TLS1_1", "TLS1_2"].includes(tls)) throw new AzureSimulatorError("InvalidArgument", "Unsupported TLS version.", "storage account update"); account.minimumTlsVersion = tls as "TLS1_0" | "TLS1_1" | "TLS1_2"; } return account; } },
  "storage container.list": { action: "Microsoft.Storage/storageAccounts/blobServices/containers/read", mutates: false, run: (s, c) => getStorage(s, option(c, "account-name", true)!, "storage container list").containers },
  "storage container.create": { action: "Microsoft.Storage/storageAccounts/blobServices/containers/write", mutates: true, run: (s, c) => { const account = getStorage(s, option(c, "account-name", true)!, "storage container create"); const name = option(c, "name", true)!; if (account.containers.some((x) => x.name === name)) throw new AzureSimulatorError("ResourceAlreadyExists", `Container '${name}' already exists.`, "storage container create"); const container = { name, publicAccess: "off" as const, blobs: [] as { name: string; content: string; lastModified: string }[] }; account.containers.push(container); return container; } },
  "storage container.set-permission": { action: "Microsoft.Storage/storageAccounts/blobServices/containers/write", mutates: true, run: (s, c) => { const account = getStorage(s, option(c, "account-name", true)!, "storage container set-permission"); const container = account.containers.find((x) => x.name === option(c, "name", true)!); if (!container) throw new AzureSimulatorError("ResourceNotFound", "Container was not found.", "storage container set-permission"); const level = option(c, "public-access") ?? "off"; if (!["off", "blob", "container"].includes(level)) throw new AzureSimulatorError("InvalidArgument", "Public access must be off, blob, or container.", "storage container set-permission"); if (level !== "off" && !account.allowBlobPublicAccess) throw new AzureSimulatorError("Conflict", "Account-level public blob access is disabled.", "storage container set-permission"); container.publicAccess = level as "off" | "blob" | "container"; return container; } },
  "storage blob.list": { action: "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read", mutates: false, run: (s, c) => { const account = getStorage(s, option(c, "account-name", true)!, "storage blob list"); const container = account.containers.find((x) => x.name === option(c, "container-name", true)!); if (!container) throw new AzureSimulatorError("ResourceNotFound", "Container was not found.", "storage blob list"); return container.blobs; } },
  "storage blob.upload": { action: "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write", mutates: true, run: (s, c) => { const account = getStorage(s, option(c, "account-name", true)!, "storage blob upload"); const container = account.containers.find((x) => x.name === option(c, "container-name", true)!); if (!container) throw new AzureSimulatorError("ResourceNotFound", "Container was not found.", "storage blob upload"); const name = option(c, "name", true)!; const content = option(c, "data") ?? option(c, "content") ?? "simulated-upload"; const existing = container.blobs.find((x) => x.name === name); if (existing) { existing.content = content; existing.lastModified = now(); return existing; } const blob = { name, content, lastModified: now() }; container.blobs.push(blob); return blob; } },
  "storage blob.delete": { action: "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete", mutates: true, run: (s, c) => { const account = getStorage(s, option(c, "account-name", true)!, "storage blob delete"); const container = account.containers.find((x) => x.name === option(c, "container-name", true)!); if (!container) throw new AzureSimulatorError("ResourceNotFound", "Container was not found.", "storage blob delete"); const name = option(c, "name", true)!; const before = container.blobs.length; container.blobs = container.blobs.filter((x) => x.name !== name); if (before === container.blobs.length) throw new AzureSimulatorError("ResourceNotFound", `Blob '${name}' was not found.`, "storage blob delete"); return {}; } },

  "vm.list": { action: "Microsoft.Compute/virtualMachines/read", mutates: false, run: (s, c) => { const rg = option(c, "resource-group"); return rg ? s.resources.vms.filter((x) => x.resourceGroup === rg) : s.resources.vms; } },
  "vm.show": { action: "Microsoft.Compute/virtualMachines/read", mutates: false, run: (s, c) => getVm(s, option(c, "resource-group", true)!, option(c, "name", true)!, "vm show") },
  "vm.get-instance-view": { action: "Microsoft.Compute/virtualMachines/instanceView/read", mutates: false, run: (s, c) => { const vm = getVm(s, option(c, "resource-group", true)!, option(c, "name", true)!, "vm get-instance-view"); return { name: vm.name, statuses: [{ code: `PowerState/${vm.powerState.replace("VM ", "")}`, displayStatus: vm.powerState }], patchStatus: vm.patchStatus, monitoringEnabled: vm.monitoringEnabled }; } },
  "vm.create": { action: "Microsoft.Compute/virtualMachines/write", mutates: true, run: (s, c) => { const rg = option(c, "resource-group", true)!; getGroup(s, rg, "vm create"); const name = option(c, "name", true)!; if (s.resources.vms.some((x) => x.resourceGroup === rg && x.name === name)) throw new AzureSimulatorError("ResourceAlreadyExists", `VM '${name}' already exists.`, "vm create"); const subnetId = option(c, "subnet") ?? null; const nsgName = option(c, "nsg"); const nsgId = nsgName ? getNsg(s, rg, nsgName, "vm create").id : null; const vm = { id: resourceId(s, rg, "Microsoft.Compute", "virtualMachines", name), name, resourceGroup: rg, location: option(c, "location") ?? s.location, size: option(c, "size") ?? "Standard_B1s", powerState: "VM running" as const, subnetId, nsgId, osType: ((option(c, "os-type") ?? "Linux") === "Windows" ? "Windows" : "Linux") as "Linux" | "Windows", patchStatus: { missingCritical: 0, missingSecurity: 0, lastAssessment: now() }, monitoringEnabled: false, tags: {} as Record<string, string> }; s.resources.vms.push(vm); return vm; } },
  "vm.start": { action: "Microsoft.Compute/virtualMachines/start/action", mutates: true, run: (s, c) => { const vm = getVm(s, option(c, "resource-group", true)!, option(c, "name", true)!, "vm start"); vm.powerState = "VM running"; return {}; } },
  "vm.stop": { action: "Microsoft.Compute/virtualMachines/powerOff/action", mutates: true, run: (s, c) => { const vm = getVm(s, option(c, "resource-group", true)!, option(c, "name", true)!, "vm stop"); vm.powerState = "VM stopped"; return {}; } },
  "vm.deallocate": { action: "Microsoft.Compute/virtualMachines/deallocate/action", mutates: true, run: (s, c) => { const vm = getVm(s, option(c, "resource-group", true)!, option(c, "name", true)!, "vm deallocate"); vm.powerState = "VM deallocated"; return {}; } },
  "vm.update": { action: "Microsoft.Compute/virtualMachines/write", mutates: true, run: (s, c) => { const vm = getVm(s, option(c, "resource-group", true)!, option(c, "name", true)!, "vm update"); const monitoring = boolOption(c, "monitoring-enabled"); if (monitoring !== undefined) vm.monitoringEnabled = monitoring; const missingCritical = numberOption(c, "missing-critical"); if (missingCritical !== undefined) vm.patchStatus.missingCritical = Math.max(0, missingCritical); const missingSecurity = numberOption(c, "missing-security"); if (missingSecurity !== undefined) vm.patchStatus.missingSecurity = Math.max(0, missingSecurity); vm.patchStatus.lastAssessment = now(); return vm; } },

  "monitor activity-log.list": { action: "Microsoft.Insights/eventtypes/values/read", mutates: false, run: (s, c) => { const status = option(c, "status"); const max = numberOption(c, "max-events") ?? 50; const filtered = status ? s.activity.filter((x) => x.status.toLowerCase() === status.toLowerCase()) : s.activity; return filtered.slice(-Math.max(1, Math.min(max, 200))).reverse(); } },
  "security finding.list": { action: "Microsoft.Security/assessments/read", mutates: false, run: (s) => s.findings },
};

export const AZURE_SUPPORTED_COMMANDS = Object.keys(registry).sort();

export function executeAzureCommand(state: AzureSimulatorState, input: string): AzureExecutionResult {
  const command = parseAzureCommand(input);
  const key = `${command.group}.${command.operation}`;
  const handler = registry[key];
  if (!handler) throw new AzureSimulatorError("UnsupportedOperation", `Command '${key}' is not implemented by the CyberLab Azure simulator.`, key);
  try {
    requirePermission(state, handler.action, key);
    const output = handler.run(state, command);
    if (handler.mutates) { state.revision += 1; refreshAzureDerivedState(state); }
    addActivity(state, handler.action, option(command, "ids") ?? option(command, "name") ?? scope(state), "Succeeded");
    return { output, mutated: handler.mutates, action: handler.action };
  } catch (error) {
    if (error instanceof AzureSimulatorError) {
      addActivity(state, handler.action, option(command, "ids") ?? option(command, "name") ?? scope(state), "Failed", error.code);
      throw error;
    }
    throw error;
  }
}

export const AZURE_COMPATIBILITY = AZURE_SUPPORTED_COMMANDS.map((command) => ({ command: `az ${command.replace(".", " ")}`, status: "Supported" as const }));
export type { AzureCliResult };
