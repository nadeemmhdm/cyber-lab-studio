import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const schema = z.object({ password: z.string().min(10).max(128) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "admin.user.password", auth.session.user.id, { limit: 12, windowMs: 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 4096));
    if (!parsed.success) return NextResponse.json({ error: "Password must contain 10-128 characters." }, { status: 400 });
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, firebaseUid: true, email: true } });
    if (!user?.firebaseUid) return NextResponse.json({ error: "This account has no Firebase identity to reset." }, { status: 409 });
    await getFirebaseAdminAuth().updateUser(user.firebaseUid, { password: parsed.data.password });
    await getFirebaseAdminAuth().revokeRefreshTokens(user.firebaseUid);
    await prisma.auditLog.create({ data: { actorId: auth.session.user.id, action: "management.user.password.reset", targetType: "User", targetId: user.id, metadata: { email: user.email } } });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    console.error("managed password reset failed", error);
    return NextResponse.json({ error: "Unable to reset account password." }, { status: 500 });
  }
}
