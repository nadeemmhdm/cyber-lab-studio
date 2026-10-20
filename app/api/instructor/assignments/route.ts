import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { ManagementError, assignStudent, removeStudentAssignment } from "@/lib/management/service";

const schema = z.object({ instructorId: z.string().min(1), studentId: z.string().min(1) });

async function authorize(request: Request) {
  if (!sameOrigin(request)) return { response: NextResponse.json({ error: "Invalid origin." }, { status: 403 }) } as const;
  return requireApiRole([RoleType.INSTRUCTOR, RoleType.ADMIN]);
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid assignment payload." }, { status: 400 });
  if (!auth.session.user.roles.includes(RoleType.ADMIN) && parsed.data.instructorId !== auth.session.user.id) return NextResponse.json({ error: "Instructors can manage only their own assignments." }, { status: 403 });
  try {
    const assignment = await assignStudent(auth.session.user.id, parsed.data.instructorId, parsed.data.studentId);
    return NextResponse.json({ ok: true, assignment });
  } catch (error) {
    if (error instanceof ManagementError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("assignment create failed", error);
    return NextResponse.json({ error: "Unable to create assignment." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid assignment payload." }, { status: 400 });
  if (!auth.session.user.roles.includes(RoleType.ADMIN) && parsed.data.instructorId !== auth.session.user.id) return NextResponse.json({ error: "Instructors can manage only their own assignments." }, { status: 403 });
  await removeStudentAssignment(auth.session.user.id, parsed.data.instructorId, parsed.data.studentId);
  return NextResponse.json({ ok: true });
}
