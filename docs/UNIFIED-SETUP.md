# Unified Setup, Update and Tunnel Tool

CyberLab Studio Pro ships one cross-platform setup system with Windows and Linux bootstrap wrappers around the same Node CLI.

## One command

### Windows

Open Command Prompt or PowerShell in the repository folder and run:

```bat
cyberlab.cmd
```

`cyberlab.cmd` automatically invokes PowerShell with a process-local execution-policy bypass. If Node.js 24.12+ is not available, CyberLab downloads the official Node.js 24.12.0 Windows archive into `.cyberlab/runtime`, verifies it against Node.js `SHASUMS256.txt`, and uses that repo-local runtime. Administrator rights are not required for the local runtime.

### Linux

```bash
bash ./cyberlab.sh
```

If Node.js 24.12+ is not available, the script downloads the official Node.js 24.12.0 Linux archive for x64 or arm64, verifies its SHA-256 checksum against Node.js `SHASUMS256.txt`, extracts it into `.cyberlab/runtime`, and continues without replacing the system Node installation.

## Interactive menu

Running the command without arguments opens:

1. Setup / repair
2. Web setup wizard
3. Update CyberLab + packages
4. Start development server
5. Start production server
6. Configure Cloudflare Tunnel
7. Doctor
8. Exit

The common CLI is `scripts/cyberlab.mjs`.

## First-time setup

Windows:

```bat
cyberlab.cmd setup
```

Linux:

```bash
bash ./cyberlab.sh setup
```

The setup flow:

- validates Node/npm and the repository lockfile;
- installs the locked dependency graph with `npm ci`;
- checks direct packages for updates;
- automatically applies same-major direct-package updates and refreshes the lockfile;
- never forces major-version dependency upgrades;
- runs `npm audit --audit-level=moderate` and, when needed, `npm audit fix` without `--force`;
- collects required `.env` values interactively;
- accepts a Firebase service-account JSON file path so Admin SDK values do not need to be copied field by field;
- generates `SESSION_SECRET` and the one-time admin bootstrap token automatically;
- runs Prisma generate/schema push and seeds roles + all labs;
- optionally provisions the first Administrator account directly from the same setup command;
- removes the one-time setup token from `.env` after successful first-admin provisioning;
- optionally starts Cloudflare Tunnel setup;
- optionally starts CyberLab.

### Firebase values

The wizard collects:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

It also manages:

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `INITIAL_ADMIN_SETUP_TOKEN`
- `INITIAL_ADMIN_EMAIL`

Google identity remains configured in Firebase Authentication. CyberLab does not require application-level `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`.

## Local setup web UI

The same tool can expose a setup-only UI bound to localhost:

Windows:

```bat
cyberlab.cmd web
```

Linux:

```bash
bash ./cyberlab.sh web
```

It opens `http://127.0.0.1:3210` and is intentionally bound only to the loopback interface. The page can collect Firebase Web values, a Firebase service-account JSON document, administrator credentials, and package-update preference. The page writes `.env`, prepares SQLite/Prisma, and provisions the first Administrator when requested.

The local wizard uses a random per-run setup token and is not a public deployment endpoint. Stop it with `Ctrl+C` after setup.

## Update CyberLab

Windows:

```bat
cyberlab.cmd update
```

Linux:

```bash
bash ./cyberlab.sh update
```

The update flow:

1. performs `git pull --ff-only` only when the repository is a clean Git checkout;
2. skips source pulling instead of overwriting local changes;
3. restores the lockfile dependency graph;
4. detects outdated direct dependencies;
5. automatically updates direct dependencies when the latest version remains in the same major line;
6. reports major-version upgrades for release review instead of silently applying them;
7. runs the dependency audit without force upgrades;
8. regenerates Prisma, applies the SQLite schema and reseeds idempotent platform data.

When using a GitHub ZIP instead of a Git checkout, source-code update is intentionally skipped. Download a fresh release ZIP when a new release is published.

## Doctor

```bat
cyberlab.cmd doctor
```

or

```bash
bash ./cyberlab.sh doctor
```

Doctor checks Node/npm, Git availability, lockfile, installed packages, `.env`, required Firebase/environment values, and Cloudflare Tunnel availability.

## Cloudflare Tunnel

Run:

```bat
cyberlab.cmd tunnel
```

or

```bash
bash ./cyberlab.sh tunnel
```

The tool offers:

- **Quick Tunnel** — a temporary `trycloudflare.com` public URL pointing only to `http://localhost:3000`.
- **Named Tunnel** — Cloudflare browser login, tunnel creation/reuse, DNS route, `deploy/cloudflared/config.yml` generation, and automatic `APP_URL=https://<hostname>` update.

If `cloudflared` is not already installed, CyberLab downloads the official Cloudflare release binary into `.cyberlab/bin` and records a SHA-256 fingerprint in the terminal output.

After a named hostname is configured, add that hostname to **Firebase Authentication → Authorized domains** before public sign-in.

CyberLab must never tunnel SQLite files, Prisma Studio, filesystem shares, or unrelated local ports.

## Direct CLI commands

When Node 24.12+ is already available, these npm aliases are also available:

```bash
npm run cyberlab
npm run setup
npm run setup:web
npm run doctor
npm run update
npm run tunnel
```

For first installation, prefer `cyberlab.cmd` on Windows or `bash ./cyberlab.sh` on Linux because those wrappers can bootstrap a missing/old Node runtime.
