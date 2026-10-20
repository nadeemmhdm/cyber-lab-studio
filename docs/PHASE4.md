# Phase 4 — Lab Engine and Isolated State

Phase 4 establishes the runtime boundary used by every cloud simulator.

## Implemented

- Published, versioned lab environments for all 30 catalogue labs.
- Per-student environment uniqueness across user, lab, and lab version.
- Deterministic environment creation and reset from the published version's `initialState`.
- Guided, Practice, and Challenge mode policy.
- Persisted task lifecycle and progress capped below completion until server validation succeeds.
- Transactional environment mutations through the lab engine.
- Server-owned prerequisite checks.
- Authenticated start, workspace, task-progress, and reset APIs.
- Workspace UI with persisted state visibility and reset controls.
- Cross-user isolation tests proving one student cannot mutate another student's environment.

## Security invariants

- Every environment read and mutation is scoped by the authenticated local user ID.
- Client buttons cannot set `COMPLETED`, create a completion record, or create a flag.
- Reset restores the published deterministic initial state and deletes derived simulated resources.
- Simulator operations must call the lab engine; they never execute host-shell input.

Phase 5 AWS simulator commands build on this persisted state boundary.
