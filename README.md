# CyberLab Studio Pro

CyberLab Studio Pro is a multi-user cybersecurity training platform for hands-on AWS, Microsoft Azure, Microsoft Sentinel, KQL, and Microsoft Defender XDR learning.

## Status

Foundation phase is in progress. The repository currently contains the application shell, PostgreSQL/Prisma data model, the 30-lab catalogue, health endpoint, local Docker database setup, CI, and project documentation. Simulator engines and full lab workflows are implemented incrementally according to `docs/ROADMAP.md`.

## Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Zod validation
- Vitest
- Docker Compose for local PostgreSQL

## Local setup

1. Install Node.js 22+ and Docker Desktop (or PostgreSQL 16+).
2. Copy `.env.example` to `.env`.
3. Start PostgreSQL: `docker compose up -d db`.
4. Install dependencies: `npm install`.
5. Run migrations: `npm run db:migrate`.
6. Seed the 30-lab catalogue: `npm run db:seed`.
7. Start development: `npm run dev`.
8. Open `http://localhost:3000`.

## Useful commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Security principles

- PostgreSQL is never exposed to the public internet.
- Browser code never receives database credentials, admin secrets, or cloud credentials.
- Future cloud simulators use command registries and internal state only; they must never execute host shell commands.
- Lab validation and flag generation remain server-side.
- Student lab environments are isolated by user + lab + version.

## Project documentation

- `docs/ARCHITECTURE.md` — architecture and boundaries
- `docs/ROADMAP.md` — implementation phases
- `SECURITY.md` — vulnerability reporting and security rules
- `CONTRIBUTING.md` — contribution workflow

## License

MIT