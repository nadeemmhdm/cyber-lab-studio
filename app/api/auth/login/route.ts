import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";
import { getClientIp, hashIdentifier, sameOrigin } from "@/lib/auth/security";
import { clearRateLimit, consumeRateLimit } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });

  const throttleKey = hashIdentifier(`${getClientIp(request)}|${parsed.data.email}`);
  const limited = await consumeRateLimit("login", throttleKey, { maxAttempts: 8, windowSeconds: 900, blockSeconds: 1800 });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { roles: { include: { role: true } } },
  });
  const valid = Boolean(user?.passwordHash) && (await verifyPassword(user!.passwordHash!, parsed.data.password));
  if (!user || !valid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  if (user.suspendedAt) return NextResponse.json({ error: "This account is suspended." }, { status: 403 });
  if (!user.emailVerifiedAt) return NextResponse.json({ error: "Verify your email before signing in.", code: "EMAIL_NOT_VERIFIED" }, { status: 403 });

  await clearRateLimit("login", throttleKey);
  await createSession(request, user.id);
  await prisma.auditLog.create({ data: { actorId: user.id, action: "auth.login", targetType: "User", targetId: user.id } });

  return NextResponse.json({ ok: true, user: { id: user.id, displayName: user.displayName, email: user.email, roles: user.roles.map((entry) => entry.role.key) } });
}
