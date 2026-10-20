# Phase 10 — Instructor and Admin Control Plane

Phase 10 adds role-scoped operational management without weakening student isolation or Phase 9 completion guarantees.

## Instructor scope

- Instructor accounts can open `/instructor`.
- Only students explicitly linked through `InstructorAssignment` are visible.
- The dashboard shows verified completions, active labs, and recent per-lab progress for assigned students.
- Assignment creation/removal is an administrator action and is audited.

## Administrator scope

`/admin` is protected by the `ADMIN` role. The control plane supports:

- user role changes;
- suspension/restoration;
- instructor/student assignments;
- lab enable/disable and metadata updates;
- cloning a new lab version from the latest version;
- publishing a selected version;
- published concept/scenario/hint/solution-summary edits through the management API;
- maintenance mode;
- allowed learning modes;
- global hint/solution visibility;
- daily student lab-start quota;
- recent audit events and basic SQLite/platform health counts.

All mutating management requests require an authenticated admin session and same-origin request validation. Management operations emit `AuditLog` records.

## Runtime policy

Platform controls are persisted under `PlatformSetting` key `platform.controls`. The lab engine applies the policy server-side:

- student starts are rejected during maintenance mode;
- instructor/admin accounts may bypass maintenance for operational verification;
- disabled learning modes are rejected for ordinary students;
- the daily start quota is checked before creating a new attempt;
- global hint/solution visibility is combined with the selected Guided/Practice/Challenge mode policy;
- reset, task progress, and simulator mutation are blocked for ordinary users while maintenance is active.

Phase 9 verified environments remain immutable regardless of Phase 10 settings.

## API

`GET /api/admin/manage` returns the bounded management overview for an admin session.

`PATCH /api/admin/manage` accepts typed actions for role/suspension management, instructor assignments, lab/curriculum/version management, and platform controls. Zod validation and same-origin checks are applied before mutations.

## Security boundary

The browser never receives Firebase Admin credentials, database secrets, hidden validator configuration, or flag-generation material. Instructor reads are scoped by `InstructorAssignment`; administrators operate through server-side RBAC and audited service functions.
