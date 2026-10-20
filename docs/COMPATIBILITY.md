# Compatibility Matrix

This matrix records implemented and tested platform capabilities. Simulator command matrices will be added in their implementation phases.

## Authentication

| Capability | Status | Test/implementation |
| --- | --- | --- |
| Email/password registration | Supported | `app/api/auth/register/route.ts` |
| Argon2id password hashing | Supported, tested | `tests/auth.test.ts` |
| Email verification | Supported | `verify-email`, `resend-verification` routes |
| Password reset | Supported | `password-reset` routes |
| HttpOnly opaque sessions | Supported | `lib/auth/session.ts` |
| Logout / logout-all | Supported | auth routes |
| Student/Instructor/Admin RBAC | Supported, tested | `lib/auth/rbac.ts` |
| PostgreSQL rate limiting | Supported | `lib/auth/rate-limit.ts` |
| Google OAuth/OIDC | Supported when configured | Google auth routes |

## Product UI

Phase 3 entries are updated when their pages and accessibility checks are committed.
