import type { KqlTables } from "@/lib/kql/types";

export type SecurityPlatform = "SENTINEL" | "KQL" | "DEFENDER_XDR";
export type SecuritySeverity = "Informational" | "Low" | "Medium" | "High" | "Critical";
export type IncidentStatus = "New" | "Active" | "Resolved";

export type SecurityEntity = { type: "account" | "host" | "ip" | "process"; value: string };
export type SecurityTimelineEvent = { eventId: string; timeGenerated: string; product: string; category: string; title: string; severity: SecuritySeverity; entities: SecurityEntity[] };

export type SentinelConnector = { id: string; name: string; table: string; enabled: boolean; lastIngestedAt: string };
export type SentinelAnalyticsRule = { id: string; name: string; severity: SecuritySeverity; query: string; enabled: boolean; lastRunAt: string | null };
export type SentinelAlert = { id: string; ruleId: string; title: string; severity: SecuritySeverity; eventIds: string[]; entities: SecurityEntity[]; createdAt: string; status: "New" | "Dismissed" };
export type SentinelIncident = { id: string; title: string; severity: SecuritySeverity; status: IncidentStatus; alertIds: string[]; entities: SecurityEntity[]; notes: { createdAt: string; author: string; text: string }[]; createdAt: string; updatedAt: string };

export type DefenderDevice = { id: string; name: string; os: string; riskLevel: "Low" | "Medium" | "High"; exposureLevel: "Low" | "Medium" | "High"; lastSeen: string };
export type DefenderIdentity = { id: string; accountName: string; riskLevel: "Low" | "Medium" | "High"; lastSeen: string };
export type DefenderAlert = { id: string; title: string; severity: SecuritySeverity; category: string; eventIds: string[]; deviceIds: string[]; identityIds: string[]; createdAt: string; status: "New" | "InProgress" | "Resolved" };
export type DefenderIncident = { id: string; title: string; severity: SecuritySeverity; status: IncidentStatus; alertIds: string[]; deviceIds: string[]; identityIds: string[]; notes: { createdAt: string; author: string; text: string }[]; createdAt: string; updatedAt: string };

export type SecuritySimulatorState = {
  kind: "security";
  schemaVersion: 1;
  labNumber: number;
  platform: SecurityPlatform;
  revision: number;
  datasets: KqlTables;
  timeline: SecurityTimelineEvent[];
  sentinel: {
    workspace: { id: string; name: string; retentionDays: number };
    connectors: SentinelConnector[];
    analyticsRules: SentinelAnalyticsRule[];
    alerts: SentinelAlert[];
    incidents: SentinelIncident[];
  };
  defender: {
    devices: DefenderDevice[];
    identities: DefenderIdentity[];
    alerts: DefenderAlert[];
    incidents: DefenderIncident[];
  };
  resourceInventory: { provider: "SENTINEL" | "DEFENDER_XDR" | "INTERNAL"; type: string; id: string }[];
};
