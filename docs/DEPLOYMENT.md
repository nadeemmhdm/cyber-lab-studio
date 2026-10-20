# Deployment

This release is Windows-first and uses SQLite locally. The recommended public-access pattern is to keep the Next.js application bound to the local machine and expose only the web service through Cloudflare Tunnel.

## 1. Prepare the production process

Complete `GETTING-STARTED.md`, remove `INITIAL_ADMIN_EMAIL` after the first administrator is created, then run:

```powershell
.\scripts\windows-start.ps1
```

This builds the application and starts `next start` on `http://localhost:3000`.

Do not expose the SQLite file, Prisma Studio, local filesystem, or any internal development port to the Internet.

## 2. Install cloudflared

```powershell
winget install Cloudflare.cloudflared
cloudflared --version
```

Authenticate:

```powershell
cloudflared tunnel login
```

## 3. Create the tunnel

```powershell
cloudflared tunnel create cyberlab
```

Record the tunnel UUID and credentials file created by cloudflared.

Create a DNS route:

```powershell
cloudflared tunnel route dns cyberlab cyberlab.example.com
```

Copy `deploy/cloudflared/config.example.yml` to your local cloudflared config and replace the tunnel UUID, Windows username, and hostname.

## 4. Configure the public URL

Update `.env`:

```env
APP_URL="https://cyberlab.example.com"
```

In Firebase Authentication → Settings → Authorized domains, add `cyberlab.example.com`.

Restart CyberLab after changing `APP_URL`.

## 5. Run Cloudflare Tunnel

```powershell
cloudflared tunnel --config .\deploy\cloudflared\config.yml run cyberlab
```

Only the web origin `http://localhost:3000` should be routed. The example config ends with an HTTP 404 catch-all.

## 6. Recommended Cloudflare Access policy

CyberLab already performs its own Firebase authentication and role authorization. For an Internet-facing administrative installation, add Cloudflare Access as an additional perimeter control for privileged paths.

Recommended protected paths:

- `/admin*`
- `/setup*`
- optionally `/instructor*`

Allow only trusted organization identities or explicitly approved administrator addresses. Do not replace CyberLab's internal role checks with Access; use both layers.

## 7. Firewall and host guidance

- Keep inbound access to port 3000 blocked from the public Internet; cloudflared connects outbound.
- Do not publish SMB/RDP unless separately secured for host administration.
- Keep the Firebase Admin service-account values only in the server `.env`.
- Run CyberLab under a non-administrator Windows account when practical.
- Back up SQLite before upgrading.
- Keep Node.js and cloudflared patched.

## 8. Public verification

After tunnel startup:

1. Open the public HTTPS URL in a private browser session.
2. Register/login and verify the Firebase email flow.
3. Confirm lab catalogue and one training workspace load.
4. Confirm `/admin` rejects non-admin users.
5. Confirm the Support page can submit a ticket.
6. Confirm the administrator sees and can reply to that ticket.
7. Confirm `/api/health` reports a healthy database.

## Architecture boundary

The public endpoint serves the CyberLab web application. AWS/Azure-compatible training commands, KQL evaluation, Sentinel workflows, and Defender workflows operate on isolated CyberLab state and datasets. The default deployment does not forward learner commands to a host shell or a production cloud account.