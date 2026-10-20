# SQLite + Firebase migration

CyberLab Studio Pro now uses SQLite through Prisma for application persistence and Firebase Authentication for identity.

The PostgreSQL/Docker development requirement and custom Google OAuth/password-token implementation have been retired. Firebase Web SDK handles Google and email/password identity; Firebase sends verification/password-reset links; Firebase Admin verifies identity and creates the HttpOnly application session cookie.

This migration does not weaken server authorization: CyberLab roles, suspensions, lab ownership, progress, simulator state, validation, flags, and audit logs remain server-side in the local application database.
