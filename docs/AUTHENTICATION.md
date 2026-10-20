# Authentication and RBAC

CyberLab Studio Pro uses Firebase Authentication for identity and SQLite/Prisma for application users, roles, authorization, progress, and simulator state.

## Supported sign-in methods

- Email/password signup and sign-in through Firebase Authentication.
- Firebase email-verification links before CyberLab creates an application session.
- Firebase password-reset email links.
- Google sign-in through the Firebase Web SDK `GoogleAuthProvider` popup flow.

CyberLab does **not** implement a separate Google OAuth client flow and does not use `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` environment variables. Enable Google and Email/Password providers in the Firebase Console instead.

## Server sessions

The browser signs in with Firebase using in-memory persistence. A verified Firebase ID token is exchanged at `/api/auth/session` for a Firebase Admin session cookie.

- The application cookie is HttpOnly, SameSite=Lax, and Secure in production.
- Session creation requires a recent Firebase sign-in and a double-submit CSRF token issued by `/api/auth/csrf`.
- Server Components and API routes verify the Firebase session cookie with Firebase Admin before loading the matching SQLite application user.
- The browser signs out of the Firebase client immediately after the server session is established, so localStorage is not used as CyberLab authentication state.
- `Sign out everywhere` revokes Firebase refresh tokens and clears the current HttpOnly cookie.

## Application user and RBAC synchronization

After Firebase verifies a user, CyberLab synchronizes the Firebase UID, verified email, and display name into the local `User` row. New users receive the Student role server-side. `UserRole -> Role` remains the source of truth for CyberLab authorization; client-provided role claims are never trusted.

Suspended local users cannot create an application session even if their Firebase credential is otherwise valid.

## Required configuration

Browser-safe Firebase project configuration:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Server-only Firebase Admin service account configuration:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Never expose the Admin service-account private key to the browser or commit it to source control.
