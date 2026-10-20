# Phase 10 Compatibility Matrix

| Capability | Status | Enforcement / Source |
| --- | --- | --- |
| Instructor dashboard | Supported | `/instructor`, `INSTRUCTOR` role |
| Assigned-student scoping | Supported, tested | `InstructorAssignment` relation |
| Student progress review | Supported | SQLite `LabProgress` + verified completions |
| Create/remove instructor assignment | Supported, audited | Admin management API |
| User role management | Supported, audited | `UserRole`; self-admin-removal guard |
| User suspension/restoration | Supported, audited | `User.suspendedAt`; self-suspend guard |
| Lab enable/disable | Supported, audited | `Lab.enabled` |
| Lab metadata updates | Supported, audited | Admin management service |
| Clone new lab version | Supported, tested | latest `LabVersion` deep-clone |
| Publish lab version | Supported | one published version selected per lab |
| Concept/scenario editing | Supported | published curriculum management API |
| Three-level hint editing | Supported | exact three-hint invariant |
| Solution-summary editing | Supported | `LabSolution.summary` |
| Maintenance mode | Supported, server-enforced | `PlatformSetting: platform.controls` |
| Allowed learning modes | Supported, server-enforced | start policy |
| Global hint visibility | Supported, server-enforced | workspace policy |
| Global solution visibility | Supported, server-enforced | workspace policy |
| Daily student lab-start quota | Supported, server-enforced | attempt-count quota |
| Instructor/admin maintenance bypass | Supported | privileged role check |
| Audit view | Supported | latest 50 `AuditLog` events |
| User management view | Bounded | latest 100 users |
| Database/platform health overview | Supported | SQLite probe + bounded counts |
| Management payload validation | Supported | Zod discriminated action schema |
| Management same-origin protection | Supported | `sameOrigin()` on mutations |
| Hidden flags/validator internals in admin UI | Not exposed | existing server boundary |

This matrix covers the Phase 10 native management surface. It does not grant instructors global user/lab mutation privileges; those remain ADMIN-only.
