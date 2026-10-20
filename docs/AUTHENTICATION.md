# Authentication and RBAC

CyberLab Studio Pro uses database-backed opaque sessions and server-side authorization.

## Password authentication

- Passwords are hashed with Argon2id.
- Registration assigns the Student role on the server.
- Password login is blocked until the email is verified.
- Suspended users cannot establish a session.
- Authentication cookies are HttpOnly, SameSite=Lax, Secure in production, and expire after seven days.
- Only SHA-256 hashes of session tokens are stored in PostgreSQL.

## Email verification and password reset

Verification links expire after 24 hours. Password-reset links expire after 30 minutes. Raw tokens are sent to the user but never persisted; PostgreSQL stores only token hashes in `PlatformSetting` records. Consuming a token deletes it so it cannot be reused.

Set `RESEND_API_KEY` and `AUTH_EMAIL_FROM` for real email delivery. In non-production environments the link is also logged/returned for local testing.

## Brute-force protection

Registration, login, verification resend, and password-reset endpoints use PostgreSQL-backed rate windows keyed by HMAC-hashed IP/email identifiers. Successful password login clears its login throttle record.

## RBAC

`UserRole -> Role` is the source of truth. UI role claims are never accepted as authorization. Server Components and server routes use `getCurrentSession`, `requireUser`, or `requireRole` before protected data access.

## Google login

Google OAuth 2.0 / OpenID Connect is optional. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; the implementation uses state, nonce, PKCE, ID-token signature verification, issuer/audience validation, and verified-email matching.

Callback URL: `${APP_URL}/api/auth/google/callback`

## Security notes

- Authentication state is never stored in localStorage.
- Mutation endpoints reject cross-origin browser requests.
- Session IP data is HMAC-hashed rather than stored as raw addresses.
- Logout revokes the current database session; logout-all revokes every active session for the account.
