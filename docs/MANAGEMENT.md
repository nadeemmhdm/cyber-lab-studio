# Instructor, Administrator, and Support Management

CyberLab Studio Pro uses server-side roles and assignment scope for privileged management. Browser visibility is never the authorization boundary.

## Role-aware navigation and page access

Navigation is generated from the authenticated database-backed role set. Students see learning/progress/doubt links, Instructors see Instructor tools, and Administrators see Instructor/Admin/System Health controls. The desktop navigation collapses into a three-line mobile menu on small screens.

Direct URLs are protected independently of navigation visibility: Student-only, Instructor/Admin, and Administrator-only pages call server-side role guards before data is loaded. Hiding a navigation link never substitutes for authorization.

## Instructor scope

Instructors can review only learners assigned to them through `InstructorAssignment`, unless the signed-in account also has the Administrator role. Instructor views expose progress and learning status needed for teaching without granting global user management.

The platform also supports Instructor enrollment links for controlled learner onboarding. Links can be seat-limited, time-limited, revoked, and associated with the Instructor who created them. Students use the link to choose their own username/password; public Student self-signup remains disabled.

## Administrator control center

The `/admin` control center provides an operations-oriented dashboard and bounded management views for:

- users, roles, account status, and suspension;
- Instructor account provisioning and Student assignment;
- lab availability and curriculum controls;
- Guided/Practice/Challenge availability;
- hint and solution visibility policy;
- maintenance mode and platform quotas;
- database/platform health;
- audit history and failed validation counts;
- performance samples and SQLite query-plan evidence;
- user support tickets and Administrator replies.

All privileged mutations require the Administrator role on the server and create audit evidence where appropriate.

## First administrator

A fresh installation uses a one-time server-side bootstrap token. The unified installer can collect Firebase configuration, generate the token, collect the Administrator email/display name/password, and provision the first Administrator through Firebase Admin plus CyberLab RBAC.

For manual setup, configure `INITIAL_ADMIN_SETUP_TOKEN` with a random value of at least 32 characters and optionally set `INITIAL_ADMIN_EMAIL`. Open `/setup`, enter the token and Administrator credentials, and complete provisioning. The server refuses bootstrap when:

- the setup token is missing, too short, or incorrect;
- `INITIAL_ADMIN_EMAIL` is configured and the supplied email does not match;
- an account already exists for the requested email; or
- any Administrator already exists.

After successful provisioning, confirm `/admin` access and remove `INITIAL_ADMIN_SETUP_TOKEN` from `.env` before restarting the application. Initial setup remains unavailable once an Administrator exists.

## User support workflow

Signed-in users can open `/support` and create a report with:

- subject;
- category;
- priority;
- detailed message.

Users see only their own tickets and their complete conversation. They can reply while a ticket is open/in-progress/resolved. Replying to a resolved ticket reopens it; closed tickets require a new report.

Administrators see the reporter's user ID, display name, email, roles, suspension state, full conversation, category, priority, and ticket status. Administrators can reply and move support tickets through:

- `OPEN`
- `IN_PROGRESS`
- `RESOLVED`
- `CLOSED`

Solved support data is intentionally short-lived: `RESOLVED` and `CLOSED` tickets remain visible for 24 hours from their last update, then the server removes the ticket and its replies. Cleanup runs on server startup and repeats hourly; support-list operations also invoke the retention purge so expired solved tickets are not retained indefinitely.

Ticket creation, replies, and status changes are rate/body limited, same-origin protected, authorization checked, and audited.

## User and role management

Administrators can assign/remove platform roles and suspend/reactivate accounts. Suspended users are rejected by authenticated server flows. Role checks are performed against database-backed role membership, not client-provided claims.

## Curriculum management

Administrative lab controls can enable/disable labs and manage published educational records such as versions, hints, and solutions. Existing learner environments retain their associated version to preserve deterministic progress.

## Operational guidance

Use Cloudflare Access as an additional perimeter layer for `/admin*` and `/setup*` on a public deployment, while keeping CyberLab's internal Firebase session and role checks active.
