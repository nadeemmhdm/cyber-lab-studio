import { executeKql } from "@/lib/kql/engine";
import type { KqlRow, KqlTables } from "@/lib/kql/types";
import type { DefenderAlert, DefenderIncident, IncidentStatus, SecurityEntity, SecurityPlatform, SecuritySeverity, SecuritySimulatorState, SecurityTimelineEvent, SentinelAlert, SentinelIncident } from "@/lib/simulators/security/types";

export class SecuritySimulatorError extends Error {
  constructor(public readonly code: "InvalidState" | "RuleNotFound" | "IncidentNotFound" | "ConnectorNotFound" | "InvalidOperation", message: string) {
    super(message);
    this.name = "SecuritySimulatorError";
  }
}

const BASE = "2026-01-15T10:";
const at = (minute: string) => `${BASE}${minute}:00.000Z`;

export function createSyntheticSecurityDatasets(): KqlTables {
  const SigninLogs: KqlRow[] = [
    { TimeGenerated: at("01"), EventId: "signin-001", UserPrincipalName: "alex@contoso.local", IPAddress: "203.0.113.77", ResultType: 50053, ResultDescription: "Account locked", RiskLevel: "high", DeviceName: "UNKNOWN", Location: "IN" },
    { TimeGenerated: at("03"), EventId: "signin-002", UserPrincipalName: "alex@contoso.local", IPAddress: "203.0.113.77", ResultType: 50126, ResultDescription: "Invalid username or password", RiskLevel: "high", DeviceName: "UNKNOWN", Location: "IN" },
    { TimeGenerated: at("05"), EventId: "signin-003", UserPrincipalName: "alex@contoso.local", IPAddress: "203.0.113.77", ResultType: 0, ResultDescription: "Success", RiskLevel: "high", DeviceName: "WEB-01", Location: "IN" },
    { TimeGenerated: at("06"), EventId: "signin-004", UserPrincipalName: "priya@contoso.local", IPAddress: "198.51.100.24", ResultType: 0, ResultDescription: "Success", RiskLevel: "low", DeviceName: "ADMIN-01", Location: "IN" },
  ];
  const DeviceProcessEvents: KqlRow[] = [
    { TimeGenerated: at("08"), EventId: "proc-001", DeviceName: "WEB-01", AccountName: "alex", FileName: "powershell.exe", ProcessCommandLine: "powershell.exe -NoP -W Hidden -enc SQBFAFgA", ParentProcessName: "winword.exe", SHA1: "1111111111111111111111111111111111111111", ActionType: "ProcessCreated" },
    { TimeGenerated: at("10"), EventId: "proc-002", DeviceName: "WEB-01", AccountName: "alex", FileName: "rundll32.exe", ProcessCommandLine: "rundll32.exe C:\\Temp\\cred.dll,DumpCreds lsass", ParentProcessName: "powershell.exe", SHA1: "2222222222222222222222222222222222222222", ActionType: "ProcessCreated" },
    { TimeGenerated: at("11"), EventId: "proc-003", DeviceName: "WEB-01", AccountName: "SYSTEM", FileName: "svchost.exe", ProcessCommandLine: "svchost.exe -k netsvcs", ParentProcessName: "services.exe", SHA1: "3333333333333333333333333333333333333333", ActionType: "ProcessCreated" },
    { TimeGenerated: at("16"), EventId: "proc-004", DeviceName: "DB-01", AccountName: "alex", FileName: "cmd.exe", ProcessCommandLine: "cmd.exe /c whoami /all", ParentProcessName: "wmiprvse.exe", SHA1: "4444444444444444444444444444444444444444", ActionType: "ProcessCreated" },
  ];
  const DeviceNetworkEvents: KqlRow[] = [
    { TimeGenerated: at("12"), EventId: "net-001", DeviceName: "WEB-01", AccountName: "alex", RemoteIP: "10.20.1.20", RemotePort: 445, LocalIP: "10.20.1.10", InitiatingProcessFileName: "powershell.exe", ActionType: "ConnectionSuccess", Direction: "Outbound" },
    { TimeGenerated: at("14"), EventId: "net-002", DeviceName: "WEB-01", AccountName: "alex", RemoteIP: "10.20.1.20", RemotePort: 5985, LocalIP: "10.20.1.10", InitiatingProcessFileName: "powershell.exe", ActionType: "ConnectionSuccess", Direction: "Outbound" },
    { TimeGenerated: at("18"), EventId: "net-003", DeviceName: "DB-01", AccountName: "svc-backup", RemoteIP: "10.20.1.30", RemotePort: 443, LocalIP: "10.20.1.20", InitiatingProcessFileName: "backup.exe", ActionType: "ConnectionSuccess", Direction: "Outbound" },
  ];
  const IdentityAuditEvents: KqlRow[] = [
    { TimeGenerated: at("19"), EventId: "id-001", Actor: "alex@contoso.local", TargetUser: "alex@contoso.local", Operation: "Add member to role", RoleName: "Global Administrator", Result: "Success", Severity: "High" },
    { TimeGenerated: at("22"), EventId: "id-002", Actor: "priya@contoso.local", TargetUser: "analyst@contoso.local", Operation: "Reset password", RoleName: "", Result: "Success", Severity: "Low" },
  ];
  const SecurityEvent: KqlRow[] = [
    { TimeGenerated: at("09"), EventId: "win-4688-001", Computer: "WEB-01", Account: "alex", EventID: 4688, Activity: "New Process", CommandLine: "powershell.exe -enc SQBFAFgA", Level: "Warning" },
    { TimeGenerated: at("15"), EventId: "win-4624-001", Computer: "DB-01", Account: "alex", EventID: 4624, Activity: "Successful logon", CommandLine: "", Level: "Information" },
  ];
  const CloudAuditEvents: KqlRow[] = [
    { TimeGenerated: at("23"), EventId: "cloud-001", Actor: "alex@contoso.local", Operation: "CreateRoleAssignment", Resource: "/subscriptions/training", Result: "Success", SourceIP: "203.0.113.77", Severity: "High" },
    { TimeGenerated: at("25"), EventId: "cloud-002", Actor: "priya@contoso.local", Operation: "ListResources", Resource: "/subscriptions/training/resourceGroups/prod", Result: "Success", SourceIP: "198.51.100.24", Severity: "Informational" },
  ];

  const UnifiedSecurityEvents: KqlRow[] = [
    ...SigninLogs.map((r) => ({ EventId: r.EventId, TimeGenerated: r.TimeGenerated, Product: "Entra ID", Category: "SignIn", AccountName: r.UserPrincipalName, DeviceName: r.DeviceName, IPAddress: r.IPAddress, Action: r.ResultType === 0 ? "SignInSuccess" : "SignInFailure", Severity: r.RiskLevel === "high" ? "High" : "Low", Details: r.ResultDescription })),
    ...DeviceProcessEvents.map((r) => ({ EventId: r.EventId, TimeGenerated: r.TimeGenerated, Product: "Defender for Endpoint", Category: "Process", AccountName: r.AccountName, DeviceName: r.DeviceName, IPAddress: "", Action: r.FileName, Severity: String(r.ProcessCommandLine).toLowerCase().includes("-enc") || String(r.ProcessCommandLine).toLowerCase().includes("lsass") ? "High" : "Informational", Details: r.ProcessCommandLine })),
    ...DeviceNetworkEvents.map((r) => ({ EventId: r.EventId, TimeGenerated: r.TimeGenerated, Product: "Defender for Endpoint", Category: "Network", AccountName: r.AccountName, DeviceName: r.DeviceName, IPAddress: r.RemoteIP, Action: `Connect:${r.RemotePort}`, Severity: [445, 5985].includes(Number(r.RemotePort)) ? "Medium" : "Informational", Details: r.InitiatingProcessFileName })),
    ...IdentityAuditEvents.map((r) => ({ EventId: r.EventId, TimeGenerated: r.TimeGenerated, Product: "Defender for Identity", Category: "Identity", AccountName: r.TargetUser, DeviceName: "", IPAddress: "", Action: r.Operation, Severity: r.Severity, Details: r.RoleName })),
    ...CloudAuditEvents.map((r) => ({ EventId: r.EventId, TimeGenerated: r.TimeGenerated, Product: "Cloud Audit", Category: "Cloud", AccountName: r.Actor, DeviceName: "", IPAddress: r.SourceIP, Action: r.Operation, Severity: r.Severity, Details: r.Resource })),
  ].sort((a, b) => String(a.TimeGenerated).localeCompare(String(b.TimeGenerated)));

  return { SigninLogs, DeviceProcessEvents, DeviceNetworkEvents, IdentityAuditEvents, SecurityEvent, CloudAuditEvents, UnifiedSecurityEvents };
}

function uniqueEntities(rows: KqlRow[]): SecurityEntity[] {
  const entities = new Map<string, SecurityEntity>();
  for (const row of rows) {
    const pairs: [SecurityEntity["type"], unknown][] = [
      ["account", row.UserPrincipalName ?? row.AccountName ?? row.Actor ?? row.TargetUser],
      ["host", row.DeviceName ?? row.Computer],
      ["ip", row.IPAddress ?? row.RemoteIP ?? row.SourceIP],
      ["process", row.FileName ?? row.InitiatingProcessFileName],
    ];
    for (const [type, raw] of pairs) if (typeof raw === "string" && raw) entities.set(`${type}:${raw}`, { type, value: raw });
  }
  return [...entities.values()];
}

function timelineFromTables(tables: KqlTables): SecurityTimelineEvent[] {
  return tables.UnifiedSecurityEvents.map((row) => ({
    eventId: String(row.EventId), timeGenerated: String(row.TimeGenerated), product: String(row.Product), category: String(row.Category), title: `${row.Category}: ${row.Action}`,
    severity: String(row.Severity) as SecuritySeverity, entities: uniqueEntities([row]),
  }));
}

function createDefenderState(tables: KqlTables) {
  const riskySignins = tables.SigninLogs.filter((row) => row.RiskLevel === "high" && row.ResultType === 0);
  const suspiciousProcesses = tables.DeviceProcessEvents.filter((row) => String(row.ProcessCommandLine).toLowerCase().includes("-enc"));
  const credentialAccess = tables.DeviceProcessEvents.filter((row) => String(row.ProcessCommandLine).toLowerCase().includes("lsass") || String(row.ProcessCommandLine).toLowerCase().includes("cred"));
  const lateral = tables.DeviceNetworkEvents.filter((row) => [445, 5985].includes(Number(row.RemotePort)));
  const privilege = tables.IdentityAuditEvents.filter((row) => String(row.RoleName).toLowerCase().includes("administrator"));
  const now = at("30");
  const alerts: DefenderAlert[] = [];
  const add = (id: string, title: string, severity: SecuritySeverity, category: string, rows: KqlRow[]) => {
    if (!rows.length) return;
    const entities = uniqueEntities(rows);
    alerts.push({ id, title, severity, category, eventIds: rows.map((r) => String(r.EventId)), deviceIds: entities.filter((e) => e.type === "host").map((e) => e.value), identityIds: entities.filter((e) => e.type === "account").map((e) => e.value), createdAt: String(rows[0].TimeGenerated), status: "New" });
  };
  add("mda-001", "High-risk sign-in followed by successful authentication", "High", "CredentialAccess", riskySignins);
  add("mda-002", "Encoded PowerShell execution", "High", "Execution", suspiciousProcesses);
  add("mda-003", "Credential access behavior against LSASS", "Critical", "CredentialAccess", credentialAccess);
  add("mda-004", "Suspicious SMB/WinRM lateral movement", "High", "LateralMovement", lateral);
  add("mda-005", "Privileged role assignment by risky identity", "Critical", "PrivilegeEscalation", privilege);

  const devices = ["WEB-01", "DB-01", "ADMIN-01"].map((name, index) => ({ id: name, name, os: name === "ADMIN-01" ? "Windows 11" : "Windows Server 2022", riskLevel: (name === "WEB-01" || name === "DB-01" ? "High" : "Low") as "Low" | "Medium" | "High", exposureLevel: (name === "WEB-01" ? "High" : name === "DB-01" ? "Medium" : "Low") as "Low" | "Medium" | "High", lastSeen: at(String(20 + index).padStart(2, "0")) }));
  const identities = ["alex@contoso.local", "priya@contoso.local"].map((accountName) => ({ id: accountName, accountName, riskLevel: (accountName.startsWith("alex") ? "High" : "Low") as "Low" | "Medium" | "High", lastSeen: now }));
  const incident: DefenderIncident | null = alerts.length ? { id: "mdi-001", title: "Multi-stage identity and endpoint compromise", severity: "Critical", status: "New", alertIds: alerts.map((a) => a.id), deviceIds: [...new Set(alerts.flatMap((a) => a.deviceIds))], identityIds: [...new Set(alerts.flatMap((a) => a.identityIds))], notes: [], createdAt: alerts[0].createdAt, updatedAt: now } : null;
  return { devices, identities, alerts, incidents: incident ? [incident] : [] };
}

function resourceInventory(state: SecuritySimulatorState) {
  return [
    { provider: "SENTINEL" as const, type: "workspace", id: state.sentinel.workspace.id },
    ...state.sentinel.connectors.map((x) => ({ provider: "SENTINEL" as const, type: "connector", id: x.id })),
    ...state.sentinel.analyticsRules.map((x) => ({ provider: "SENTINEL" as const, type: "analytics-rule", id: x.id })),
    ...state.sentinel.alerts.map((x) => ({ provider: "SENTINEL" as const, type: "alert", id: x.id })),
    ...state.sentinel.incidents.map((x) => ({ provider: "SENTINEL" as const, type: "incident", id: x.id })),
    ...state.defender.devices.map((x) => ({ provider: "DEFENDER_XDR" as const, type: "device", id: x.id })),
    ...state.defender.alerts.map((x) => ({ provider: "DEFENDER_XDR" as const, type: "alert", id: x.id })),
    ...state.defender.incidents.map((x) => ({ provider: "DEFENDER_XDR" as const, type: "incident", id: x.id })),
  ];
}

export function createInitialSecurityState(labNumber: number, platform: SecurityPlatform): SecuritySimulatorState {
  const datasets = createSyntheticSecurityDatasets();
  const defender = createDefenderState(datasets);
  const state: SecuritySimulatorState = {
    kind: "security", schemaVersion: 1, labNumber, platform, revision: 0, datasets, timeline: timelineFromTables(datasets),
    sentinel: {
      workspace: { id: "law-cyberlab", name: "CyberLab-Sentinel", retentionDays: 30 },
      connectors: [
        { id: "connector-entra", name: "Microsoft Entra ID", table: "SigninLogs", enabled: true, lastIngestedAt: at("30") },
        { id: "connector-mde", name: "Microsoft Defender XDR", table: "DeviceProcessEvents", enabled: true, lastIngestedAt: at("30") },
        { id: "connector-security", name: "Windows Security Events", table: "SecurityEvent", enabled: true, lastIngestedAt: at("30") },
      ],
      analyticsRules: [
        { id: "rule-risky-signin", name: "Risky successful sign-in", severity: "High", query: 'SigninLogs | where RiskLevel == "high" and ResultType == 0 | project EventId, TimeGenerated, UserPrincipalName, IPAddress, DeviceName', enabled: true, lastRunAt: null },
        { id: "rule-encoded-powershell", name: "Encoded PowerShell", severity: "High", query: 'DeviceProcessEvents | where ProcessCommandLine contains "-enc" | project EventId, TimeGenerated, DeviceName, AccountName, FileName, ProcessCommandLine', enabled: true, lastRunAt: null },
        { id: "rule-privileged-role", name: "Privileged role assignment", severity: "Critical", query: 'IdentityAuditEvents | where RoleName contains "Administrator" | project EventId, TimeGenerated, Actor, TargetUser, Operation, RoleName', enabled: true, lastRunAt: null },
      ],
      alerts: [], incidents: [],
    },
    defender,
    resourceInventory: [],
  };
  state.resourceInventory = resourceInventory(state);
  return state;
}

function mergeEntities(left: SecurityEntity[], right: SecurityEntity[]) {
  const values = new Map(left.map((entity) => [`${entity.type}:${entity.value}`, entity]));
  for (const entity of right) values.set(`${entity.type}:${entity.value}`, entity);
  return [...values.values()];
}

export function runSentinelAnalytics(state: SecuritySimulatorState, ruleId?: string) {
  if (state.kind !== "security") throw new SecuritySimulatorError("InvalidState", "Not a security simulator state.");
  const rules = ruleId ? state.sentinel.analyticsRules.filter((rule) => rule.id === ruleId) : state.sentinel.analyticsRules.filter((rule) => rule.enabled);
  if (ruleId && !rules.length) throw new SecuritySimulatorError("RuleNotFound", `Analytics rule '${ruleId}' was not found.`);
  const created: { alert: SentinelAlert; incident: SentinelIncident }[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const result = executeKql(state.datasets, rule.query);
    rule.lastRunAt = at("31");
    if (!result.rows.length) continue;
    const eventIds = result.rows.map((row) => String(row.EventId)).filter(Boolean);
    const signature = `${rule.id}:${eventIds.join(",")}`;
    const existing = state.sentinel.alerts.find((alert) => `${alert.ruleId}:${alert.eventIds.join(",")}` === signature);
    if (existing) continue;
    const entities = uniqueEntities(result.rows);
    const alert: SentinelAlert = { id: `alert-${String(state.sentinel.alerts.length + 1).padStart(3, "0")}`, ruleId: rule.id, title: rule.name, severity: rule.severity, eventIds, entities, createdAt: String(result.rows[0].TimeGenerated ?? at("31")), status: "New" };
    state.sentinel.alerts.push(alert);
    const related = state.sentinel.incidents.find((incident) => incident.status !== "Resolved" && incident.entities.some((entity) => entities.some((candidate) => candidate.type === entity.type && candidate.value === entity.value)));
    let incident: SentinelIncident;
    if (related) {
      if (!related.alertIds.includes(alert.id)) related.alertIds.push(alert.id);
      related.entities = mergeEntities(related.entities, entities);
      if (alert.severity === "Critical") related.severity = "Critical";
      related.updatedAt = at("31");
      incident = related;
    } else {
      incident = { id: `incident-${String(state.sentinel.incidents.length + 1).padStart(3, "0")}`, title: rule.name, severity: rule.severity, status: "New", alertIds: [alert.id], entities, notes: [], createdAt: alert.createdAt, updatedAt: alert.createdAt };
      state.sentinel.incidents.push(incident);
    }
    created.push({ alert, incident });
  }
  if (created.length) state.revision += 1;
  state.resourceInventory = resourceInventory(state);
  return created;
}

export function ingestSentinelRows(state: SecuritySimulatorState, table: string, rows: KqlRow[]) {
  const connector = state.sentinel.connectors.find((entry) => entry.table === table && entry.enabled);
  if (!connector) throw new SecuritySimulatorError("ConnectorNotFound", `No enabled connector ingests table '${table}'.`);
  if (!state.datasets[table]) state.datasets[table] = [];
  state.datasets[table].push(...rows.map((row) => ({ ...row })));
  connector.lastIngestedAt = at("32");
  state.revision += 1;
  return { table, ingested: rows.length };
}

export function updateSentinelIncident(state: SecuritySimulatorState, incidentId: string, input: { status?: IncidentStatus; severity?: SecuritySeverity; note?: string; author?: string }) {
  const incident = state.sentinel.incidents.find((entry) => entry.id === incidentId);
  if (!incident) throw new SecuritySimulatorError("IncidentNotFound", `Sentinel incident '${incidentId}' was not found.`);
  if (input.status) incident.status = input.status;
  if (input.severity) incident.severity = input.severity;
  if (input.note?.trim()) incident.notes.push({ createdAt: at("33"), author: input.author ?? "student", text: input.note.trim() });
  incident.updatedAt = at("33"); state.revision += 1; return incident;
}

export function updateDefenderIncident(state: SecuritySimulatorState, incidentId: string, input: { status?: IncidentStatus; severity?: SecuritySeverity; note?: string; author?: string }) {
  const incident = state.defender.incidents.find((entry) => entry.id === incidentId);
  if (!incident) throw new SecuritySimulatorError("IncidentNotFound", `Defender incident '${incidentId}' was not found.`);
  if (input.status) incident.status = input.status;
  if (input.severity) incident.severity = input.severity;
  if (input.note?.trim()) incident.notes.push({ createdAt: at("34"), author: input.author ?? "student", text: input.note.trim() });
  incident.updatedAt = at("34"); state.revision += 1; return incident;
}
