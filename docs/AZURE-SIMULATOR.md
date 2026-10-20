# Azure Simulator

CyberLab's Azure simulator is an internal, deterministic training engine. It never invokes the host shell and never forwards commands to a real Azure subscription.

## State model

Each learner receives an isolated Azure state inside their `LabEnvironment`. The state contains:

- tenant and subscription metadata
- Entra users and groups
- Azure RBAC role assignments and scopes
- resource groups
- VNets, subnets, NSGs and security rules
- storage accounts, containers and blobs
- virtual machines, patch posture and monitoring state
- activity events
- state-derived security findings
- resource inventory and revision number

Reset restores the published version's deterministic initial state.

## CLI families

The parser accepts a documented subset of:

- `az account`
- `az group`
- `az resource`
- `az ad user`
- `az ad group`
- `az ad group member`
- `az role assignment`
- `az network vnet`
- `az network vnet subnet`
- `az network nsg`
- `az network nsg rule`
- `az storage account`
- `az storage container`
- `az storage blob`
- `az vm`
- `az monitor activity-log`
- `az security finding`

The exact runtime registry is rendered at `/docs/azure-compatibility`.

## Authorization

Every registered operation declares a simulated Azure action. The engine evaluates the authenticated simulated principal's allow and deny action patterns before running the handler. An explicit deny wins. Denied operations return `AuthorizationFailed` and do not mutate resources.

## Findings

Findings are calculated from actual simulator state, including:

- internet-exposed SSH/RDP or wildcard management rules
- public blob/container access
- weak storage TLS configuration
- storage accounts that do not require HTTPS
- missing VM security/critical patches
- VMs without monitoring

Hardening the affected state removes the corresponding finding on the next derived-state refresh.

## Errors

The native engine returns explicit simulator errors including:

- `AuthorizationFailed`
- `ResourceNotFound`
- `InvalidArgument`
- `ResourceAlreadyExists`
- `Conflict`
- `UnsupportedOperation`

Unsupported operations are never treated as success.

## Persistence

State-changing operations run through the Phase 4 transactional `mutateEnvironment` service. Terminal history is persisted per user and environment in SQLite. Environment ownership is checked before execution.
