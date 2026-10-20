# Unified Remote Installer, Setup and Update

CyberLab Studio Pro ships a true one-line remote installer for Windows and Linux. The user does not need to clone the repository first.

## Windows PowerShell

Copy and paste:

```powershell
iex (irm 'https://raw.githubusercontent.com/nadeemmhdm/cyber-lab-studio/main/install.ps1')
```

## Windows Command Prompt

Copy and paste:

```bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm 'https://raw.githubusercontent.com/nadeemmhdm/cyber-lab-studio/main/install.ps1')"
```

## Linux

Copy and paste:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/nadeemmhdm/cyber-lab-studio/main/install.sh)"
```

The Linux form uses command substitution instead of `curl | bash` so Bash keeps terminal stdin available for the interactive configuration questions.

## Installation directory

Default locations:

- Windows: `%USERPROFILE%\CyberLab-Studio`
- Linux: `~/CyberLab-Studio`

Advanced users may override the install location through `InstallDir` on Windows or `CYBERLAB_INSTALL_DIR` on Linux.

## Fresh-install sequence

The remote installer performs the following flow:

1. checks for Git;
2. installs Git using a supported Windows/Linux package manager when Git is absent;
3. clones the public CyberLab repository from `main`;
4. invokes the OS bootstrap wrapper;
5. checks Node.js 24.12+;
6. when Node is missing/old, downloads official Node.js 24.12.0 into `.cyberlab/runtime`;
7. verifies the Node.js archive against the official `SHASUMS256.txt` before use;
8. runs `npm ci` to install the tested package graph;
9. checks `npm outdated`;
10. applies non-persistent package updates allowed by the tested package ranges;
11. reports major-version jumps instead of silently forcing them;
12. runs `npm audit --audit-level=moderate`;
13. collects Firebase Web configuration in the terminal;
14. accepts a Firebase Admin service-account JSON path or manual Admin SDK values;
15. generates local session/bootstrap secrets;
16. writes `.env` locally;
17. generates Prisma, pushes the SQLite schema and seeds the platform/labs;
18. asks for first-Administrator email, display name and password;
19. creates the Firebase user and CyberLab Administrator role directly from the terminal;
20. deletes the one-time bootstrap token from `.env` after successful Administrator creation;
21. asks which Cloudflare/public-access mode to use;
22. downloads `cloudflared` locally if needed;
23. configures the selected tunnel mode;
24. builds CyberLab;
25. starts CyberLab and keeps the tunnel attached to the running process.

The installer does not expose SQLite, Prisma Studio or the host shell.

## Firebase values collected

The terminal setup collects:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- Firebase service-account JSON path, or:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`

The installer generates/manages:

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `INITIAL_ADMIN_SETUP_TOKEN`
- `INITIAL_ADMIN_EMAIL`

CyberLab does not require application-level `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`. Google sign-in is configured through Firebase Authentication.

## Administrator creation

The installer asks for:

- Administrator email
- Administrator display name
- Administrator password

The account is created through Firebase Admin and the CyberLab Administrator role is written transactionally to SQLite. After successful creation, the one-time setup token is removed from `.env`.

If an Administrator already exists, first-run provisioning is skipped instead of creating a duplicate Administrator.

## Cloudflare modes

### Quick Tunnel

Quick Tunnel is the default easy public-access option. It:

- requires no Cloudflare account;
- downloads `cloudflared` locally when needed;
- starts a temporary tunnel to `http://localhost:3000`;
- reads the generated `https://<random>.trycloudflare.com` URL;
- writes the generated URL to `APP_URL`;
- attempts to add that hostname to Firebase Authentication Authorized Domains;
- starts CyberLab and keeps the tunnel running.

The URL is temporary and may change after the process restarts.

### Named Tunnel

Named Tunnel is for a stable custom hostname such as `lab.example.com`.

The installer:

- opens Cloudflare authorization in the browser once;
- creates/reuses the named tunnel;
- configures the DNS route;
- writes `deploy/cloudflared/config.yml`;
- updates `APP_URL`;
- attempts to update Firebase Authorized Domains;
- starts CyberLab and the named tunnel.

Cloudflare browser authorization is intentionally not bypassed.

### Firebase Authorized Domains

The installer attempts to update Firebase Authentication Authorized Domains using the configured Firebase service account. Automatic configuration requires permission equivalent to `firebaseauth.configs.update`.

If the project/service account does not permit that operation, setup continues and prints the exact public hostname that must be added manually in Firebase Authentication settings.

## Re-running the same one-line command

The exact same PowerShell/CMD/Linux one-liner is also the updater.

For an existing installation it:

1. refuses to overwrite uncommitted Git changes;
2. fetches `main`;
3. performs `git pull --ff-only`;
4. checks and installs packages;
5. checks package updates and audit state;
6. regenerates Prisma;
7. applies the SQLite schema;
8. reseeds idempotent platform data;
9. opens the normal CyberLab management menu.

Major dependency upgrades are deliberately not forced by the installer. They should arrive through a tested CyberLab repository release.

## Installed management CLI

After installation, the management wrappers remain available.

Windows:

```bat
cd %USERPROFILE%\CyberLab-Studio
cyberlab.cmd
```

Linux:

```bash
cd ~/CyberLab-Studio
bash ./cyberlab.sh
```

The menu includes:

1. Setup / repair
2. Web setup wizard
3. Update CyberLab + packages
4. Start development server
5. Start production server
6. Configure Cloudflare Tunnel
7. Doctor
8. Exit

## Local setup web UI

For an installed checkout:

Windows:

```bat
cyberlab.cmd web
```

Linux:

```bash
bash ./cyberlab.sh web
```

The tool opens a local-only setup UI on `http://127.0.0.1:3210`. It is bound only to loopback and is not exposed through the CyberLab tunnel.

It can collect Firebase Web configuration, Firebase service-account JSON, first-Administrator credentials and package-update preference.

## Doctor

Windows:

```bat
cyberlab.cmd doctor
```

Linux:

```bash
bash ./cyberlab.sh doctor
```

Doctor checks runtime, npm, Git, lockfile, installed packages, environment values and Cloudflare availability.

## Security behavior

- Installer secrets stay in local `.env` and are not committed.
- The Node fallback runtime is checksum-verified.
- The installer does not use `npm audit fix --force`.
- Major dependency jumps are held for a tested repository release.
- Git updates use fast-forward only and refuse dirty worktrees.
- Cloudflare exposes only the web service on localhost port 3000.
- Firebase Admin credentials stay server-side.
