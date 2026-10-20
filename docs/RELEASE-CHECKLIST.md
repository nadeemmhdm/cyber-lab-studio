# Release Checklist

Use this checklist for CyberLab Studio Pro v1.0.0 and future releases.

## Source and dependency integrity

- [ ] `main` points to the intended release commit.
- [ ] `npm ci` succeeds from the committed lockfile.
- [ ] `npm audit --audit-level=moderate` reports zero blocking findings.
- [ ] Prisma schema validates and SQLite schema can be created from a clean database.
- [ ] Database seed creates all 30 labs, published curriculum, roles, and achievements.

## Quality gates

- [ ] ESLint passes.
- [ ] TypeScript strict check passes.
- [ ] Unit/integration tests pass.
- [ ] Release two-user E2E isolation tests pass.
- [ ] Production Next.js build passes on Linux CI.
- [ ] Windows smoke build/E2E passes.
- [ ] `npm run release:check` passes.

## Functional verification

- [ ] Email/password registration, verification, login, reset, logout and logout-all work.
- [ ] Google sign-in works through Firebase.
- [ ] First administrator bootstrap works only for the configured verified email and cannot be repeated.
- [ ] Student, Instructor, and Admin authorization boundaries are enforced server-side.
- [ ] All 30 labs open and persist independent learner environments.
- [ ] AWS/Azure training commands persist state and return explicit errors for unsupported operations.
- [ ] KQL, Sentinel, and Defender workflows use stored training events.
- [ ] Server validation is required for 100%, flags, and achievements.
- [ ] Support report/reply/status workflow works for learner and administrator views.

## Security and operations

- [ ] `INITIAL_ADMIN_EMAIL` is removed after the first administrator is created.
- [ ] Firebase Admin secrets are server-only.
- [ ] Production `APP_URL` uses HTTPS.
- [ ] CSP/HSTS/security headers are present.
- [ ] Cloudflare Tunnel exposes only port 3000 web traffic.
- [ ] Cloudflare Access is configured for privileged routes when deployed publicly.
- [ ] A fresh SQLite backup is created and restore procedure is understood.
- [ ] GitHub `main` branch ruleset is enabled using `BRANCH-PROTECTION.md`.

## Documentation and release assets

- [ ] README installation/deployment instructions match the release.
- [ ] No phase-numbered Markdown documents remain in `docs/`.
- [ ] Compatibility matrix matches supported commands/workflows.
- [ ] PPTX product/release deck exists under `docs/artifacts/`.
- [ ] DOCX lab manual with all 30 labs and detailed solutions exists under `docs/artifacts/`.
- [ ] Release tag/name/version/description are prepared.

## Release identity

- Release name: **CyberLab Studio Pro — Complete Lab Platform**
- Version: **v1.0.0**

Create the GitHub release only after the exact `main` commit has passed all required CI checks.