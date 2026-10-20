import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { enforceRateLimit, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

export const CSRF_COOKIE = "cyberlab_csrf";

export async function GET(request: Request) {
  try {
    enforceRateLimit(request, "auth.csrf", null, { limit: 60, windowMs: 60_000 });
    const token = randomBytes(32).toString("base64url");
    const jar = await cookies();
    jar.set(CSRF_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 600 });
    return NextResponse.json({ csrfToken: token }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    throw error;
  }
}
