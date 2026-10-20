import { describe, expect, it } from "vitest";
import { createCodeChallenge, createOpaqueToken, hashToken, safeEqual } from "@/lib/auth/crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/auth/validation";
import { hasAnyRole } from "@/lib/auth/rbac";
import { RoleType } from "@prisma/client";

describe("authentication primitives", () => {
  it("hashes passwords with argon2id and verifies only the correct password", async () => {
    const hash = await hashPassword("CyberLabPass123");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "CyberLabPass123")).toBe(true);
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });

  it("creates opaque tokens and stores deterministic hashes", () => {
    const token = createOpaqueToken();
    expect(token.length).toBeGreaterThan(30);
    expect(hashToken(token)).toHaveLength(64);
    expect(safeEqual(token, token)).toBe(true);
    expect(safeEqual(token, `${token}x`)).toBe(false);
    expect(createCodeChallenge(token).length).toBeGreaterThan(30);
  });

  it("enforces the account password policy", () => {
    expect(registerSchema.safeParse({ displayName: "Nadeem", email: "Test@Example.com", password: "CyberLab123" }).success).toBe(true);
    expect(registerSchema.safeParse({ displayName: "Nadeem", email: "test@example.com", password: "password" }).success).toBe(false);
  });

  it("checks role membership without trusting client input", () => {
    expect(hasAnyRole([RoleType.STUDENT], [RoleType.STUDENT])).toBe(true);
    expect(hasAnyRole([RoleType.STUDENT], [RoleType.ADMIN])).toBe(false);
  });
});
