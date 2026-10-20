import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { createEnrollmentInvite, EnrollmentError, listEnrollmentInvites } from "@/lib/enrollment/service";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const createSchema = z.object({ maxUses: z.number().int().min(1).max(500), expiresHours: z.number().int().min(1).max(720).optional(), label: z.string().max(120).optional() });

export async function GET() {
  const auth = await requireApiRole([RoleType.INSTRUCTOR]);
  if ("response" in auth) return auth.response;
  const invites = await listEnrollmentInvites(auth.session.user.id);
  return NextResponse.json({ invites }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.INSTRUCTOR]);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "instructor.enrollment-links", auth.session.user.id, { limit: 20, windowMs: 60_000 });
    const parsed = createSchema.safeParse(await readJsonLimited(request, 8 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Invalid enrollment-link settings." }, { status: 400 });
    const invite = await createEnrollmentInvite(auth.session.user.id, parsed.data);
    return NextResponse.json({ invite }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof EnrollmentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("create enrollment link failed", error);
    return NextResponse.json({ error: "Unable to create enrollment link." }, { status: 500 });
  }
}
