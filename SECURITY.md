# Security Policy

## Reporting a vulnerability

Please do not disclose exploitable vulnerabilities in a public issue. Report them privately to the repository owner with enough detail to reproduce the issue safely.

Include the affected component/version, impact, safe reproduction steps, relevant logs with secrets removed, and suggested mitigation if known. Never include real passwords, Firebase Admin private keys, session cookies, cloud credentials, student data, or database copies.

## Security invariants

CyberLab Studio Pro must preserve these rules:

1. Firebase Admin credentials and the SQLite database remain server-side and are never exposed through the browser or Cloudflare Tunnel.
2. CyberLab authentication state is an HttpOnly server session cookie, not localStorage.
3. Google and email/password identity, email verification, and password reset are handled by Firebase Authentication.
4. CyberLab authorization is enforced server-side from local roles and suspension state.
5. Session creation requires a recent verified Firebase sign-in and CSRF validation.
6. Student lab state is scoped to the authenticated student for every read and mutation.
7. Simulator commands never execute through a host shell.
8. Unsupported commands fail explicitly.
9. Client task actions cannot set completion or issue flags.
10. Completion is based on server-side validation of stored state.
11. Flags are generated server-side with cryptographically secure randomness and are not revealed before verified completion.
12. Real-cloud adapters are disabled by default and require explicit administrator enablement plus user authorization.
13. Secrets belong in environment variables/secret stores and must never be committed.
14. Sensitive administrative and state-changing actions are auditable.

## Supported versions

Until the first stable release, security fixes are applied to the default branch and the active development branch.
