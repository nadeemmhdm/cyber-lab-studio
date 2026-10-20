# CyberLab Studio Pro

CyberLab Studio Pro is a multi-user cybersecurity training platform for hands-on AWS, Microsoft Azure, Microsoft Sentinel, KQL, and Microsoft Defender XDR learning.

## Current status

Phases 1–5 are implemented. The platform has a responsive Next.js UI, SQLite/Prisma persistence, Firebase Authentication, a 30-lab catalogue, versioned per-student lab environments, deterministic reset, persisted task progress, cross-user isolation, and a native stateful AWS training simulator with tested CLI compatibility.

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
6. Create/update SQLite schema: `npx prisma db push`.
7. Seed labs and deterministic simulator state: `npm run db:seed`.
8. Start development: `npm run dev`.
9. Open `http://localhost:3000`.

No `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is required by CyberLab. Google identity is configured through Firebase Console.

## AWS simulator

AWS labs run in a native CyberLab simulator. Supported commands mutate the authenticated student's persisted lab state; unsupported operations fail explicitly and are never sent to a host shell or real AWS account.

Examples:

```text
aws sts get-caller-identity
aws iam list-users
aws ec2 describe-vpcs
aws ec2 describe-security-groups
aws s3api list-buckets
aws securityhub get-findings
```

See `/docs/aws-compatibility` and `docs/AWS-SIMULATOR.md` for the tested subset.

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
- Unsupported simulator operations return explicit errors rather than fake success.

## Documentation

- `docs/AUTHENTICATION.md` — Firebase identity/session design
- `docs/ARCHITECTURE.md` — system boundaries
- `docs/PHASE4.md` — lab-engine guarantees
- `docs/AWS-SIMULATOR.md` — Phase 5 AWS simulator architecture and examples
- `docs/ROADMAP.md` — implementation phases
- `SECURITY.md` — vulnerability reporting and security rules

## License

MIT
