import { randomBytes } from "node:crypto";

/**
 * Generates an unpredictable completion flag on the server.
 * Persistence and the per-user/per-lab uniqueness constraint are enforced by Prisma.
 */
export function generateCompletionFlag(): string {
  const value = randomBytes(24).toString("base64url");
  return `CYBERLAB{${value}}`;
}
