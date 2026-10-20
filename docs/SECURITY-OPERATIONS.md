# Sentinel and Defender XDR Security Operations

Phase 7 uses one deterministic security-event model across Microsoft Sentinel, KQL, and Defender XDR training labs. The engines are local simulations; they do not contact Microsoft cloud services.

## Shared attack chain

The stored datasets model a multi-stage incident:

1. repeated high-risk sign-in failures for `alex@contoso.local`
2. successful risky sign-in from the same suspicious IP
3. encoded PowerShell on `WEB-01`
4. credential-access behavior involving LSASS
5. SMB and WinRM movement from `WEB-01` toward `DB-01`
6. remote command execution on `DB-01`
7. privileged role assignment
8. related cloud audit activity

Every stage has stable event IDs. KQL results, Sentinel alerts, Sentinel incidents, Defender alerts, the Defender incident, and the investigation timeline reference those same events.

## Microsoft Sentinel simulator

The Sentinel state contains:

- a Log Analytics-style workspace
- enabled connectors and their target tables
- analytics rules containing real KQL queries
- generated alerts
- grouped incidents
- entities
- incident status/severity
- analyst notes

`runSentinelAnalytics()` executes each enabled rule through the KQL engine. A rule creates an alert only when its query returns actual rows. Incidents are grouped by shared entities. Re-running an unchanged rule does not duplicate the same alert/event signature.

Connector-backed ingestion can append rows to supported tables. The ingested rows are immediately queryable through KQL.

## Defender XDR simulator

Defender XDR derives investigation state from the shared datasets. The state includes:

- incidents and alerts
- devices and risk/exposure levels
- identities and risk levels
- process events
- network connections
- a chronological attack timeline
- status, severity, and notes

The default multi-stage incident correlates identity, process, network, and privilege-escalation evidence using the shared event IDs.

## Persistence and isolation

- Each learner receives an isolated versioned `LabEnvironment`.
- KQL query history is stored in SQLite per learner/environment.
- Sentinel detection runs and incident changes use the Phase 4 transactional environment mutation service.
- Defender incident changes use the same ownership and transaction boundary.
- Reset restores the published deterministic Phase 7 state.
- Client actions cannot award completion or flags.
