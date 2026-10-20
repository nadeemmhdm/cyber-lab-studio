# Isolated Lab Engine

CyberLab Studio Pro creates a versioned, learner-owned environment for each lab. The engine is the boundary that keeps task progress, platform state, command/query history, and validation evidence isolated between users.

## Environment identity

An environment is scoped by:

- authenticated `userId`;
- `labId`;
- published `labVersionId`.

The database enforces uniqueness for that tuple. Server services also re-check `userId` ownership before reads and mutations.

## Versioned startup

Starting a lab resolves the latest published version and creates the environment from that version's deterministic `initialState`. Existing environments remain attached to their original version, protecting historical progress from later curriculum updates.

## Deterministic reset

Before verified completion, reset restores the published initial environment state, clears training changes/task progress as defined by the engine, increments reset metadata, and keeps the learner inside the same version boundary.

Verified environments cannot be reset or mutated.

## Learning modes

The engine returns server policy for:

- Guided;
- Practice;
- Challenge.

Administrator controls may disable modes or hide hints/solutions globally. Challenge mode intentionally hides learning guidance.

## Task progress

Task position is persisted server-side. Current curriculum uses four ordered tasks. Visible task completion can advance progress only to 99%; it cannot produce a completion record or flag.

## State mutation

Platform commands and investigation actions use transactional mutation helpers. Mutation callbacks receive only the learner's environment state and write the resulting state/resource inventory back to that same environment.

No learner-provided platform command is executed by a host shell.

## Isolation verification

Release E2E tests use two users in the same AWS lab and verify:

1. separate environment IDs;
2. a resource created by User A is visible to A;
3. the resource is absent from User B's environment;
4. command history remains user/environment scoped;
5. User B cannot operate on User A's environment even when A's environment ID is known.

## Completion boundary

The lab engine does not self-award completion. Final server validation reads persisted evidence and uses the transactional completion service documented in `VALIDATION-AND-ACHIEVEMENTS.md`.