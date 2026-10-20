import { copyFileSync, existsSync } from "node:fs";
import { basename, isAbsolute, resolve } from "node:path";

function databasePath() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  if (!url.startsWith("file:")) throw new Error("Restore supports the SQLite file: DATABASE_URL used by this release.");
  const value = url.slice(5);
  if (isAbsolute(value)) return value;
  return resolve(process.cwd(), "prisma", value);
}

const backupArg = process.argv[2];
if (!backupArg) throw new Error("Usage: CONFIRM_RESTORE=YES npm run restore -- <backup-file>");
if (process.env.CONFIRM_RESTORE !== "YES") throw new Error("Restore blocked. Set CONFIRM_RESTORE=YES after stopping the application and verifying the backup file.");
const backup = resolve(process.cwd(), backupArg);
if (!existsSync(backup)) throw new Error(`Backup file not found: ${backup}`);
const target = databasePath();
if (existsSync(`${target}-wal`) || existsSync(`${target}-shm`)) throw new Error("SQLite WAL/SHM files exist. Stop CyberLab before restoring the database.");
if (existsSync(target)) {
  const safety = `${target}.pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
  copyFileSync(target, safety);
  console.log(`Current database safety copy: ${safety}`);
}
copyFileSync(backup, target);
console.log(`Restored ${basename(backup)} to ${target}`);
