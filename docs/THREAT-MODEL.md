# CyberLab Studio Pro Threat Model

## Security objectives

CyberLab must keep student lab state isolated, prevent browser clients from acquiring privileged credentials or validator internals, preserve the integrity of verified completions and flags, and ensure instructor/admin actions are authorized and auditable.

## Assets

- Firebase authenticated identity and server session cookies.
- User roles, suspension state, and instructor assignments.
- Per-user lab environments, command/query history, completions, flags, and achievements.
- Lab curriculum, hidden validation behavior, platform controls, and audit records.
- Firebase Admin configuration, database files, and optional cloud-integration secret references.

## Trust boundaries

1. **Browser → Next.js server**: all browser input is untrusted. Authentication, role checks, origin validation, byte limits, rate limits, Zod validation, and ownership checks happen server-side.
2. **Next.js server → SQLite/Prisma**: Prisma is the persistence boundary. Untrusted identifiers are passed as query parameters, not concatenated SQL. Raw SQL is restricted to fixed internal profiling statements.
3. **Lab simulator boundary**: AWS/Azure commands and KQL execute only against CyberLab state/datasets. They are never forwarded to the host shell or a real cloud account by native simulators.
4. **Firebase boundary**: Firebase verifies external identity; CyberLab converts verified identity into an HttpOnly application session and separately enforces local suspension/RBAC.
5. **Instructor/admin boundary**: privileged pages are not the security control; server APIs and management services independently enforce roles, assignment scope, object ownership, and audit logging.

## Threats and controls

| Threat | Primary controls |
| --- | --- |
| Cross-user lab access | Environment ownership queries, composite user/lab/version keys, isolation tests |
| Forged completion/flag | Server-only validators, transactional completion, crypto random flags, DB uniqueness, verified-state lock |
| Client role tampering | Roles loaded from database session context; privileged APIs use server RBAC |
| CSRF on mutations | SameSite=Strict cookies, same-origin `Origin`/`Referer`, `Sec-Fetch-Site`, sign-in CSRF token |
| Brute-force/request flooding | Scoped rate limits, bounded in-memory limiter, Firebase authentication controls |
| Oversized request memory pressure | Content-Length precheck plus actual UTF-8 byte count before JSON parsing |
| XSS/content injection | React escaping, validated bounded text fields, CSP, no HTML injection path in management editors |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options: DENY` |
| MIME confusion | `X-Content-Type-Options: nosniff` |
| Secret disclosure | Admin credentials/server configuration never serialized to browser; audit/performance metadata excludes secrets |
| Simulator escape | Command registries/parsers only; no shell forwarding; unsupported operations fail explicitly |
| Query abuse | KQL parser/evaluator subset, query length limits, rate limits, synthetic tables only |
| Privileged management misuse | ADMIN/INSTRUCTOR role checks, instructor assignment scope, target ownership checks, audit logs |
| Stale security policy | Short platform-control cache with write invalidation; transaction policy reads bypass cache |
| Unbounded database/UI reads | Pagination/take caps for history, users, audit records, and performance samples |

## Residual risks

- The Phase 11 rate limiter is process-local. Multiple Next.js instances would not share counters; Phase 12 should use a distributed limiter for horizontally scaled deployment.
- SQLite availability and latency depend on the host filesystem. The recorded performance budgets are observability targets rather than hard real-time guarantees.
- CSP currently allows `'unsafe-inline'` for scripts/styles because of framework/runtime compatibility. A future nonce-based CSP would reduce residual XSS impact further.
- Firebase and its configured identity providers remain external dependencies. Their outage or account configuration can affect authentication availability.
- Administrators intentionally have powerful curriculum and account controls. Audit logging improves accountability but cannot eliminate malicious action by a fully trusted administrator.

## Security review rule

Any new API that changes state must define authentication, authorization, ownership scope, origin/CSRF behavior, body-size limit, rate-limit policy, validation schema, audit requirements, and whether its output could expose secrets or validator internals before it is considered complete.
