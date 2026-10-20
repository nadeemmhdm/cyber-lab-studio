import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestResetSchema } from "@/lib/auth/validation";
import { appUrl, getClientIp, hashIdentifier, sameOrigin } from "@/lib/auth/security";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { issueAuthToken } from "@/lib/auth/tokens";
import { sendAuthEmail } from "@/lib/auth/email";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = requestResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });

  const limited = await consumeRateLimit("password-reset", hashIdentifier(`${getClientIp(request)}|${parsed.data.email}`), { maxAttempts: 4, windowSeconds: 900, blockSeconds: 1800 });
  if (!limited.allowed) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  let devResetUrl: string | undefined;
  if (user?.passwordHash && !user.suspendedAt) {
    const token = await issueAuthToken("reset-password", user.id, 60 * 30);
    const actionUrl = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
    devResetUrl = process.env.NODE_ENV !== "production" ? actionUrl : undefined;
    await sendAuthEmail({ to: user.email, subject: "Reset your CyberLab password", actionLabel: "Reset your password", actionUrl }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, ...(devResetUrl ? { devResetUrl } : {}) });
}
