import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { ManagementError, updateUserAccess } from "@/lib/management/service";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const schema = z.object({ roles: z.array(z.nativeEnum(RoleType)).min(1).max(3).optional(), suspended: z.boolean().optional() }).refine((value) => value.roles !== undefined || value.suspended !== undefined, { message: "No update supplied." });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "admin.user", auth.session.user.id, { limit: 30, windowMs: 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 8 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Invalid user access payload." }, { status: 400 });
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    const targetIsAdmin = target.roles.some((entry) => entry.role.key === RoleType.ADMIN);
    const resultingAdmin = parsed.data.roles?.includes(RoleType.ADMIN) ?? targetIsAdmin;
    if (parsed.data.suspended === true && resultingAdmin) return NextResponse.json({ error: "Administrator accounts are protected and cannot be suspended.", code: "ADMIN_SUSPEND_BLOCKED" }, { status: 409 });
    if (resultingAdmin && target.suspendedAt && parsed.data.suspended !== false) return NextResponse.json({ error: "Restore this account before assigning the Administrator role.", code: "ADMIN_MUST_BE_ACTIVE" }, { status: 409 });
    const user = await updateUserAccess(auth.session.user.id, id, parsed.data);
    return NextResponse.json({ ok: true, user: { id: user.id, suspended: Boolean(user.suspendedAt), roles: user.roles.map((entry) => entry.role.key) } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof ManagementError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("user access update failed", error);
    return NextResponse.json({ error: "Unable to update user access." }, { status: 500 });
  }
}
