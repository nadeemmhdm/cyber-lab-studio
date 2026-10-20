import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";
import { addUserSupportReply, SupportError } from "@/lib/support/service";

const schema = z.object({ message: z.string().min(2).max(8000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.STUDENT, RoleType.INSTRUCTOR, RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "support.reply", auth.session.user.id, { limit: 20, windowMs: 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 12 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Invalid reply." }, { status: 400 });
    const { id } = await params;
    await addUserSupportReply(auth.session.user.id, id, parsed.data.message);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof SupportError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("support reply failed", error);
    return NextResponse.json({ error: "Unable to add support reply." }, { status: 500 });
  }
}
