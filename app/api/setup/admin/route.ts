import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { enforceRateLimit, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";
import { AdminBootstrapError, claimInitialAdmin } from "@/lib/setup/admin-bootstrap";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.STUDENT, RoleType.INSTRUCTOR, RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "setup.initial_admin", auth.session.user.id, { limit: 5, windowMs: 10 * 60_000 });
    const result = await claimInitialAdmin(auth.session.user.id);
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof AdminBootstrapError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("initial admin bootstrap failed", error);
    return NextResponse.json({ error: "Unable to complete initial administrator setup." }, { status: 500 });
  }
}
