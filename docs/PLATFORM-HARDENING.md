# Platform Hardening

CyberLab Studio Pro applies defense-in-depth controls around authentication, privileged APIs, isolated lab state, SQLite access, and the public web surface.

## Request protections

State-changing API requests require same-origin evidence. Authentication/session creation also uses a dedicated CSRF token flow. High-risk endpoints have scoped process-local rate limits and request-body byte limits.

Covered surfaces include authentication, AWS/Azure terminals, KQL/security actions, instructor management, administrator mutations, support tickets, and first-run administrator setup.

For a horizontally scaled deployment, replace the process-local limiter with a shared rate-limit store.

## Session and identity security

- Firebase performs user identity flows.
- Firebase Admin verifies server sessions.
- Session cookies are HttpOnly, `SameSite=Strict`, and `Secure` in production.
- Suspended accounts are rejected server-side.
- Administrator and instructor permissions are database-backed.
- Firebase Admin credentials never enter browser bundles.

## Browser security headers

The Next.js application applies controls including:

- Content Security Policy;
- clickjacking protection;
- MIME-sniffing protection;
- restrictive referrer policy;
- permissions policy;
- cross-origin opener policy;
- production HSTS.

## Lab isolation

Learner environments are keyed by authenticated user, lab, and version. Mutation services re-check ownership before changing persisted state. Release E2E tests create two users in the same AWS lab, mutate one environment, verify the other remains unchanged, and reject a known cross-user environment ID.

Training command input is parsed by internal registries and is never passed to a host shell.

## Data and history bounds

Dashboard, management, audit, command, query, and performance history reads use explicit limits/pagination rather than unbounded database reads. Platform-control reads may use a short server cache with invalidation; transactional policy enforcement bypasses stale cache state.

## SQLite performance evidence

The administrative health surface includes measured operation samples and SQLite query-plan information. Performance utilities calculate bounded percentiles and retain a capped sample history.

Explicit budgets document expected operation latency. They are observability targets, not a claim that every deployment will achieve identical timings on every host.

## Accessibility

Regression checks cover:

- semantic navigation and landmarks;
- keyboard skip navigation;
- focus-visible styling;
- explicit form labels;
- progress accessibility metadata;
- reduced-motion fallbacks;
- responsive touch targets;
- loading/error/empty feedback.

See `ACCESSIBILITY.md` for the UI accessibility baseline.

## Dependency security

The npm graph is locked with `package-lock.json`. CI uses `npm ci` and blocks on moderate-or-higher audit findings. Dependabot is configured for ongoing dependency maintenance.

## Residual risks

No application should be described as absolutely secure. Public operators must still protect the Windows host, Firebase project, domain/DNS, Cloudflare account, environment file, SQLite backups, administrator identities, and GitHub repository settings. See `THREAT-MODEL.md` for the trust-boundary review.