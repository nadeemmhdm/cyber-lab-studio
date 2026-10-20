# CyberLab Studio Pro Architecture

## Goals

CyberLab Studio Pro is a local-first, multi-user cybersecurity learning platform. Web concerns, identity, authorization, lab orchestration, cloud simulation, query execution, detection logic, and persistence are separated so no browser action can manufacture completion state or a flag.

## Runtime boundaries

### Web application

Next.js App Router provides the UI and server routes. Browser code may request supported operations but never receives Firebase Admin credentials, hidden validation rules, flag-generation material, or real cloud credentials.

### Firebase Authentication

Firebase Web SDK handles Google and email/password identity, verification links, and password-reset links. After a recent verified Firebase sign-in, the browser exchanges its ID token for a Firebase Admin session cookie. CyberLab uses an HttpOnly, SameSite cookie as the application session and immediately clears Firebase client persistence by using in-memory auth and signing the client out after session creation.

Firebase identity does not define CyberLab authorization. Local SQLite `UserRole -> Role` records remain the server-side source of truth for Student, Instructor, and Admin capabilities.

### SQLite + Prisma

SQLite is the local application system of record for application users/roles, labs, versions, attempts, progress, isolated environments, simulated resources, command/query history, validation, completions, flags, achievements, audit logs, assignments, and settings. Prisma provides relational access and transactions.

The SQLite database file remains on the application host and is never published through Cloudflare Tunnel.

### Lab engine

The lab engine owns lifecycle operations:

1. authorize the application user
2. resolve the latest published lab version
3. check prerequisites
4. create or load the authenticated user's isolated environment
5. persist simulator state transitions transactionally
6. reset deterministically from the published `initialState`
7. persist task progress without granting completion
8. validate actual environment state on submit in the validation phase
9. create completion + flag only from trusted server validation

An environment is unique across `(userId, labId, labVersionId)` and every mutation scopes by the authenticated user ID.

### Simulator engines

Simulator modules are independent of the UI. Each supported command declares syntax, parameters, required simulated permissions, state reads/writes, structured output, errors, and tests.

Host-shell execution is prohibited. Unsupported operations return explicit errors.

Adapters are intentionally separated:

- native CyberLab AWS simulator
- optional LocalStack adapter for explicitly supported APIs
- native CyberLab Azure simulator
- optional Azurite storage adapter
- explicitly authorized real-cloud adapters only when an administrator enables them

### KQL, Sentinel, and Defender XDR

The KQL subsystem is designed as parser -> AST -> type checks -> evaluator -> stored synthetic data. Sentinel and Defender XDR consume shared persisted synthetic security events where useful. They do not return canned investigation results.

## Security boundaries

- Firebase Authentication provides identity and verification/reset workflows.
- Firebase Admin verifies HttpOnly session cookies server-side.
- CyberLab RBAC is enforced from SQLite, never client claims.
- Zod validates trust-boundary inputs.
- Simulator commands use a whitelist/registry and never invoke the host shell.
- Student environment queries and mutations always scope by authenticated user ID.
- UI task actions can advance progress but cannot set `COMPLETED`, create completion records, or issue flags.
- Unique completion flags use cryptographically secure randomness and database uniqueness constraints.
- Server secrets live in environment variables/secret storage and never browser bundles.
- Sensitive administrative and simulator state-changing actions are auditable.

## Performance approach

- indexed access paths for progress, labs, histories, environments, and audit logs
- bounded/paginated histories
- short SQLite transactions around state transitions
- Server Components by default
- client components only for interactive workflows/editors
- Monaco/CodeMirror loaded dynamically in later phases
- virtualized event tables for large datasets
- no performance claims without measurement

## Deployment

Local Windows development is the first-class target. A future Cloudflare Tunnel maps only the web application port to HTTPS. The SQLite file, Firebase Admin credentials, and simulator internals remain private.
