# CyberLab Studio Pro

CyberLab Studio Pro is a multi-user cybersecurity training platform for hands-on AWS, Microsoft Azure, Microsoft Sentinel, KQL, and Microsoft Defender XDR learning.

## Current status

Phases 1–11 are implemented. The platform now includes a responsive Next.js UI, SQLite/Prisma persistence, Firebase Authentication, 30 versioned per-student labs, native AWS/Azure simulators, KQL/Sentinel/Defender investigation engines, complete educational content, server-authoritative validation and cryptographic flags, instructor/admin management, platform maintenance/quota controls, bounded history and management reads, request rate/body limits, strengthened CSRF/origin checks, CSP/HSTS security headers, SQLite/performance profiling, explicit performance budgets, and tested keyboard/reduced-motion accessibility controls.

Phase 12 remains the deployment/full-E2E phase: Windows packaging/setup documentation, backup/restore, Cloudflare Tunnel/Access, final E2E isolation verification, and release checklist.

The dependency graph is locked with `package-lock.json`; CI uses `npm ci` and blocks on `npm audit --audit-level=moderate`.

## Stack

- Next.js App Router + React + strict TypeScript
- Tailwind CSS
- SQLite + Prisma ORM
- Firebase Authentication + Firebase Admin session cookies
- Native AWS and Azure state simulators
- Native KQL parser/AST/evaluator
- Shared Sentinel/Defender XDR synthetic security-event model
- Versioned 30-lab educational content registry
- Server-side 30-lab validation registry
- Transactional completion/flag/achievement services
- Instructor/admin RBAC management services
- Server request guards and performance observability
- Zod validation
- Vitest

## Local setup

1. Install Node.js 24.12+.
2. Create a Firebase project and enable Email/Password and Google providers in Firebase Authentication.
3. Add your local/production hostnames to Firebase Authorized domains.
4. Copy `.env.example` to `.env` and provide the Firebase Web + Admin values and a strong `SESSION_SECRET`.
5. Install the locked dependency graph: `npm ci`.
6. Create/update SQLite schema: `npx prisma db push`.
7. Seed labs and curriculum: `npm run db:seed`.
8. Start development: `npm run dev`.
9. Open `http://localhost:3000`.

No `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is required by CyberLab. Google identity is configured through Firebase Console.

## Learning and simulation

AWS labs use the native CyberLab AWS CLI simulator; Azure labs use the native Azure CLI simulator. Sentinel, KQL, and Defender XDR labs use the shared security dataset and KQL engine. Unsupported operations fail explicitly and simulator input is never forwarded to a host shell.

Guided and Practice modes can expose curriculum guidance according to administrator policy; Challenge mode hides guidance. Administrators can globally disable modes, hints, or solutions. Instructor views are restricted to assigned students unless the caller is an administrator.

## Validation and achievements

Each of the 30 labs has a server-side validator profile. Task workflow is capped below 100%; persisted evidence must pass validation before completion. Successful validation atomically records the validation result, passed attempt, 100% progress, completion record, cryptographically random per-user `CYBERLAB{...}` flag, audit event, and achievement evaluation. Failed validation creates no completion or flag. Verified environments are locked against later mutation.

## Phase 11 hardening

- Unsafe state-changing requests require same-origin evidence; sign-in retains a separate CSRF token check.
- Session and CSRF cookies use `SameSite=Strict`, `HttpOnly`, and production `Secure`.
- Authentication, simulator, security-operations, instructor, and admin mutations have scoped rate limits and body-size limits.
- Global CSP, clickjacking, MIME, permissions, referrer, COOP, and production HSTS headers are applied.
- History is paginated and admin/audit/performance collections are bounded.
- Platform-control reads use a short server cache with write invalidation; transactional enforcement bypasses the cache.
- SQLite query plans and server operation timings are observable in the admin dashboard with explicit budgets.
- Skip navigation, focus-visible styling, and `prefers-reduced-motion` behavior are regression-tested.

The current request limiter is process-local and is appropriate for the current local/single-process architecture. A horizontally scaled Phase 12 deployment should use a shared rate-limit store. See the threat model for residual risks.

## Useful commands

```bash
npm ci
npm audit --audit-level=moderate
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:seed
npm run db:studio
```

## Security principles

- Firebase Web SDK handles identity; Firebase Admin verifies server sessions.
- Browser code never receives Firebase Admin credentials, database secrets, hidden validator internals, or real cloud credentials.
- Roles, ownership, maintenance/quota policy, validation, completion, and privileged mutations are enforced server-side.
- Simulator commands use internal registries/state only; host-shell execution is prohibited.
- KQL executes only against stored synthetic training tables.
- Student lab environments are isolated by user + lab + version.
- Unsupported operations return explicit errors rather than fake success.
- CI audits the locked npm dependency graph and fails on moderate-or-higher findings.

## Documentation

- `docs/AUTHENTICATION.md` — Firebase identity/session design
- `docs/ARCHITECTURE.md` — system boundaries
- `docs/PHASE4.md` — lab-engine guarantees
- `docs/AWS-SIMULATOR.md` — AWS simulator architecture
- `docs/AZURE-SIMULATOR.md` — Azure simulator architecture
- `docs/KQL-ENGINE.md` — KQL parser/evaluator architecture and subset
- `docs/SECURITY-OPERATIONS.md` — Sentinel + Defender XDR shared investigation model
- `docs/PHASE8-CONTENT.md` — Version 2 educational content architecture
- `docs/PHASE9.md` — validation, completion, flags, achievements, and leakage controls
- `docs/PHASE10.md` — instructor/admin management and platform controls
- `docs/PHASE10-COMPATIBILITY.md` — Phase 10 management matrix
- `docs/PHASE11.md` — performance/security/accessibility hardening
- `docs/PHASE11-COMPATIBILITY.md` — hardening compatibility matrix
- `docs/THREAT-MODEL.md` — trust boundaries, controls, and residual risks
- `docs/COMPATIBILITY.md` — simulator/product compatibility matrix
- `docs/ROADMAP.md` — implementation phases
- `SECURITY.md` — vulnerability reporting and security rules

## License

MIT
