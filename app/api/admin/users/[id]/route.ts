import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { ManagementError, updateUserAccess } from "@/lib/management/service";

const schema = z.object({ roles: z.array(z.nativeEnum(RoleType)).min(1).max(3).optional(), suspended: z.boolean().optional() }).refine((value) => value.roles !== undefined || value.suspended !== undefined, { message: "No update supplied." });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid user access payload." }, { status: 400 });
  const { id } = await params;
  try {
    const user = await updateUserAccess(auth.session.user.id, id, parsed.data);
    return NextResponse.json({ ok: true, user: { id: user.id, suspended: Boolean(user.suspendedAt), roles: user.roles.map((entry) => entry.role.key) } });
  } catch (error) {
    if (error instanceof ManagementError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("user access update failed", error);
    return NextResponse.json({ error: "Unable to update user access." }, { status: 500 });
  }
}
