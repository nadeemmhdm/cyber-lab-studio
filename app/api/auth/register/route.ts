import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/auth/validation";
import { appUrl, getClientIp, hashIdentifier, sameOrigin } from "@/lib/auth/security";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { issueAuthToken } from "@/lib/auth/tokens";
import { sendAuthEmail } from "@/lib/auth/email";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });

  const limited = await consumeRateLimit("register", hashIdentifier(getClientIp(request)), {
    maxAttempts: 5,
    windowSeconds: 900,
    blockSeconds: 900,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many registration attempts." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid registration details.", issues: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });

  const studentRole = await prisma.role.findUnique({ where: { key: RoleType.STUDENT } });
  if (!studentRole) return NextResponse.json({ error: "Platform roles are not initialized." }, { status: 503 });

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      passwordHash,
      roles: { create: { roleId: studentRole.id } },
    },
  });

  const token = await issueAuthToken("verify-email", user.id, 60 * 60 * 24);
  const verificationUrl = appUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  const delivery = await sendAuthEmail({ to: user.email, subject: "Verify your CyberLab account", actionLabel: "Verify your email", actionUrl: verificationUrl }).catch(() => ({ delivered: false }));

  await prisma.auditLog.create({ data: { actorId: user.id, action: "auth.register", targetType: "User", targetId: user.id } });

  return NextResponse.json({
    ok: true,
    emailVerificationRequired: true,
    emailDelivered: delivery.delivered,
    ...(process.env.NODE_ENV !== "production" ? { devVerificationUrl: verificationUrl } : {}),
  }, { status: 201 });
}
