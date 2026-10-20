# Instructor, Administrator, and Support Management

CyberLab Studio Pro uses server-side roles and assignment scope for privileged management. Browser visibility is never the authorization boundary.

## Instructor scope

Instructors can review only learners assigned to them through `InstructorAssignment`, unless the signed-in account also has the Administrator role. Instructor views expose progress and learning status needed for teaching without granting global user management.

The platform also supports instructor enrollment links for controlled learner onboarding. Links can be seat-limited, time-limited, revoked, and associated with the instructor who created them.

## Administrator control center

The `/admin` control center provides bounded management views for:

- users, roles, and account suspension;
- lab availability and curriculum controls;
- Guided/Practice/Challenge availability;
- hint and solution visibility policy;
- maintenance mode and platform quotas;
- database/platform health;
- audit history and failed validation counts;
- performance samples and SQLite query-plan evidence;
- user support tickets and administrator replies.

All privileged mutations require the Administrator role on the server and create audit evidence where appropriate.

## First administrator

For a fresh install set `INITIAL_ADMIN_EMAIL` in `.env`. Register and verify that exact Firebase account, open `/setup`, and claim the first Administrator role. The server refuses a claim when:

- `INITIAL_ADMIN_EMAIL` is not configured;
- the account email does not match;
- the account is not email-verified;
- any Administrator already exists.

After the first claim, confirm `/admin` access, remove `INITIAL_ADMIN_EMAIL`, and restart the application.

## User support workflow

Signed-in users can open `/support` and create a report with:

- subject;
- category;
- priority;
- detailed message.

Users see only their own tickets and their complete conversation. They can reply while a ticket is open/in-progress/resolved. Replying to a resolved ticket reopens it; closed tickets require a new report.

Administrators see the reporter's user ID, display name, email, roles, suspension state, full conversation, category, priority, and ticket status. Administrators can reply and move tickets through:

- `OPEN`
- `IN_PROGRESS`
- `RESOLVED`
- `CLOSED`

Ticket creation, replies, and status changes are rate/body limited, same-origin protected, authorization checked, and audited.

## User and role management

Administrators can assign/remove platform roles and suspend/reactivate accounts. Suspended users are rejected by authenticated server flows. Role checks are performed against database-backed role membership, not client-provided claims.

## Curriculum management

Administrative lab controls can enable/disable labs and manage published educational records such as versions, hints, and solutions. Existing learner environments retain their associated version to preserve deterministic progress.

## Operational guidance

Use Cloudflare Access as an additional perimeter layer for `/admin*` and `/setup*` on a public deployment, while keeping CyberLab's internal Firebase session and role checks active.