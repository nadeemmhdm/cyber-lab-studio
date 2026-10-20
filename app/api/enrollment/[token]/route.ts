import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/auth/security";
import { EnrollmentError, inspectEnrollmentToken, registerStudentWithInvite } from "@/lib/enrollment/service";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const schema = z.object({ username: z.string().trim().min(3).max(32), password: z.string().min(10).max(128) });

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invite = await inspectEnrollmentToken(token);
    return NextResponse.json({ invite }, { status: invite.active ? 200 : 410, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof EnrollmentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: "Enrollment link unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    enforceRateLimit(request, "enrollment.claim", null, { limit: 8, windowMs: 10 * 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 8 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Choose a valid username and a password of at least 10 characters." }, { status: 400 });
    const { token } = await params;
    const user = await registerStudentWithInvite(token, parsed.data);
    return NextResponse.json({ ok: true, user }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof EnrollmentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("student enrollment failed", error);
    return NextResponse.json({ error: "Unable to create the student account." }, { status: 500 });
  }
}
