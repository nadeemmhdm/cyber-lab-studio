import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { EnrollmentError, revokeEnrollmentInvite } from "@/lib/enrollment/service";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.INSTRUCTOR]);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    await revokeEnrollmentInvite(auth.session.user.id, id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof EnrollmentError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("revoke enrollment link failed", error);
    return NextResponse.json({ error: "Unable to revoke enrollment link." }, { status: 500 });
  }
}
