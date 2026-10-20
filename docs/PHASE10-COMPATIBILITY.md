# Phase 10 Management Compatibility Matrix

| Capability | Instructor | Admin | Enforcement |
| --- | --- | --- | --- |
| View assigned student progress | Supported | Supported (all students) | Server-side assignment/RBAC query |
| Assign/unassign students | Own roster | Supported | RBAC + actor/instructor check + audit |
| Change user roles | Not supported | Supported | Server-side ADMIN role |
| Suspend/restore users | Not supported | Supported | Server-side ADMIN role + self-suspend guard |
| Edit lab enabled/title/objective | Not supported | Supported | ADMIN API + audit |
| Edit published lab-version content | Not supported | Supported | Version ownership check + audit |
| Edit hint content | Not supported | Supported | Lab/version ownership check + audit |
| Edit solution summary/verification/troubleshooting | Not supported | Supported | Lab/version ownership check + audit |
| Maintenance mode | View effect | Supported | Lab-engine server enforcement |
| Active-environment quota | View effect | Supported | Checked before new environment creation |
| Allowed learning modes | View effect | Supported | Server-side `startLab` enforcement |
| Global hint visibility | View effect | Supported | Workspace mode policy |
| Global solution visibility | View effect | Supported | Workspace mode policy |
| Audit history | Not exposed | Supported, bounded | Last 100 records |
| Failed validation count | Not exposed | Supported | Database-backed aggregate |
| SQLite platform health/version | Not exposed | Supported | Live database query |
| Client-only privilege escalation | Unsupported | Unsupported | No management mutation trusts client role claims |
| Cross-instructor student access | Unsupported | Admin override only | Assignment scope enforced server-side |
