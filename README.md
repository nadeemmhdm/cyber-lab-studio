# CyberLab Studio Pro

CyberLab Studio Pro is a multi-user cybersecurity training platform for hands-on AWS, Microsoft Azure, Microsoft Sentinel, KQL, and Microsoft Defender XDR learning.

## Current status

Phases 1–4 are implemented on the active development branch. The platform has a responsive Next.js UI, SQLite/Prisma persistence, Firebase Authentication, a 30-lab catalogue, versioned per-student lab environments, deterministic reset, persisted task progress, and cross-user isolation tests. Phase 5 adds the native AWS simulator.

## Stack

- Next.js App Router + React + strict TypeScript
- Tailwind CSS
- SQLite + Prisma ORM
- Firebase Authentication + Firebase Admin session cookies
- Zod validation
- Vitest

## Local setup

1. Install Node.js 24.12+.
2. Create a Firebase project and enable Email/Password and Google providers in Firebase Authentication.
3. Add your local/production hostnames to Firebase Authorized domains.
4. Copy `.env.example` to `.env` and provide the Firebase Web + Admin values.
5. Install dependencies: `npm install`.
6. Create/update SQLite schema: `npx prisma db push` (or use project migrations when available).
7. Seed labs: `npm run db:seed`.
8. Start development: `npm run dev`.
9. Open `http://localhost:3000`.

No `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is required by CyberLab. Google identity is configured through Firebase Console.

## Useful commands

```bash
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
- Browser code never receives Firebase Admin credentials, database secrets, flag material, or real cloud credentials.
- Authentication state for CyberLab is an HttpOnly server session cookie, not localStorage.
- Simulator commands use registries and internal state only; host-shell execution is prohibited.
- Lab validation and flag generation remain server-side.
- Student lab environments are isolated by user + lab + version.

## Documentation

- `docs/AUTHENTICATION.md` — Firebase identity/session design
- `docs/ARCHITECTURE.md` — system boundaries
- `docs/PHASE4.md` — lab-engine guarantees
- `docs/ROADMAP.md` — implementation phases
- `SECURITY.md` — vulnerability reporting and security rules

## License

MIT
