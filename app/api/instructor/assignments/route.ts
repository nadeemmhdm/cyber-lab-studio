import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { ManagementError, assignStudent, removeStudentAssignment } from "@/lib/management/service";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const schema = z.object({ instructorId: z.string().min(1).max(128), studentId: z.string().min(1).max(128) });

async function authorize(request: Request) {
  if (!sameOrigin(request)) return { response: NextResponse.json({ error: "Invalid origin." }, { status: 403 }) } as const;
  return requireApiRole([RoleType.INSTRUCTOR, RoleType.ADMIN]);
}

async function parse(request: Request, userId: string) {
  enforceRateLimit(request, "instructor.assignment", userId, { limit: 30, windowMs: 60_000 });
  return schema.safeParse(await readJsonLimited(request, 8 * 1024));
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  try {
    const parsed = await parse(request, auth.session.user.id);
    if (!parsed.success) return NextResponse.json({ error: "Invalid assignment payload." }, { status: 400 });
    if (!auth.session.user.roles.includes(RoleType.ADMIN) && parsed.data.instructorId !== auth.session.user.id) return NextResponse.json({ error: "Instructors can manage only their own assignments." }, { status: 403 });
    return NextResponse.json({ ok: true, assignment: await assignStudent(auth.session.user.id, parsed.data.instructorId, parsed.data.studentId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof ManagementError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("assignment create failed", error);
    return NextResponse.json({ error: "Unable to create assignment." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  try {
    const parsed = await parse(request, auth.session.user.id);
    if (!parsed.success) return NextResponse.json({ error: "Invalid assignment payload." }, { status: 400 });
    if (!auth.session.user.roles.includes(RoleType.ADMIN) && parsed.data.instructorId !== auth.session.user.id) return NextResponse.json({ error: "Instructors can manage only their own assignments." }, { status: 403 });
    await removeStudentAssignment(auth.session.user.id, parsed.data.instructorId, parsed.data.studentId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    throw error;
  }
}
