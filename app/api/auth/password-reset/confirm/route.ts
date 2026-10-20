import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { resetPasswordSchema } from "@/lib/auth/validation";
import { getClientIp, hashIdentifier, sameOrigin } from "@/lib/auth/security";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { consumeAuthToken } from "@/lib/auth/tokens";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const limited = await consumeRateLimit("password-reset-confirm", hashIdentifier(getClientIp(request)), { maxAttempts: 8, windowSeconds: 900, blockSeconds: 1800 });
  if (!limited.allowed) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid reset request.", issues: parsed.error.flatten() }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.password);
  const consumed = await consumeAuthToken("reset-password", parsed.data.token);
  if (!consumed) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: consumed.userId }, data: { passwordHash } }),
    prisma.session.updateMany({ where: { userId: consumed.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorId: consumed.userId, action: "auth.password_reset", targetType: "User", targetId: consumed.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
