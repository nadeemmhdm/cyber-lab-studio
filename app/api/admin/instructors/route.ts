import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { AccountProvisionError, provisionInstructor } from "@/lib/management/accounts";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const schema = z.object({ email: z.string().email().max(254), displayName: z.string().trim().min(2).max(120), password: z.string().min(10).max(128) });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "admin.instructor.provision", auth.session.user.id, { limit: 10, windowMs: 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 8 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Invalid instructor account details." }, { status: 400 });
    const user = await provisionInstructor(auth.session.user.id, parsed.data);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, displayName: user.displayName } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof AccountProvisionError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("instructor provisioning failed", error);
    return NextResponse.json({ error: "Unable to create instructor account." }, { status: 500 });
  }
}
