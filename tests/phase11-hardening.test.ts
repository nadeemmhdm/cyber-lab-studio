import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sameOrigin } from "@/lib/auth/security";
import { measureOperation, percentile, PERFORMANCE_BUDGETS_MS } from "@/lib/observability/performance";
import { profileSqlite } from "@/lib/observability/sqlite";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, readJsonLimited, RequestGuardError, resetRateLimitsForTests } from "@/lib/security/request-guard";

const originalAppUrl = process.env.APP_URL;

beforeEach(() => {
  resetRateLimitsForTests();
  process.env.APP_URL = "http://localhost:3000";
});

afterAll(async () => {
  if (originalAppUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = originalAppUrl;
  await prisma.auditLog.deleteMany({ where: { action: "performance.sample", targetId: { startsWith: "phase11." } } });
  await prisma.$disconnect();
});

describe("Phase 11 performance, security, and accessibility hardening", () => {
  it("enforces deterministic bounded rate limits", () => {
    expect(consumeRateLimit("user-a", 2, 1000, 1000).allowed).toBe(true);
    expect(consumeRateLimit("user-a", 2, 1000, 1100).allowed).toBe(true);
    const blocked = consumeRateLimit("user-a", 2, 1000, 1200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(consumeRateLimit("user-a", 2, 1000, 2101).allowed).toBe(true);
  });

  it("rejects request bodies by actual UTF-8 byte size", async () => {
    const ok = new Request("http://localhost:3000/api/test", { method: "POST", body: JSON.stringify({ value: "ok" }), headers: { "Content-Type": "application/json" } });
    await expect(readJsonLimited(ok, 64)).resolves.toEqual({ value: "ok" });
    const tooLarge = new Request("http://localhost:3000/api/test", { method: "POST", body: JSON.stringify({ value: "😀".repeat(40) }), headers: { "Content-Type": "application/json" } });
    await expect(readJsonLimited(tooLarge, 64)).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE", status: 413 } satisfies Partial<RequestGuardError>);
  });

  it("requires same-origin evidence for unsafe methods", () => {
    expect(sameOrigin(new Request("http://localhost:3000/api/test", { method: "GET" }))).toBe(true);
    expect(sameOrigin(new Request("http://localhost:3000/api/test", { method: "POST", headers: { Origin: "http://localhost:3000", "Sec-Fetch-Site": "same-origin" } }))).toBe(true);
    expect(sameOrigin(new Request("http://localhost:3000/api/test", { method: "POST", headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" } }))).toBe(false);
    expect(sameOrigin(new Request("http://localhost:3000/api/test", { method: "POST" }))).toBe(false);
  });

  it("computes percentiles and records measured SQLite operations", async () => {
    expect(percentile([1, 2, 3, 4, 5], 95)).toBe(5);
    const measured = await measureOperation("phase11.sqlite.test", () => prisma.$queryRaw<Array<{ value: number }>>`SELECT 1 AS value`);
    expect(measured.result[0]?.value).toBe(1);
    expect(measured.durationMs).toBeLessThan(1000);
    const sample = await prisma.auditLog.findFirst({ where: { action: "performance.sample", targetId: "phase11.sqlite.test" }, orderBy: { createdAt: "desc" } });
    expect(sample).not.toBeNull();
  });

  it("profiles SQLite query plans within a measured safety budget", async () => {
    const profile = await profileSqlite();
    expect(profile.version).not.toBe("unknown");
    expect(profile.userHistoryPlan.length).toBeGreaterThan(0);
    expect(profile.sampleQueryMs).toBeLessThan(1000);
  });

  it("declares explicit performance budgets", () => {
    expect(PERFORMANCE_BUDGETS_MS.sqliteQueryP95).toBeGreaterThan(0);
    expect(PERFORMANCE_BUDGETS_MS.managementOverviewP95).toBeLessThanOrEqual(500);
    expect(PERFORMANCE_BUDGETS_MS.historyPageP95).toBeLessThanOrEqual(500);
    expect(PERFORMANCE_BUDGETS_MS.apiMutationP95).toBeLessThanOrEqual(500);
  });

  it("ships CSP, clickjacking, MIME, HSTS, and permissions hardening", () => {
    const source = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    for (const requirement of ["Content-Security-Policy", "frame-ancestors 'none'", "object-src 'none'", "X-Content-Type-Options", "X-Frame-Options", "Strict-Transport-Security", "Permissions-Policy"]) expect(source).toContain(requirement);
  });

  it("keeps keyboard skip navigation, focus visibility, and reduced-motion fallbacks", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(layout).toContain('href="#main-content"');
    expect(layout).toContain('id="main-content"');
    expect(css).toContain("focus-visible");
    expect(css).toContain("prefers-reduced-motion:reduce");
    expect(css).toContain("animation-duration:.001ms");
  });

  it("keeps history reads paginated and bounded", () => {
    const source = readFileSync(join(process.cwd(), "app/history/page.tsx"), "utf8");
    expect(source).toContain("HISTORY_PAGE_SIZE = 25");
    expect(source).toContain("take: HISTORY_PAGE_SIZE + 1");
    expect(source).toContain("skip");
    expect(source).toContain('aria-label="History pagination"');
  });
});
