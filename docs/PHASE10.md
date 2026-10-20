# Phase 10 — Instructor and Admin Management

Phase 10 adds server-authorized instructor and administrator workflows without weakening student isolation or the Phase 9 validation boundary.

## Instructor controls

- Instructor dashboard is protected by server-side `INSTRUCTOR`/`ADMIN` RBAC.
- Instructor/student relationships use `InstructorAssignment` and never infer access from client input.
- Instructors can assign/unassign only their own roster unless the caller is an administrator.
- Progress views contain only assigned students for instructors; administrators may inspect the complete student population.

## Admin controls

- User role and suspension management is server-authorized and audited.
- Self-suspension is rejected to avoid accidental lockout of the active administrator.
- Lab metadata, latest version publishing/content, hints, and selected solution fields can be edited through the admin API and console.
- Every management mutation writes an `AuditLog` entry with actor, target, action, and non-secret metadata.

## Platform controls

`PlatformSetting` stores three validated control groups:

- `maintenance`: maintenance switch and user-safe message.
- `quota`: maximum active lab environments per user.
- `learning`: allowed learning modes plus global hint/solution visibility.

The lab engine enforces these controls on the server. Maintenance blocks lab mutations, disabled learning modes cannot be started, quotas are checked before a new environment is created, and hint/solution visibility is applied to the server workspace policy.

## Operational view

The admin dashboard exposes bounded operational information only: user count, active environments, completions, failed validations, SQLite version/health, and recent audit records. Secrets, Firebase credentials, flags belonging to other users, validator internals, and simulator credentials are not surfaced.

## APIs

- `POST/DELETE /api/instructor/assignments`
- `PATCH /api/admin/users/:id`
- `PATCH /api/admin/settings`
- `PATCH /api/admin/labs/:id`

All mutating APIs require same-origin requests and role authorization.
