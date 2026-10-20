import { hashIdentifier, getClientIp } from "@/lib/auth/security";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 30 * 60_000;

function normalizedIdentifier(identifier: string) {
  return identifier.trim().toLowerCase().slice(0, 254);
}

function throttleKey(request: Request, identifier: string) {
  return hashIdentifier(`password-login:${getClientIp(request)}:${normalizedIdentifier(identifier)}`);
}

function lockDurationMs(failures: number) {
  if (failures >= 8) return 15 * 60_000;
  if (failures >= 6) return 5 * 60_000;
  if (failures >= 5) return 60_000;
  return 0;
}

export async function getLoginCooldown(request: Request, identifier: string, now = new Date()) {
  const key = throttleKey(request, identifier);
  const row = await prisma.loginThrottle.findUnique({ where: { key } });
  if (!row) return { allowed: true, failures: 0, retryAfter: 0 };
  if (now.getTime() - row.windowStartedAt.getTime() > WINDOW_MS && (!row.lockedUntil || row.lockedUntil <= now)) {
    await prisma.loginThrottle.delete({ where: { key } }).catch(() => undefined);
    return { allowed: true, failures: 0, retryAfter: 0 };
  }
  if (row.lockedUntil && row.lockedUntil > now) {
    return { allowed: false, failures: row.failures, retryAfter: Math.max(1, Math.ceil((row.lockedUntil.getTime() - now.getTime()) / 1000)) };
  }
  return { allowed: true, failures: row.failures, retryAfter: 0 };
}

export async function recordLoginFailure(request: Request, identifier: string, now = new Date()) {
  const key = throttleKey(request, identifier);
  return prisma.$transaction(async (tx) => {
    const current = await tx.loginThrottle.findUnique({ where: { key } });
    const expired = !current || now.getTime() - current.windowStartedAt.getTime() > WINDOW_MS;
    const failures = expired ? 1 : current.failures + 1;
    const duration = lockDurationMs(failures);
    const lockedUntil = duration ? new Date(now.getTime() + duration) : null;
    const row = await tx.loginThrottle.upsert({
      where: { key },
      update: { failures, lockedUntil, ...(expired ? { windowStartedAt: now } : {}) },
      create: { key, failures, lockedUntil, windowStartedAt: now },
    });
    return { failures: row.failures, retryAfter: lockedUntil ? Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000)) : 0 };
  });
}

export async function clearLoginFailures(request: Request, identifiers: Array<string | null | undefined>) {
  const keys = [...new Set(identifiers.filter((value): value is string => Boolean(value?.trim())).map((value) => throttleKey(request, value)))];
  if (!keys.length) return;
  await prisma.loginThrottle.deleteMany({ where: { key: { in: keys } } });
}

export function studentLoginEmail(username: string) {
  return `${username.trim().toLowerCase()}@students.cyberlab.local`;
}

export function resolveLoginEmail(identifier: string) {
  const value = normalizedIdentifier(identifier);
  return value.includes("@") ? value : studentLoginEmail(value);
}
