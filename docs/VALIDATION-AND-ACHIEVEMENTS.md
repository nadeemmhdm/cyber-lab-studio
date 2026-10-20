# Validation, Completion, Flags, and Achievements

CyberLab Studio Pro treats task progress and verified lab completion as different states. A learner may finish the visible task workflow without receiving 100% until the server validates persisted evidence.

## Validation boundary

Every one of the 30 labs has a server-side validator profile. Depending on the lab, validators use combinations of:

- completed task order;
- successful terminal history;
- successful KQL query history;
- persisted AWS/Azure environment state;
- state-derived security findings;
- Sentinel alerts/incidents and investigation actions;
- Defender XDR alerts/incidents, device/identity evidence, and investigation actions.

Read-only investigation labs are not forced to perform artificial mutations.

## What the browser cannot do

The browser cannot directly mark a lab complete, mint a flag, or award an achievement. Hidden validation configuration stays on the server and is not returned through the API.

Visible task progress is capped below verified completion. The final validation request re-reads server-owned data rather than trusting a client claim.

## Transactional completion

On a passing validation the server transaction records:

1. a passing `ValidationResult`;
2. a passed `LabAttempt`;
3. 100% `LabProgress`;
4. a `CompletionRecord`;
5. one cryptographically random `CYBERLAB{...}` flag for that user/lab;
6. an audit event;
7. any newly earned achievements.

A failed validation creates no completion and no flag.

## Flag guarantees

- Flags are generated with cryptographically secure randomness.
- Database uniqueness prevents duplicate flag values.
- A user receives at most one flag for a particular lab.
- Two users completing the same lab receive different flags.
- Re-validating an already completed lab returns the existing completion/flag instead of creating a new one.

## Verified environment locking

After verified completion, environment reset/task mutation/platform mutation is blocked in the server service layer. This keeps the completion record tied to the state that was certified.

## Achievements

Achievements are evaluated after successful completion. The current release includes progression and mode-specific awards such as first verified completion, platform milestones, Challenge-mode verification, and the all-labs master milestone.

## Leakage controls

Tests verify that curriculum hints/solutions and failed validation responses do not expose hidden validator keys, internal commands, or flags. User-facing validation feedback reports safe check labels only.