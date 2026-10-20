import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";

function databasePath() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  if (!url.startsWith("file:")) throw new Error("Backup supports the SQLite file: DATABASE_URL used by this release.");
  const value = url.slice(5);
  if (isAbsolute(value)) return value;
  return resolve(process.cwd(), "prisma", value);
}

const source = databasePath();
if (!existsSync(source)) throw new Error(`SQLite database not found: ${source}`);
if (existsSync(`${source}-wal`) || existsSync(`${source}-shm`)) console.warn("Warning: SQLite WAL/SHM files exist. Stop the app before making a release backup so the database is fully checkpointed.");
const outDir = resolve(process.cwd(), "backups");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = resolve(outDir, `${basename(source)}.${stamp}.bak`);
copyFileSync(source, target);
console.log(`Backup created: ${target}`);
console.log(`Source directory: ${dirname(source)}`);
