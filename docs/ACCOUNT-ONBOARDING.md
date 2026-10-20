# Account and Classroom Onboarding

CyberLab Studio Pro v1.0.0 uses administrator-controlled account provisioning. Public student self-signup is disabled.

## First administrator

Set a random `INITIAL_ADMIN_SETUP_TOKEN` of at least 32 characters and optionally `INITIAL_ADMIN_EMAIL`. Start the application and open `/setup`. The setup form creates the Firebase Authentication identity and local Administrator role together. After success, remove the setup token and restart. The route refuses another first-admin provisioning once an Administrator exists.

## Instructors

Administrators create Instructor accounts from the Admin control center. Administrators can manage roles, suspension, and password reset for Student, Instructor, and Administrator accounts. Password reset revokes active Firebase refresh tokens.

## Student enrollment links

An Instructor selects a seat count and expiry and generates one enrollment link. Raw invite tokens are not stored in SQLite; only a digest is retained. Each Student opens the link and chooses a unique username and password. Seat consumption and instructor assignment are transactional, so the link cannot create more accounts than its configured capacity.

Student username sign-in uses the username field shown in the UI. The internal Firebase address used to back username accounts is an implementation detail and is not presented as the learner identity.

## Sign-in cooldown

CyberLab tracks repeated password failures against the submitted identifier and network source. Cooldown increases after repeated failures, while Firebase abuse protection remains an additional control. A successful sign-in clears the CyberLab failure counter.

## TOTP two-factor authentication

Users can enroll Firebase TOTP MFA from Profile. The QR code is rendered locally in the browser/application path; the TOTP secret is not sent to a third-party QR service. When Firebase requires MFA during sign-in, CyberLab resolves the real TOTP second-factor challenge before creating the HttpOnly server session.

## Classroom support

Students can use **Ask a Doubt** from a lab workspace. A selected screen/window can be captured through the browser or a PNG/JPEG/WebP screenshot under 2 MB can be uploaded. The thread and screenshot are authorized to the Student, assigned Instructor, and Administrators only. Instructor and Student can continue the conversation until the thread is closed.

Generic platform/account reports remain available through `/support`, with private reporter conversations and Administrator replies.
