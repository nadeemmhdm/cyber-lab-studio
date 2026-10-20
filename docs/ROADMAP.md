# CyberLab Studio Pro Roadmap

The repository follows the product build specification in twelve implementation phases. A phase is complete only when its implementation, tests, documentation, and compatibility matrix updates are committed.

## Phase 1 — Architecture and repository foundation

- [x] Inspect repository
- [x] Next.js/TypeScript foundation
- [x] PostgreSQL/Prisma schema foundation
- [x] Local Docker PostgreSQL
- [x] 30-lab catalogue
- [x] Base responsive UI and themes
- [x] Health endpoint
- [x] Foundation tests and CI
- [x] Architecture/security documentation

## Phase 2 — Authentication and RBAC

- [ ] Email/password signup and login
- [ ] Argon2id hashing
- [ ] HttpOnly session lifecycle
- [ ] Email verification
- [ ] Password reset
- [ ] Logout and logout-all
- [ ] Student/Instructor/Admin authorization
- [ ] Rate limiting and brute-force controls
- [ ] Optional Google login

## Phase 3 — Premium product UI

- [x] Base responsive visual system
- [x] Light/dark/system theme foundation
- [x] All-labs searchable catalogue
- [ ] Student dashboard with database-backed statistics
- [ ] Progress, achievements, history, profile, docs, system health pages
- [ ] Loading, error, empty, toast, and dialog patterns
- [ ] Accessibility audit

## Phase 4 — Lab engine and isolated state

- [ ] Versioned environment creator
- [ ] Deterministic reset
- [ ] Guided/Practice/Challenge policy
- [ ] Task lifecycle and progress
- [ ] Transactional state mutations
- [ ] Cross-user isolation tests

## Phase 5 — AWS simulator

- [ ] Service/resource registries
- [ ] Parser/dispatcher
- [ ] IAM permission engine
- [ ] VPC/network engine
- [ ] EC2/compute engine
- [ ] S3/storage engine
- [ ] Logs/audit/findings
- [ ] AWS-style errors
- [ ] Compatibility matrix and tests

## Phase 6 — Azure simulator

- [ ] Entra identities
- [ ] Resource groups/RBAC
- [ ] Networking/NSGs
- [ ] Storage
- [ ] Virtual machines
- [ ] Monitoring/audit
- [ ] Azure CLI-style parser and compatibility matrix

## Phase 7 — Sentinel, KQL, Defender XDR

- [ ] KQL lexer/parser/AST/evaluator/type checks
- [ ] Synthetic datasets
- [ ] Sentinel ingestion, detections, alerts, incidents
- [ ] Defender incidents, devices, identities, processes, timelines
- [ ] Shared security-event model

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

- [ ] Connection pooling and query profiling
- [ ] Pagination/bounded history/caching
- [ ] Rate/size limits
- [ ] CSRF strategy
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
