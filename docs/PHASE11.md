# Phase 11 — Performance, Security, and Accessibility Hardening

Phase 11 hardens the Phase 10 application without changing the server-authoritative completion boundary.

## SQLite performance and query profiling

- Instrumented server operations write bounded `performance.sample` records to `AuditLog`.
- The admin view reports p50, p95, maximum duration, sample count, SQLite version, journal mode, foreign-key state, busy timeout, and an `EXPLAIN QUERY PLAN` for user history access.
- Performance samples are pruned to a bounded recent set.
- Explicit budgets are defined in `lib/observability/performance.ts`; they are engineering targets, not guarantees for every host or storage device.

## Bounded reads and caching

- Command/query history is paginated at 25 rows per stream with a capped page number.
- Admin audit/user views remain bounded to 100 rows.
- Platform controls use a five-second server cache outside transactions and explicit invalidation after writes. Transactional policy checks bypass the cache.

## Request abuse controls

- Authentication, simulator CLI, KQL, Sentinel/Defender actions, admin mutations, and instructor assignment mutations have per-subject rate limits.
- JSON endpoints enforce actual UTF-8 byte limits in addition to Zod field limits.
- Rate-limit keys are hashed in memory; raw client IP addresses are not persisted by the limiter.
- The current limiter is intentionally process-local for the local/single-process deployment. A multi-instance Phase 12 deployment should replace it with a shared store while retaining the same interface.

## CSRF and session hardening

- Unsafe methods require same-origin evidence from `Origin` or `Referer` and reject cross-site `Sec-Fetch-Site` values.
- Missing origin evidence on unsafe requests is rejected rather than silently accepted.
- Firebase application-session and CSRF cookies use `HttpOnly`, production `Secure`, and `SameSite=Strict`.
- The sign-in session endpoint retains its double-submit CSRF token and recent-authentication requirement.

## Browser security headers

Global headers include a Firebase-compatible Content Security Policy, clickjacking protection, MIME sniffing protection, strict referrer policy, restricted permissions policy, COOP, and production HSTS. The CSP denies plugins/objects, framing of CyberLab, arbitrary form targets, and unexpected default origins.

## Accessibility

- A keyboard skip link targets the main content region.
- Focus-visible outlines remain explicit for links, buttons, inputs, and selects.
- Reduced-motion preferences disable smooth scrolling, transitions, animation loops, and hover transforms.
- Phase 11 regression tests assert these mechanisms remain in the shipped source.

## Verification

Phase 11 tests cover rate-limit reset/block behavior, actual payload bytes, same-origin unsafe requests, SQLite profiling, performance sample persistence, header policy, keyboard navigation, reduced motion, and history pagination. CI continues to run dependency audit, Prisma validation, lint, strict TypeScript, all tests, and the production build.
