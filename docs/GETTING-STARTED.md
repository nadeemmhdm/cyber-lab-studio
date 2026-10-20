# Getting Started

CyberLab Studio Pro v1.0.0 is designed to run locally on Windows first and can then be published through Cloudflare Tunnel.

## Requirements

- Windows 10/11 or another supported Node.js host.
- Node.js 24.12 or newer.
- Git, if cloning the repository.
- A Firebase project with Email/Password and Google Authentication providers enabled.
- A Firebase Admin service account for server-side session verification.

## Download

Clone the repository:

```powershell
git clone https://github.com/nadeemmhdm/cyber-lab-studio.git
cd cyber-lab-studio
```

Or use **Code → Download ZIP** on GitHub, extract the archive, and open PowerShell inside the extracted folder.

## Windows first-run setup

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\windows-setup.ps1
```

The script installs the locked npm graph, generates Prisma, creates the SQLite schema, seeds all 30 labs and curriculum, and creates `.env` from `.env.example` if necessary.

## Configure Firebase

In Firebase Console:

1. Create/select a Firebase project.
2. Authentication → Sign-in method → enable **Email/Password**.
3. Enable **Google** as a provider.
4. Add your local and public hostnames to **Authorized domains**.
5. Copy the Firebase Web configuration into the `NEXT_PUBLIC_FIREBASE_*` values in `.env`.
6. Create a Firebase Admin service account and fill `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` on the server only.

CyberLab does not require application-level `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`; Google sign-in is configured through Firebase.

## First administrator account

Set a one-time setup token in `.env` before the first administrator is created:

```env
INITIAL_ADMIN_SETUP_TOKEN="replace-with-at-least-32-random-characters"
INITIAL_ADMIN_EMAIL="admin@example.com"
```

The email restriction is optional. Then:

1. Start CyberLab with `npm run dev`.
2. Open `http://localhost:3000/setup`.
3. Enter the setup token, administrator display name, email, and strong password.
4. Confirm `/admin` opens.
5. Remove `INITIAL_ADMIN_SETUP_TOKEN` from `.env` and restart the application.

The setup route refuses another first-admin provisioning after an Administrator exists. Public student self-registration is disabled. Administrators create Instructor accounts; an Instructor chooses a seat count and expiry to generate one enrollment link. Each student opens that link and chooses their own username/password until the seat limit is consumed.

## Start locally

Development:

```powershell
npm run dev
```

Production-style local run:

```powershell
.\scripts\windows-start.ps1
```

Open `http://localhost:3000`.

## Roles

- **Student** — joins through an Instructor enrollment link, uses username/password sign-in, starts labs, keeps isolated progress/history, earns flags/achievements, opens per-lab doubts, and submits support reports.
- **Instructor** — reviews assigned learners and progress according to server-side assignment scope.
- **Administrator** — manages users/roles/suspension, curriculum controls, platform policy, maintenance/quotas, health/audit/performance, and support conversations.

## Training environment behavior

AWS, Azure, Sentinel, KQL, and Defender XDR workflows run inside isolated stateful CyberLab environments. Supported commands and actions reproduce the training workflow and persist state per learner. Inputs are never forwarded to a host shell and the default release does not contact a production AWS or Azure account.

See `DEPLOYMENT.md` for public HTTPS access with Cloudflare Tunnel.