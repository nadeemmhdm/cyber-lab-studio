import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resendVerificationSchema } from "@/lib/auth/validation";
import { appUrl, getClientIp, hashIdentifier, sameOrigin } from "@/lib/auth/security";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { issueAuthToken } from "@/lib/auth/tokens";
import { sendAuthEmail } from "@/lib/auth/email";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = resendVerificationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });

  const limited = await consumeRateLimit("resend-verification", hashIdentifier(`${getClientIp(request)}|${parsed.data.email}`), { maxAttempts: 4, windowSeconds: 900, blockSeconds: 1800 });
  if (!limited.allowed) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user && !user.emailVerifiedAt && !user.suspendedAt) {
    const token = await issueAuthToken("verify-email", user.id, 60 * 60 * 24);
    const actionUrl = appUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    await sendAuthEmail({ to: user.email, subject: "Verify your CyberLab account", actionLabel: "Verify your email", actionUrl }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
