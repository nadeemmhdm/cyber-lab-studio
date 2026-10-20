import { prisma } from "@/lib/prisma";
import { createOpaqueToken, hashToken } from "@/lib/auth/crypto";

export type AuthTokenPurpose = "verify-email" | "reset-password";

type StoredToken = { userId?: string; expiresAt?: string };

function prefix(purpose: AuthTokenPurpose, userId?: string) {
  return userId ? `auth-token:${purpose}:${userId}:` : `auth-token:${purpose}:`;
}

export async function issueAuthToken(purpose: AuthTokenPurpose, userId: string, ttlSeconds: number) {
  const raw = createOpaqueToken(32);
  const digest = hashToken(raw);
  const key = `${prefix(purpose, userId)}${digest}`;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  await prisma.$transaction([
    prisma.platformSetting.deleteMany({ where: { key: { startsWith: prefix(purpose, userId) } } }),
    prisma.platformSetting.create({ data: { key, value: { userId, expiresAt } } }),
  ]);

  return raw;
}

export async function consumeAuthToken(purpose: AuthTokenPurpose, raw: string) {
  const digest = hashToken(raw);
  return prisma.$transaction(async (tx) => {
    const row = await tx.platformSetting.findFirst({
      where: { key: { startsWith: prefix(purpose), endsWith: `:${digest}` } },
    });
    if (!row) return null;

    const deleted = await tx.platformSetting.deleteMany({ where: { key: row.key } });
    if (deleted.count !== 1) return null;

    const stored = row.value as unknown as StoredToken;
    if (!stored.userId || !stored.expiresAt || new Date(stored.expiresAt).getTime() <= Date.now()) return null;
    return { userId: stored.userId };
  });
}
