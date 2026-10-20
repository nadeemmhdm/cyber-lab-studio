import { prisma } from "@/lib/prisma";
import { measureOperation, PERFORMANCE_BUDGETS_MS } from "@/lib/observability/performance";

export type SqliteProfile = {
  version: string;
  journalMode: string;
  foreignKeys: number;
  busyTimeout: number;
  userHistoryPlan: string[];
  sampleQueryMs: number;
  withinBudget: boolean;
};

export async function profileSqlite(): Promise<SqliteProfile> {
  const [versionRows, journalRows, foreignRows, timeoutRows] = await Promise.all([
    prisma.$queryRaw<Array<{ version: string }>>`SELECT sqlite_version() AS version`,
    prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>("PRAGMA journal_mode"),
    prisma.$queryRawUnsafe<Array<{ foreign_keys: number }>>("PRAGMA foreign_keys"),
    prisma.$queryRawUnsafe<Array<{ timeout: number }>>("PRAGMA busy_timeout"),
  ]);
  const plan = await prisma.$queryRawUnsafe<Array<{ detail: string }>>(
    "EXPLAIN QUERY PLAN SELECT id, command, createdAt FROM TerminalHistory WHERE userId = ? ORDER BY createdAt DESC LIMIT 25",
    "profile-user",
  );
  const measured = await measureOperation("sqlite.history.sample", () => prisma.terminalHistory.findMany({ where: { userId: "profile-user" }, orderBy: { createdAt: "desc" }, take: 25, select: { id: true } }));
  return {
    version: versionRows[0]?.version ?? "unknown",
    journalMode: journalRows[0]?.journal_mode ?? "unknown",
    foreignKeys: Number(foreignRows[0]?.foreign_keys ?? 0),
    busyTimeout: Number(timeoutRows[0]?.timeout ?? 0),
    userHistoryPlan: plan.map((row) => row.detail),
    sampleQueryMs: measured.durationMs,
    withinBudget: measured.durationMs <= PERFORMANCE_BUDGETS_MS.sqliteQueryP95,
  };
}
