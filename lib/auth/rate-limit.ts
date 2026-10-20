import { prisma } from "@/lib/prisma";

type StoredRateLimit = {
  attempts?: number;
  windowStartedAt?: string;
  blockedUntil?: string | null;
};

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

function keyFor(action: string, identifierHash: string) {
  return `auth-rate:${action}:${identifierHash}`;
}

function parse(value: unknown): StoredRateLimit {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as StoredRateLimit;
}

export async function consumeRateLimit(
  action: string,
  identifierHash: string,
  options: { maxAttempts: number; windowSeconds: number; blockSeconds: number },
): Promise<RateLimitResult> {
  const key = keyFor(action, identifierHash);
  const now = Date.now();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.platformSetting.findUnique({ where: { key } });
    const stored = parse(existing?.value);
    const blockedUntil = stored.blockedUntil ? new Date(stored.blockedUntil).getTime() : 0;

    if (blockedUntil > now) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - now) / 1000)) };
    }

    const started = stored.windowStartedAt ? new Date(stored.windowStartedAt).getTime() : 0;
    const inWindow = started > 0 && now - started < options.windowSeconds * 1000;
    const attempts = (inWindow ? stored.attempts ?? 0 : 0) + 1;
    const windowStartedAt = new Date(inWindow ? started : now).toISOString();
    const shouldBlock = attempts > options.maxAttempts;
    const nextBlockedUntil = shouldBlock ? new Date(now + options.blockSeconds * 1000).toISOString() : null;

    await tx.platformSetting.upsert({
      where: { key },
      create: { key, value: { attempts, windowStartedAt, blockedUntil: nextBlockedUntil } },
      update: { value: { attempts, windowStartedAt, blockedUntil: nextBlockedUntil } },
    });

    return {
      allowed: !shouldBlock,
      retryAfterSeconds: shouldBlock ? options.blockSeconds : 0,
    };
  });
}

export async function clearRateLimit(action: string, identifierHash: string) {
  await prisma.platformSetting.deleteMany({ where: { key: keyFor(action, identifierHash) } });
}
