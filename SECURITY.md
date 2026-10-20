# Security Policy

## Reporting a vulnerability

Please do not disclose exploitable vulnerabilities in a public issue. Report them privately to the repository owner with enough detail to reproduce the issue safely.

Include:

- affected component and version/commit
- impact
- reproduction steps using test data
- relevant logs with secrets removed
- suggested mitigation if known

Never include real passwords, API keys, session tokens, cloud credentials, student data, or database dumps in a report.

## Security invariants

CyberLab Studio Pro must preserve these rules:

1. PostgreSQL is private and is never exposed through Cloudflare Tunnel.
2. Authentication tokens are not stored in browser localStorage.
3. Passwords use Argon2id.
4. Authorization is enforced server-side.
5. Student lab state is scoped to the authenticated student.
6. Simulator commands never execute through a host shell.
7. Unsupported commands fail explicitly.
8. Completion is based on server-side validation of stored state.
9. Flags are generated server-side with cryptographically secure randomness and are not revealed before verified completion.
10. Real-cloud adapters are disabled by default and require explicit administrator enablement plus user authorization.
11. Secrets belong in environment variables/secret stores and must never be committed.
12. Sensitive administrative and state-changing actions are auditable.

## Supported versions

Until the first stable release, security fixes are applied to the default branch only.
