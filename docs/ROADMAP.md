# CyberLab Studio Pro Roadmap

The repository follows the product build specification in twelve implementation phases. A phase is complete only when its implementation, tests, documentation, and compatibility matrix updates are committed and CI passes.

## Phase 1 — Architecture and repository foundation

- [x] Inspect repository
- [x] Next.js/TypeScript foundation
- [x] SQLite/Prisma schema foundation
- [x] Local SQLite development database
- [x] 30-lab catalogue
- [x] Base responsive UI and themes
- [x] Health endpoint
- [x] Foundation tests and CI
- [x] Architecture/security documentation

## Phase 2 — Authentication and RBAC

- [x] Firebase email/password signup and login
- [x] Firebase email verification links
- [x] Firebase password-reset links
- [x] Firebase Google sign-in
- [x] HttpOnly Firebase Admin session-cookie lifecycle
- [x] Logout and logout-all/revocation
- [x] Student/Instructor/Admin server-side authorization
- [x] Suspended-account enforcement
- [x] Session creation CSRF protection

## Phase 3 — Premium product UI

- [x] Base responsive visual system
- [x] Light/dark/system theme foundation
- [x] All-labs searchable catalogue
- [x] Student dashboard with database-backed statistics
- [x] Progress, achievements, history, profile, docs, system health pages
- [x] Loading, error, empty, toast, and dialog patterns
- [x] Accessibility audit

## Phase 4 — Lab engine and isolated state

- [x] Versioned environment creator
- [x] Deterministic reset
- [x] Guided/Practice/Challenge policy
- [x] Task lifecycle and progress
- [x] Transactional state mutations
- [x] Cross-user isolation tests

## Phase 5 — AWS simulator

- [x] Service/resource registries
- [x] Parser/dispatcher
- [x] IAM permission engine
- [x] VPC/network engine
- [x] EC2/compute engine
- [x] S3/storage engine
- [x] Logs/audit/findings
- [x] AWS-style errors
- [x] Compatibility matrix and tests

## Phase 6 — Azure simulator

- [x] Entra identities
- [x] Resource groups/RBAC
- [x] Networking/NSGs
- [x] Storage
- [x] Virtual machines
- [x] Monitoring/audit
- [x] Azure CLI-style parser and compatibility matrix

## Phase 7 — Sentinel, KQL, Defender XDR

- [x] KQL lexer/parser/AST/evaluator/type checks
- [x] Synthetic datasets
- [x] Sentinel ingestion, detections, alerts, incidents
- [x] Defender incidents, devices, identities, processes, timelines
- [x] Shared security-event model

## Phase 8 — Complete educational content

- [ ] All 30 lab explanations
- [ ] Scenarios and initial state
- [ ] Tasks
- [ ] Three hint levels
- [ ] Complete solutions
- [ ] Command-by-command explanation
- [ ] Common mistakes and troubleshooting

## Phase 9 — Validation, flags, achievements

- [x] Cryptographically secure flag primitive
- [x] Database uniqueness constraints
- [ ] Validator registry for every lab
- [ ] Transactional completion service
- [ ] Achievement evaluation
- [ ] Hidden-validation leakage tests

## Phase 10 — Instructor and admin

- [ ] Instructor assignments and progress views
- [ ] Learning-mode/solution visibility controls
- [ ] User/role/suspension management
- [ ] Lab/version/hint/solution management
- [ ] Audit/error/database/platform health views
- [ ] Maintenance mode and quotas

## Phase 11 — Performance, security, accessibility

- [ ] SQLite transaction/query profiling
- [ ] Pagination/bounded history/caching
- [ ] Rate/size limits
- [ ] CSRF strategy hardening
- [ ] CSP hardening
- [ ] Security review and threat model
- [ ] Accessibility and reduced-motion testing
- [ ] Measured performance budgets

## Phase 12 — Full testing and deployment

- [ ] Unit/integration/E2E suite
- [ ] Two-user isolation E2E
- [ ] Windows install documentation
- [ ] Backup/restore tooling
- [ ] Cloudflare Tunnel setup
- [ ] Cloudflare Access recommendation for admin routes
- [ ] Final compatibility matrices
- [ ] Release checklist
