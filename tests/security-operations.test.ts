import { describe, expect, it } from "vitest";
import { executeKql } from "@/lib/kql/engine";
import { createInitialSecurityState, ingestSentinelRows, runSentinelAnalytics, updateDefenderIncident, updateSentinelIncident } from "@/lib/simulators/security/engine";

describe("shared security operations state", () => {
  it("provides deterministic identity, endpoint, network, audit, and unified tables", () => {
    const state = createInitialSecurityState(23, "SENTINEL");
    expect(Object.keys(state.datasets)).toEqual(expect.arrayContaining(["SigninLogs", "DeviceProcessEvents", "DeviceNetworkEvents", "IdentityAuditEvents", "SecurityEvent", "CloudAuditEvents", "UnifiedSecurityEvents"]));
    expect(state.datasets.UnifiedSecurityEvents.length).toBeGreaterThan(10);
    expect(state.timeline.some((entry) => entry.eventId === "proc-001")).toBe(true);
  });

  it("runs Sentinel analytics against actual KQL matches and creates persisted-style alerts/incidents", () => {
    const state = createInitialSecurityState(24, "SENTINEL");
    const created = runSentinelAnalytics(state);
    expect(created).toHaveLength(3);
    expect(state.sentinel.alerts).toHaveLength(3);
    expect(state.sentinel.alerts.flatMap((alert) => alert.eventIds)).toEqual(expect.arrayContaining(["signin-003", "proc-001", "id-001"]));
    expect(state.sentinel.incidents.length).toBeGreaterThan(0);
    expect(state.revision).toBe(1);
  });

  it("does not duplicate alerts when the same analytics rules run again", () => {
    const state = createInitialSecurityState(24, "SENTINEL");
    runSentinelAnalytics(state);
    const count = state.sentinel.alerts.length;
    expect(runSentinelAnalytics(state)).toHaveLength(0);
    expect(state.sentinel.alerts).toHaveLength(count);
  });

  it("supports connector-backed ingestion and immediate KQL investigation", () => {
    const state = createInitialSecurityState(23, "SENTINEL");
    ingestSentinelRows(state, "SigninLogs", [{ TimeGenerated: "2026-01-15T11:00:00.000Z", EventId: "signin-new", UserPrincipalName: "new@contoso.local", IPAddress: "192.0.2.44", ResultType: 50126, ResultDescription: "Invalid password", RiskLevel: "high", DeviceName: "UNKNOWN", Location: "IN" }]);
    const result = executeKql(state.datasets, 'SigninLogs | where EventId == "signin-new" | project UserPrincipalName, IPAddress');
    expect(result.rows).toEqual([{ UserPrincipalName: "new@contoso.local", IPAddress: "192.0.2.44" }]);
    expect(state.revision).toBe(1);
  });

  it("supports Sentinel incident status, severity, and notes", () => {
    const state = createInitialSecurityState(24, "SENTINEL");
    runSentinelAnalytics(state, "rule-risky-signin");
    const incident = state.sentinel.incidents[0];
    const updated = updateSentinelIncident(state, incident.id, { status: "Active", severity: "Critical", note: "Confirmed risky sign-in from suspicious IP.", author: "Analyst" });
    expect(updated.status).toBe("Active");
    expect(updated.severity).toBe("Critical");
    expect(updated.notes[0].text).toContain("Confirmed");
  });

  it("derives Defender alerts and a multi-stage incident from the shared event IDs", () => {
    const state = createInitialSecurityState(30, "DEFENDER_XDR");
    expect(state.defender.alerts.length).toBeGreaterThanOrEqual(5);
    const incident = state.defender.incidents[0];
    expect(incident.severity).toBe("Critical");
    expect(incident.alertIds).toEqual(expect.arrayContaining(["mda-002", "mda-003", "mda-004", "mda-005"]));
    expect(state.defender.alerts.flatMap((alert) => alert.eventIds)).toEqual(expect.arrayContaining(["proc-001", "proc-002", "net-001", "id-001"]));
    expect(state.timeline.map((entry) => entry.eventId)).toEqual(expect.arrayContaining(["signin-003", "proc-001", "net-001", "id-001"]));
  });

  it("models Defender devices, identities, processes, network connections through shared datasets", () => {
    const state = createInitialSecurityState(27, "DEFENDER_XDR");
    expect(state.defender.devices.some((device) => device.name === "WEB-01" && device.riskLevel === "High")).toBe(true);
    expect(state.defender.identities.some((identity) => identity.accountName === "alex@contoso.local" && identity.riskLevel === "High")).toBe(true);
    expect(state.datasets.DeviceProcessEvents.some((row) => row.EventId === "proc-002")).toBe(true);
    expect(state.datasets.DeviceNetworkEvents.some((row) => row.RemotePort === 445)).toBe(true);
  });

  it("supports Defender incident workflow and notes", () => {
    const state = createInitialSecurityState(30, "DEFENDER_XDR");
    const incident = state.defender.incidents[0];
    const updated = updateDefenderIncident(state, incident.id, { status: "Active", note: "Contain WEB-01 and investigate DB-01.", author: "Analyst" });
    expect(updated.status).toBe("Active");
    expect(updated.notes[0].text).toContain("WEB-01");
    expect(state.revision).toBe(1);
  });

  it("keeps platform-specific resource inventory without exposing hidden validation state", () => {
    const sentinel = createInitialSecurityState(23, "SENTINEL");
    const defender = createInitialSecurityState(27, "DEFENDER_XDR");
    expect(sentinel.resourceInventory.some((entry) => entry.provider === "SENTINEL" && entry.type === "analytics-rule")).toBe(true);
    expect(defender.resourceInventory.some((entry) => entry.provider === "DEFENDER_XDR" && entry.type === "incident")).toBe(true);
  });
});
