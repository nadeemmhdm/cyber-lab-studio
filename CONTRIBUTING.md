# Contributing

## Development workflow

1. Create a focused branch from `main`.
2. Copy `.env.example` to `.env` and use test/local credentials only.
3. Run PostgreSQL locally with `docker compose up -d db` or use a private local PostgreSQL instance.
4. Install dependencies with `npm install`.
5. Run `npm run db:migrate` and `npm run db:seed`.
6. Make the smallest coherent change.
7. Add or update tests and compatibility matrices for simulator behavior.
8. Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before opening a PR.

## Simulator contribution rules

Every supported command/operator must document and test:

- accepted syntax and parameters
- permission requirements
- state reads and writes
- structured output
- expected errors
- unsupported behavior

Never return a hardcoded successful response for an operation that did not inspect or change simulator state.

Never execute user simulator input with `child_process`, PowerShell, cmd.exe, Bash, or another host shell.

## Database changes

Schema changes require a Prisma migration, updated seed data when applicable, and tests. Preserve student data isolation and database uniqueness guarantees.

## Security

Do not commit `.env`, credentials, session tokens, production data, flags, or private validation secrets. Follow `SECURITY.md` for vulnerability reports.
