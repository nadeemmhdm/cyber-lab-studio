# Phase 8 — Complete Educational Content

Phase 8 turns the 30 runtime labs into a complete guided cybersecurity curriculum while preserving the simulator, isolation, and server-validation guarantees delivered in earlier phases.

## Versioning

Every catalogue lab now has a Phase 8 curriculum as `LabVersion` 2. Version 1 remains in the database for historical/runtime compatibility. The published-version resolver selects the newest published version, so new workspaces use Version 2 without rewriting older version records.

Version 2 reuses the real deterministic simulator initial state for the lab's platform:

- AWS Labs 03–18 use the native AWS simulator state.
- Azure Labs 19–22 use the native Azure simulator state.
- Sentinel/KQL/Defender XDR Labs 23–30 use the shared synthetic security datasets and correlated security state.
- Fundamentals Labs 01–02 use the isolated foundation state.

## Required content per lab

All 30 labs include:

- a substantial concept explanation
- a scenario tied to the lab objective
- prerequisites
- four ordered educational tasks
- three progressive hint levels
- a complete solution walkthrough
- command/query/UI-action steps with a purpose and explanation for each step
- expected output or final evidence
- an explanation of why the approach works
- security consequences
- independent verification guidance
- common mistakes
- troubleshooting guidance
- a concise summary

The content registry lives under `lib/labs/content/` and is validated against the 30-lab catalogue by `tests/phase8-content.test.ts`.

## Hint policy

Hints intentionally progress from orientation to direction to a verification path:

1. Level 1 points the learner toward the relevant evidence source.
2. Level 2 identifies the important resource, field, command family, or investigation pivot.
3. Level 3 explains the supported action and how to verify it.

Hints do not contain flags, server validator internals, hidden validation configuration, or completion shortcuts.

## Solution policy

Guided and Practice modes expose the complete solution. Challenge mode hides concepts, hints, and solutions according to the existing lab-mode policy.

A solution is educational, not authoritative completion. Opening a solution or clicking a task does not grant completion. The platform continues to reserve completion and flag issuance for server-side validation implemented in later phases.

## Command and query accuracy

AWS solution commands are limited to the native AWS command registry already supported by the simulator. Azure walkthroughs use the native Azure CLI subset. Security operations use the implemented KQL evaluator and existing Sentinel/Defender workspace actions.

The Phase 8 test suite executes every KQL example used by Labs 23–30 against the shared synthetic datasets. Unsupported operations are not documented as successful workarounds.

## Workspace presentation

`EducationalGuidance` renders progressive hints and the complete solution in expandable sections. Command/query steps show:

- the exact operation
- its purpose
- an explanation of what evidence or state it reads/changes

Expected output, verification, consequences, mistakes, and troubleshooting are shown as separate sections so learners can distinguish the procedure from the reasoning.

## Security guarantees

Phase 8 does not weaken earlier security boundaries:

- no host-shell forwarding
- no real cloud credentials in the browser
- no client-side completion
- no flag material in curriculum content
- no validator internals in hints or solutions
- per-student environment ownership remains enforced
- KQL operates only on stored synthetic training rows
- Sentinel and Defender objects remain traceable to stored event IDs

## Tests

Phase 8 tests require:

- exactly 30 curriculum entries in catalogue order
- unique substantial concepts and scenarios
- four ordered tasks per lab
- 120 unique Phase 8 task validator keys
- exactly three hints per lab
- complete solution fields and explained commands/queries
- absence of flag/validator leakage from educational content
- executable KQL examples for Labs 23–30

CI also runs the existing simulator, isolation, authentication-adjacent, KQL, Sentinel/Defender, lint, TypeScript, dependency audit, and production-build gates.
