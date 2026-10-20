import { RoleType, SupportTicketPriority } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";
import { createSupportTicket, listUserTickets, SupportError } from "@/lib/support/service";

const roles = [RoleType.STUDENT, RoleType.INSTRUCTOR, RoleType.ADMIN];
const schema = z.object({
  subject: z.string().min(4).max(160),
  category: z.string().min(2).max(80).default("General"),
  priority: z.nativeEnum(SupportTicketPriority).optional(),
  message: z.string().min(10).max(8000),
});

export async function GET() {
  const auth = await requireApiRole(roles);
  if ("response" in auth) return auth.response;
  const tickets = await listUserTickets(auth.session.user.id);
  return NextResponse.json({ tickets }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole(roles);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "support.create", auth.session.user.id, { limit: 8, windowMs: 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 12 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Invalid support report." }, { status: 400 });
    const ticket = await createSupportTicket(auth.session.user.id, parsed.data);
    return NextResponse.json({ ok: true, ticketId: ticket.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof SupportError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("support ticket creation failed", error);
    return NextResponse.json({ error: "Unable to create support report." }, { status: 500 });
  }
}
