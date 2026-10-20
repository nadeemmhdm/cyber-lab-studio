# Compatibility Matrix

This matrix records implemented and tested platform capabilities. Simulator command matrices will be added in their implementation phases.

## Authentication

| Capability | Status | Test/implementation |
| --- | --- | --- |
| Email/password registration | Supported | `app/api/auth/register/route.ts` |
| Argon2id password hashing | Supported, tested | `tests/auth.test.ts` |
| Email verification | Supported | verification routes |
| Password reset | Supported | password-reset routes |
| HttpOnly opaque sessions | Supported | `lib/auth/session.ts` |
| Logout / logout-all | Supported | auth routes |
| Student/Instructor/Admin RBAC | Supported, tested | `lib/auth/rbac.ts` |
| PostgreSQL rate limiting | Supported | `lib/auth/rate-limit.ts` |
| Google OAuth/OIDC | Supported when configured | Google auth routes |

## Product UI

| Surface | Status | Data source |
| --- | --- | --- |
| Responsive app shell + themes | Supported | Server session + theme store |
| Login/register/reset flows | Supported | Auth APIs |
| Student dashboard | Supported, tested summary | PostgreSQL progress/history/flags |
| Labs catalogue | Supported | 30-lab catalogue + PostgreSQL progress |
| Progress | Supported | `LabProgress` |
| Achievements | Supported | `UserAchievement` |
| Command/query history | Supported | history tables |
| Profile/session security | Supported | User/Role/Session |
| Documentation | Supported | Product docs |
| System health | Supported | PostgreSQL live check |
| Loading/error/empty/dialog/toast patterns | Supported | Shared UI components |
| Accessibility phase review | Completed | `docs/ACCESSIBILITY.md` |
