# CyberLab Studio Pro

CyberLab Studio Pro is a multi-user cybersecurity training platform for hands-on AWS, Microsoft Azure, Microsoft Sentinel, KQL, and Microsoft Defender XDR learning.

## Current status

Phases 1–10 are implemented. The platform includes a responsive Next.js UI, SQLite/Prisma persistence, Firebase Authentication, a 30-lab catalogue, isolated versioned lab environments, native AWS/Azure simulators, KQL/Sentinel/Defender investigation workflows, complete Version 2 educational curriculum, server-authoritative validation with unique flags and achievements, plus role-scoped Instructor and Admin control planes.

Phase 10 adds instructor/student assignments, assigned-student progress views, user role/suspension management, lab and version management, curriculum controls, audit/health views, maintenance mode, allowed learning modes, hint/solution visibility controls, and daily lab-start quotas. Management mutations are server-authorized and audited.

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
- Instructor/Admin RBAC control plane
- Zod validation
- Vitest

## Local setup

1. Install Node.js 24.12+.
2. Create a Firebase project and enable Email/Password and Google providers in Firebase Authentication.
3. Add your local/production hostnames to Firebase Authorized domains.
4. Copy `.env.example` to `.env` and provide the Firebase Web + Admin values.
5. Install the locked dependency graph: `npm ci`.
6. Create/update SQLite schema: `npx prisma db push`.
7. Seed labs, simulator state, and Version 2 curriculum: `npm run db:seed`.
8. Start development: `npm run dev`.
9. Open `http://localhost:3000`.

No `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is required by CyberLab. Google identity is configured through Firebase Console.

## Product surfaces

Students use `/dashboard`, `/labs`, progress/history/achievement/profile pages, and the versioned lab workspace. Instructor accounts use `/instructor` to view only explicitly assigned learner progress. Admin accounts use `/admin` for platform operations and management.

AWS labs use the native CyberLab AWS CLI simulator; Azure labs use the native Azure CLI simulator. Sentinel, KQL, and Defender XDR labs use the shared security dataset and KQL engine. The native simulators never forward input to a host shell or real cloud account.

## Educational modes

- **Guided** — concepts, tasks, three progressive hints, and full educational solution when globally allowed.
- **Practice** — curriculum and solution remain available when globally allowed while learners perform the simulator/query workflow themselves.
- **Challenge** — concepts, hints, and solutions are hidden by the mode policy.

Administrators can additionally disable specific learning modes or globally hide hints/solutions. Opening guidance never grants completion. Task workflow is capped below 100%; the authenticated server validates persisted evidence before issuing the completion record and unique flag.

## Validation and achievements

Each of the 30 labs has a server-side validator profile. Successful validation atomically records the passing validation result, marks the attempt passed, moves progress to 100%, creates the completion record, issues one cryptographically random `CYBERLAB{...}` flag, writes an audit event, and evaluates achievements. Failed validation creates no completion or flag. Verified environments are immutable.

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
- Completion flags are generated only after successful server-side validation and are globally unique in the database.
- Authentication state for CyberLab is an HttpOnly server session cookie, not localStorage.
- Instructor reads are scoped by `InstructorAssignment`; administrator mutations require server-side ADMIN authorization and emit audit events.
- Simulator commands use registries and internal state only; host-shell execution is prohibited.
- KQL executes only against stored synthetic training tables.
- Student lab environments are isolated by user + lab + version.
- Unsupported simulator operations return explicit errors rather than fake success.
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
- `docs/PHASE10.md` — instructor/admin scope and platform controls
- `docs/COMPATIBILITY.md` — implemented compatibility matrix
- `docs/ROADMAP.md` — implementation phases
- `SECURITY.md` — vulnerability reporting and security rules

## License

MIT
