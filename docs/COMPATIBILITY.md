# Compatibility Matrix

This document records implemented platform capabilities. AWS and Azure command compatibility are maintained by their native simulator registries and rendered at `/docs/aws-compatibility` and `/docs/azure-compatibility`; KQL capabilities are rendered at `/docs/kql-compatibility`.

## Authentication

| Capability | Status | Implementation |
| --- | --- | --- |
| Email/password registration and sign-in | Supported | Firebase Web SDK |
| Email verification link | Supported | Firebase Authentication |
| Password-reset link | Supported | Firebase Authentication |
| Google sign-in | Supported | Firebase `GoogleAuthProvider` |
| HttpOnly application session | Supported | Firebase Admin session cookie |
| Session CSRF protection | Supported | `/api/auth/csrf` + `/api/auth/session` |
| Logout / logout-all | Supported | Firebase cookie clear + refresh-token revocation |
| Student/Instructor/Admin RBAC | Supported | SQLite `UserRole -> Role`, `lib/auth/rbac.ts` |
| Suspended local account enforcement | Supported | server session creation/load |
| Custom Google client ID/secret flow | Not used | Google provider configured in Firebase Console |

## Persistence and lab engine

| Capability | Status | Implementation |
| --- | --- | --- |
| Application database | Supported | SQLite + Prisma |
| Versioned lab state | Supported | `LabVersion`, `LabEnvironment` |
| Per-student isolation | Supported, tested | `(userId, labId, labVersionId)` + ownership checks |
| Deterministic reset | Supported, tested | published `initialState` |
| Guided / Practice / Challenge | Supported | lab mode policy |
| Task progress persistence | Supported, tested | `LabProgress` |
| Client-side completion | Explicitly unsupported | completion reserved for server validation |
| Transactional simulator mutation | Supported | `mutateEnvironment` |

## Product UI

| Surface | Status | Data source |
| --- | --- | --- |
| Responsive app shell + light/dark/system themes | Supported | UI theme store |
| Login/register/forgot-password flows | Supported | Firebase Authentication |
| Student dashboard | Supported | SQLite progress/history/flags |
| Labs catalogue | Supported | 30-lab catalogue + SQLite progress |
| Lab workspace | Supported | versioned isolated environment |
| AWS terminal | Supported | native AWS state engine |
| Azure terminal | Supported | native Azure state engine |
| KQL console | Supported | AST evaluator + security datasets |
| Sentinel detection action | Supported | KQL analytics rules + transactional state |
| Defender investigation state | Supported | shared event correlation |
| Progress | Supported | `LabProgress` |
| Achievements | Supported | `UserAchievement` |
| Command/query history | Supported | history tables |
| Profile/session security | Supported | local user/roles + Firebase session |
| Documentation | Supported | product docs |
| System health | Supported | SQLite check + Firebase Admin configuration state |
| Loading/error/empty/dialog/toast patterns | Supported | shared UI components |
| Accessibility phase review | Completed | `docs/ACCESSIBILITY.md` |

## AWS native simulator

CyberLab implements a tested AWS training subset; it does not claim full AWS CLI/API compatibility.

| Family | Implemented capability |
| --- | --- |
| STS | caller identity |
| IAM | users, groups, roles, trust policy, access keys, inline user policies, simulated permission checks |
| VPC/network | VPCs, subnets, route tables/routes, internet gateways, security groups, network ACLs, flow-log metadata |
| EC2/compute | instance inspection/start/stop/create, metadata hardening, patch-state inspection |
| EC2/storage | volume inspection and snapshot creation/inspection |
| S3/S3API | buckets, objects, policies, public-access block, encryption, versioning |
| Logs | log-group discovery and filtering |
| Security findings | state-derived Security Hub-style findings |
| Audit | persisted mutation audit and CloudTrail-style log entries |
| Command history | persisted per student/environment |
| Unsupported commands | explicit `UnsupportedOperation` error |
| Host-shell forwarding | Explicitly unsupported |
| Real AWS forwarding | Explicitly unsupported by native simulator |

AWS-style errors include `AccessDenied`, `InvalidParameter`, `InvalidParameterValue`, `ResourceNotFound`, `EntityAlreadyExists`, `DependencyViolation`, and `UnsupportedOperation`.

See `docs/AWS-SIMULATOR.md` and `/docs/aws-compatibility`.

## Azure native simulator

CyberLab implements a tested Azure training subset; it does not claim full Azure CLI/API compatibility.

| Family | Implemented capability |
| --- | --- |
| Account | subscription and tenant discovery |
| Entra ID | users, groups, membership and account state |
| Azure RBAC | role-assignment list/create/delete with simulated permission checks |
| Resource groups | list/show/create/delete with dependency protection |
| Resource inventory | subscription/resource-group scoped discovery |
| Virtual networks | VNet and subnet list/show/create/update |
| NSGs | NSG and security-rule list/show/create/delete |
| Storage | account settings, containers, public access and blob operations |
| Virtual machines | list/show/create, power state, patch posture and monitoring |
| Activity log | persisted simulator operations and failures |
| Security findings | state-derived Azure posture findings |
| Command history | persisted per student/environment |
| Unsupported commands | explicit `UnsupportedOperation` error |
| Host-shell forwarding | Explicitly unsupported |
| Real Azure forwarding | Explicitly unsupported by native simulator |

Azure-style simulator errors include `AuthorizationFailed`, `ResourceNotFound`, `InvalidArgument`, `ResourceAlreadyExists`, `Conflict`, and `UnsupportedOperation`.

See `docs/AZURE-SIMULATOR.md` and `/docs/azure-compatibility`.

## KQL engine

CyberLab implements a local training subset with a lexer/parser/AST/evaluator pipeline. Query output is computed from stored rows rather than canned results.

| Capability | Status |
| --- | --- |
| `where` | Supported, tested |
| `project` / `project-away` | Supported, tested |
| `extend` | Supported, tested |
| `sort by` / `order by` | Supported, tested |
| `take` / `limit` | Supported, tested |
| `summarize ... by` | Supported, tested |
| `count` | Supported, tested |
| `distinct` | Supported, tested |
| `top N by` | Supported, tested |
| `==`, `!=`, `>`, `>=`, `<`, `<=` | Supported, tested |
| `contains`, `startswith`, `endswith` | Supported, tested |
| `and`, `or`, `not` | Supported, tested |
| arithmetic `+ - * /` | Supported, tested |
| numeric and datetime comparisons | Supported, tested |
| `count()`, `sum()`, `avg()`, `min()`, `max()` | Supported, tested |
| query history | SQLite persisted per student/environment |
| unknown syntax/table/column/type | Explicit errors |

Available training tables include `SigninLogs`, `DeviceProcessEvents`, `DeviceNetworkEvents`, `IdentityAuditEvents`, `SecurityEvent`, `CloudAuditEvents`, and `UnifiedSecurityEvents`.

See `docs/KQL-ENGINE.md` and `/docs/kql-compatibility`.

## Microsoft Sentinel simulator

| Capability | Status |
| --- | --- |
| workspace + tables | Supported |
| connectors and ingestion | Supported, tested |
| KQL search | Supported through shared KQL engine |
| analytics rules | Supported, real KQL evaluation |
| alerts from matched event rows | Supported, tested |
| incident grouping by entities | Supported, tested |
| entities | Accounts, hosts, IPs, processes |
| incident status/severity | Supported |
| analyst notes | Supported |
| duplicate detection suppression | Supported, tested |
| reset | Deterministic Phase 4 reset before verified completion |

## Defender XDR simulator

| Capability | Status |
| --- | --- |
| alerts | Derived from stored security events |
| incidents | Multi-alert correlation supported |
| devices | Supported with risk/exposure state |
| identities | Supported with risk state |
| processes | `DeviceProcessEvents` shared dataset |
| network connections | `DeviceNetworkEvents` shared dataset |
| attack timeline | Supported from unified event IDs |
| incident status/severity | Supported |
| investigation notes | Supported |
| KQL hunting | Supported through shared KQL engine |
| reset | Deterministic Phase 4 reset before verified completion |

Sentinel, KQL, and Defender XDR deliberately share the same synthetic event IDs so a learner can pivot between products and confirm the same attack evidence.

See `docs/SECURITY-OPERATIONS.md`.

## Phase 8 educational content

| Curriculum capability | Status | Verification |
| --- | --- | --- |
| All 30 concept explanations | Supported | static content coverage test |
| All 30 scenarios | Supported | unique scenario coverage test |
| Versioned curriculum | Supported | `LabVersion` 2; Version 1 retained |
| Four ordered tasks per lab | Supported | 120 unique task validator keys |
| Three hint levels per lab | Supported | exact three-level invariant |
| Complete solution per lab | Supported | required field/length tests |
| Command/query purpose | Supported | every solution step has purpose text |
| Command/query explanation | Supported | every solution step has explanation text |
| Expected output/evidence | Supported | required for all 30 labs |
| Security consequence | Supported | required for all 30 labs |
| Verification guidance | Supported | required for all 30 labs |
| Common mistakes | Supported | required for all 30 labs |
| Troubleshooting | Supported | required for all 30 labs |
| Guided mode hints/solutions | Supported | workspace mode policy |
| Practice mode hints/solutions | Supported | workspace mode policy |
| Challenge mode hides guidance | Supported | existing mode policy |
| Hidden flag/validator leakage | Explicitly prohibited, tested | content leakage assertions |
| Security-lab KQL examples | Supported, executed in tests | shared synthetic dataset |
| Client-side completion from solution | Explicitly unsupported | server validation remains authoritative |

See `docs/PHASE8-CONTENT.md`.

## Phase 9 validation, flags, and achievements

| Capability | Status | Verification |
| --- | --- | --- |
| Validator registry for Labs 01–30 | Supported | exact 30-profile coverage test |
| Task-only completion | Explicitly unsupported | pre-validation progress capped at 99% |
| AWS/Azure command evidence | Supported | successful per-environment terminal history |
| Sentinel/KQL/Defender query evidence | Supported | successful per-environment query history |
| Persisted final-state validation | Supported | platform-specific state predicates |
| Read-only investigation labs | Supported | no fake mutation requirement |
| Sentinel/Defender analyst actions | Supported | persisted security-state validation |
| Transactional completion | Supported | Prisma transaction |
| Failed validation creates completion | Explicitly prohibited, tested | no `CompletionRecord` or `Flag` |
| Successful validation reaches 100% | Supported, tested | `LabProgress.COMPLETED` |
| Cryptographic per-user flags | Supported, tested | server random bytes + DB uniqueness |
| Repeated validation | Idempotent, tested | existing flag reused |
| Verified-lab reset | Explicitly blocked | immutable completion state |
| Achievement evaluation | Supported | verified completions/PASSED attempts only |
| Challenge achievement | Supported, tested | requires passed Challenge attempt |
| Hidden validator details in API | Explicitly prohibited, tested | coarse public check labels only |
| Validation audit events | Supported | pass/fail `AuditLog` entries |

See `docs/PHASE9.md`.
