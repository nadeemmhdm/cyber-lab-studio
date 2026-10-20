# CyberLab Studio Pro Architecture

## Goals

CyberLab Studio Pro is a local-first, multi-user cybersecurity learning platform. The application separates web concerns, authorization, lab orchestration, cloud simulation, query execution, detection logic, and persistence so that no UI action can directly manufacture completion state or a flag.

## Runtime boundaries

### Web application

Next.js App Router provides the UI and server routes. Browser code may request supported operations but does not receive database credentials, secret validation rules, flag-generation material, or real cloud credentials.

### PostgreSQL

PostgreSQL is the system of record for users, roles, sessions, labs, versions, attempts, progress, isolated environments, simulated resources, command/query history, validation, completions, flags, achievements, audit logs, assignments, and settings.

The database binds to loopback in the local Docker configuration. It must not be routed through Cloudflare Tunnel.

### Lab engine

The lab engine owns lifecycle operations:

1. authorize user
2. resolve published lab version
3. create or load the user's isolated environment
4. apply supported simulator operations through a registry
5. persist state transitions transactionally
6. validate actual environment state on submit
7. write the attempt and validation result
8. create completion + flag in one transaction on success

### Simulator engines

Simulator modules are independent of the UI. Each command family must declare syntax, parameters, required simulated permissions, state reads/writes, structured output, errors, and tests.

Host-shell execution is explicitly prohibited. Unsupported operations return explicit `UnsupportedOperation`-style errors.

Planned adapters:

- native CyberLab AWS simulator (default)
- optional LocalStack adapter for explicitly supported AWS APIs
- native CyberLab Azure simulator (default)
- optional Azurite storage adapter
- explicitly authorized real-cloud adapters only when an administrator enables them

### KQL engine

The KQL subsystem is designed as parser -> AST -> type checks -> evaluator -> result metadata. It executes against stored synthetic datasets rather than canned result objects.

### Sentinel and Defender XDR

Sentinel and Defender XDR consume shared synthetic security datasets where useful. Detection rules must evaluate stored events. Incidents, alerts, entities, timelines, status changes, and investigation notes are persisted.

## Security boundaries

- Argon2id for password hashing.
- HttpOnly secure sessions; never localStorage authentication tokens.
- Server-side RBAC for privileged operations.
- Zod validation at trust boundaries.
- Command whitelist/registry; never pass simulator input to the host shell.
- Student environment queries always scope by authenticated user ID.
- Unique completion flags use cryptographically secure randomness and database uniqueness constraints.
- Secret values live in environment variables or external secret storage, not browser bundles.
- Audit sensitive administrative and simulator state-changing actions.

## Data isolation

A lab environment is unique across `(userId, labId, labVersionId)`. Every resource belongs to an environment. Commands resolve the authenticated user's environment before resource lookup or mutation. Reset recreates deterministic versioned initial state.

## Performance approach

- indexed access paths for user progress, sessions, lab catalogue, histories, environments, and audit logs
- bounded/paginated command and query histories
- PostgreSQL connection pooling in production
- Server Components by default
- client components only for interactive filtering/editors
- Monaco/CodeMirror loaded dynamically in later simulator phases
- virtualized security event tables for large datasets
- no performance claims without measurement

## Deployment

Local Windows development is the first-class target. A future Cloudflare Tunnel maps only the local web application port to HTTPS. PostgreSQL, Docker API, and simulator internals remain private.
