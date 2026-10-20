# Backup and Restore

CyberLab Studio Pro v1.0.0 uses SQLite as the application database. Backups therefore protect users, roles, lab progress, environments, command/query history, validation results, flags, achievements, audit logs, and support conversations stored in that database.

## Create a backup

Stop the production process first so SQLite has no active WAL/SHM state, then run:

```powershell
npm run backup
```

Backups are written to `backups/` with a timestamped `.bak` filename.

The backup script refuses non-SQLite database URLs and warns if SQLite WAL/SHM files are present.

## Restore a backup

1. Stop CyberLab completely.
2. Verify the backup filename and timestamp.
3. Keep a second external copy before restore.
4. Run:

```powershell
$env:CONFIRM_RESTORE="YES"
npm run restore -- backups\dev.db.2026-10-20T00-00-00-000Z.bak
Remove-Item Env:CONFIRM_RESTORE
```

Before replacing the database, the restore utility creates a timestamped safety copy of the current database. It blocks restoration while WAL/SHM files are active.

## Post-restore verification

```powershell
npx prisma validate
npm run db:generate
npm run test:e2e
npm run build
```

Then start CyberLab and verify:

- administrator login;
- `/api/health` database status;
- lab catalogue and progress;
- a learner workspace;
- support tickets;
- audit history.

## Operational policy

For a public installation, take a backup before application upgrades and keep multiple dated copies outside the application folder. Protect backups as production data because they contain user records and security-training state.