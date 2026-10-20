# CyberLab Studio Pro

CyberLab Studio Pro is a multi-user cybersecurity training platform for hands-on AWS, Microsoft Azure, Microsoft Sentinel, KQL, and Microsoft Defender XDR learning.

## Current status

Phases 1–7 are implemented. The platform has a responsive Next.js UI, SQLite/Prisma persistence, Firebase Authentication, a 30-lab catalogue, versioned per-student lab environments, deterministic reset, persisted progress/history, cross-user isolation, native AWS and Azure simulators, a KQL AST evaluator, Microsoft Sentinel detection/incident workflows, and Defender XDR investigation state built from shared synthetic security events.

## Stack

- Next.js App Router + React + strict TypeScript
- Tailwind CSS
- SQLite + Prisma ORM
- Firebase Authentication + Firebase Admin session cookies
- Native AWS and Azure state simulators
- Native KQL parser/AST/evaluator
- Shared Sentinel/Defender XDR synthetic security-event model
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

## Simulator surfaces

AWS labs use the native CyberLab AWS CLI simulator; Azure labs use the native Azure CLI simulator. Sentinel, KQL, and Defender XDR labs use the shared security dataset and KQL engine.

Examples:

```text
aws sts get-caller-identity
aws ec2 describe-security-groups
az account show
az network nsg list --resource-group cyberlab-rg
SigninLogs | where RiskLevel == "high" | project TimeGenerated, UserPrincipalName, IPAddress
DeviceProcessEvents | where ProcessCommandLine contains "powershell" | summarize Total=count() by DeviceName
```

The native simulators never forward input to a host shell or real cloud account. Unsupported operations fail explicitly.

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
- KQL executes only against stored synthetic training tables.
- Sentinel analytics rules create alerts only from real KQL matches in the learner environment.
- Defender XDR correlations reference the same stored event IDs used by KQL and Sentinel.
- Lab validation and flag generation remain server-side.
- Student lab environments are isolated by user + lab + version.
- Unsupported simulator operations return explicit errors rather than fake success.

## Documentation

- `docs/AUTHENTICATION.md` — Firebase identity/session design
- `docs/ARCHITECTURE.md` — system boundaries
- `docs/PHASE4.md` — lab-engine guarantees
- `docs/AWS-SIMULATOR.md` — AWS simulator architecture
- `docs/AZURE-SIMULATOR.md` — Azure simulator architecture
- `docs/KQL-ENGINE.md` — KQL parser/evaluator architecture and subset
- `docs/SECURITY-OPERATIONS.md` — Sentinel + Defender XDR shared investigation model
- `docs/COMPATIBILITY.md` — implemented compatibility matrix
- `docs/ROADMAP.md` — implementation phases
- `SECURITY.md` — vulnerability reporting and security rules

## License

MIT
