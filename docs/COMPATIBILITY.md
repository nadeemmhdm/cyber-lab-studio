# Compatibility Matrix

This document records implemented platform capabilities. AWS command compatibility is also maintained machine-readably in `lib/simulators/aws/compatibility.ts` and rendered in the application at `/docs/aws-compatibility`.

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

See `docs/AWS-SIMULATOR.md` and `/docs/aws-compatibility` for the command-level matrix and examples.
