import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/auth/security";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";
import { AdminBootstrapError, provisionInitialAdmin } from "@/lib/setup/admin-bootstrap";

const schema = z.object({
  setupToken: z.string().min(32).max(512),
  email: z.string().email().max(254),
  displayName: z.string().trim().min(2).max(120),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    enforceRateLimit(request, "setup.initial_admin", null, { limit: 5, windowMs: 15 * 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 16 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Invalid administrator setup details." }, { status: 400 });
    const result = await provisionInitialAdmin(parsed.data);
    return NextResponse.json({ ok: true, result }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof AdminBootstrapError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("initial admin bootstrap failed", error);
    return NextResponse.json({ error: "Unable to complete initial administrator setup." }, { status: 500 });
  }
}
