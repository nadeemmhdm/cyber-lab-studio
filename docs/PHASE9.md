# Phase 9 — Validation, Flags, and Achievements

Phase 9 makes lab completion a server-authoritative operation. Task buttons, terminal exit codes, query execution, and client state cannot directly mark a lab complete or issue a flag.

## Validation architecture

Every published lab number from 1 through 30 has a server-side validator profile in `lib/labs/validators.ts`.

Validators use evidence that already exists in the learner's isolated environment:

- ordered task progress
- successful simulator command history for AWS and Azure labs
- successful persisted KQL query history for Sentinel, KQL, and Defender XDR labs
- persisted simulator state and derived findings
- persisted Sentinel/Defender investigation state where the lab requires analyst actions

The browser receives only coarse validation labels such as whether task workflow, simulator evidence, investigation evidence, persisted actions, or final state are sufficient. Exact internal predicates are not returned by the validation API.

## Read-only labs

A lab is not forced to mutate state when the curriculum is intentionally investigative. For example, the patch-management lab validates correct assessment evidence without inventing a patch-remediation command that the simulator does not support.

Conceptual UI references in foundation labs are not treated as persisted security mutations. Only real Sentinel/Defender actions such as running detections or recording incident notes require corresponding state changes.

## Transactional completion

`submitLabForValidation` runs inside one Prisma transaction. A successful validation atomically:

1. stores a passing `ValidationResult`
2. marks the latest attempt `PASSED`
3. creates the unique `CompletionRecord`
4. changes lab progress from a maximum pre-validation value of 99% to 100%
5. timestamps the environment as completed
6. creates one cryptographically random completion flag
7. records the validation audit event
8. evaluates and awards eligible achievements

A failed validation records its result and attempt status, but creates no completion record and no flag.

## Completion flags

Flags are generated only on the server with Node cryptographic randomness and use the format:

`CYBERLAB{<base64url-random-value>}`

Database constraints enforce one flag per user/lab and global value uniqueness. Flag creation retries a uniqueness collision rather than falling back to predictable material.

Submitting an already completed lab is idempotent: the existing flag is returned and no duplicate completion or flag is created.

## Verified completion immutability

After validation succeeds, the workspace displays the issued flag and verified 100% status. A verified environment cannot be reset through the lab reset API, preventing the persisted environment from being rewritten after a completion has already been certified.

## Achievements

Phase 9 evaluates achievements only from verified completion/attempt records. Current milestones include:

- first verified lab
- cloud foundations
- AWS security path
- Azure security path
- SOC investigation path
- a verified Challenge-mode completion
- all 30 labs completed

Achievement evaluation is idempotent through the `UserAchievement` compound key.

## Leakage controls

Validation responses do not include validator keys, exact required commands, solution-derived predicates, or hidden state logic. Tests assert that a failed response does not expose internal validator identifiers or command requirements.

## Test coverage

Phase 9 tests verify:

- a validator exists for all 30 labs
- incomplete evidence cannot create a completion or flag
- real AWS evidence can complete a lab
- real KQL evidence can complete a lab
- repeated validation reuses the same flag
- two learners receive different cryptographically random flags for the same lab
- Challenge-mode achievements require a passing server validation
- public failure feedback does not leak hidden validation details
