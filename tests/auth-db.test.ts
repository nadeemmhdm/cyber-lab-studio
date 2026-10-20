import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { consumeAuthToken, issueAuthToken } from "@/lib/auth/tokens";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("authentication persistence", () => {
  let userId = "";
  const email = `auth-test-${Date.now()}@example.test`;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email, displayName: "Auth Test" } });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("stores only a hashed verification token and consumes it once", async () => {
    const raw = await issueAuthToken("verify-email", userId, 60);
    const stored = await prisma.platformSetting.findFirst({ where: { key: { startsWith: `auth-token:verify-email:${userId}:` } } });
    expect(stored?.key.includes(raw)).toBe(false);
    expect(await consumeAuthToken("verify-email", raw)).toEqual({ userId });
    expect(await consumeAuthToken("verify-email", raw)).toBeNull();
  });
});
