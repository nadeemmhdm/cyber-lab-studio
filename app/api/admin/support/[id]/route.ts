import { RoleType, SupportTicketStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";
import { addAdminSupportReply, SupportError, updateSupportTicketStatus } from "@/lib/support/service";

const replySchema = z.object({ message: z.string().min(2).max(8000) });
const statusSchema = z.object({ status: z.nativeEnum(SupportTicketStatus) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "admin.support.reply", auth.session.user.id, { limit: 40, windowMs: 60_000 });
    const parsed = replySchema.safeParse(await readJsonLimited(request, 12 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Invalid support reply." }, { status: 400 });
    const { id } = await params;
    await addAdminSupportReply(auth.session.user.id, id, parsed.data.message);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof SupportError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("admin support reply failed", error);
    return NextResponse.json({ error: "Unable to reply to support ticket." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "admin.support.status", auth.session.user.id, { limit: 40, windowMs: 60_000 });
    const parsed = statusSchema.safeParse(await readJsonLimited(request, 4 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Invalid ticket status." }, { status: 400 });
    const { id } = await params;
    const ticket = await updateSupportTicketStatus(auth.session.user.id, id, parsed.data.status);
    return NextResponse.json({ ok: true, status: ticket.status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof SupportError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("admin support status update failed", error);
    return NextResponse.json({ error: "Unable to update support ticket." }, { status: 500 });
  }
}
