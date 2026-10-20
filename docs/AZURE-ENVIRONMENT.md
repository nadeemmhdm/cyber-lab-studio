# Azure Lab Environment

CyberLab Studio Pro provides an isolated, stateful Azure-compatible training environment for Labs 19–22. Learners use familiar `az` CLI command shapes while the environment persists independently for each authenticated learner.

## Scope

The supported curriculum subset covers:

- account/subscription context;
- Microsoft Entra users and groups;
- group membership;
- Azure RBAC role assignments and scopes;
- resource groups and resource discovery;
- virtual networks, subnets, NSGs, and NSG rules;
- storage accounts, containers, blobs, public-access controls, HTTPS/TLS settings;
- virtual machines, lifecycle operations, patch posture, monitoring, activity logs, and security findings.

The exact command matrix is maintained in `COMPATIBILITY.md` and exercised by the Azure test suite.

## Stateful behavior

Supported writes mutate the learner's persisted Azure environment. Later list/show/read operations observe those changes, and activity/security evidence is recalculated from stored state rather than returned as disconnected canned output.

## RBAC behavior

The environment evaluates supported actions against the current training principal's effective role assignments and resource scope. Denied actions return explicit Azure-style authorization errors.

## Networking and storage

VNets, subnets, NSGs, storage accounts, containers, and VMs retain relationships in the persisted environment. Security findings are derived from conditions such as overly broad network rules or weak storage settings and change when the learner hardens those resources.

## Isolation and safety

- Environment state belongs to one authenticated user/lab/version.
- Cross-user environment access is rejected by server ownership checks.
- `az` input is parsed by internal command handlers and is never sent to a host shell.
- The default release does not send learner commands to a production Azure subscription.

The environment is intended to reproduce the supported administrative/security workflow closely enough for the 30-lab curriculum while keeping training deterministic and isolated.