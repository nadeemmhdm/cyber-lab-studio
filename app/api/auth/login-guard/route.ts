import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/auth/security";
import { clearLoginFailures, getLoginCooldown, recordLoginFailure } from "@/lib/auth/login-throttle";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const schema = z.object({
  identifier: z.string().trim().min(1).max(254),
  action: z.enum(["check", "failure", "success"]),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    enforceRateLimit(request, "auth.login-guard", null, { limit: 40, windowMs: 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 4096));
    if (!parsed.success) return NextResponse.json({ error: "Invalid sign-in guard payload." }, { status: 400 });
    const { identifier, action } = parsed.data;
    if (action === "failure") {
      const result = await recordLoginFailure(request, identifier);
      return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
    }
    if (action === "success") {
      await clearLoginFailures(request, [identifier]);
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const result = await getLoginCooldown(request, identifier);
    return NextResponse.json(result, {
      status: result.allowed ? 200 : 429,
      headers: { "Cache-Control": "no-store", ...(result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {}) },
    });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    console.error("login guard failed", error);
    return NextResponse.json({ error: "Unable to check sign-in cooldown." }, { status: 500 });
  }
}
