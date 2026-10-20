import { performance } from "node:perf_hooks";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PERFORMANCE_BUDGETS_MS = {
  sqliteQueryP95: 150,
  managementOverviewP95: 300,
  historyPageP95: 250,
  apiMutationP95: 200,
} as const;

export async function measureOperation<T>(name: string, operation: () => Promise<T>, metadata?: Prisma.InputJsonObject) {
  const started = performance.now();
  let ok = false;
  try {
    const result = await operation();
    ok = true;
    return { result, durationMs: performance.now() - started };
  } finally {
    const durationMs = Math.max(0, Math.round((performance.now() - started) * 100) / 100);
    await prisma.auditLog.create({ data: { action: "performance.sample", targetType: "Performance", targetId: name, metadata: { name, durationMs, ok, ...(metadata ?? {}) } } }).catch(() => undefined);
  }
}

export function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export async function getPerformanceSummary(limit = 500) {
  const samples = await prisma.auditLog.findMany({ where: { action: "performance.sample" }, orderBy: { createdAt: "desc" }, take: Math.max(1, Math.min(2000, limit)) });
  const groups = new Map<string, number[]>();
  for (const sample of samples) {
    const metadata = sample.metadata && typeof sample.metadata === "object" && !Array.isArray(sample.metadata) ? sample.metadata as Record<string, unknown> : null;
    const name = typeof metadata?.name === "string" ? metadata.name : sample.targetId ?? "unknown";
    const duration = typeof metadata?.durationMs === "number" ? metadata.durationMs : null;
    if (duration === null) continue;
    const list = groups.get(name) ?? [];
    list.push(duration);
    groups.set(name, list);
  }
  return [...groups.entries()].map(([name, values]) => ({ name, count: values.length, p50: percentile(values, 50), p95: percentile(values, 95), max: Math.max(...values) })).sort((a, b) => b.p95 - a.p95);
}

export async function prunePerformanceSamples(retain = 2000) {
  const keep = await prisma.auditLog.findMany({ where: { action: "performance.sample" }, orderBy: { createdAt: "desc" }, skip: Math.max(1, retain), take: 1, select: { createdAt: true } });
  const cutoff = keep[0]?.createdAt;
  if (!cutoff) return 0;
  const result = await prisma.auditLog.deleteMany({ where: { action: "performance.sample", createdAt: { lte: cutoff } } });
  return result.count;
}
