import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { readDoubtForm } from "@/lib/doubts/http";
import { DoubtError, replyToDoubt } from "@/lib/doubts/service";
import { enforceRateLimit, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    enforceRateLimit(request, "doubt.reply", session.user.id, { limit: 30, windowMs: 60_000 });
    const { id } = await params;
    const form = await readDoubtForm(request);
    await replyToDoubt(session.user.id, id, form.message, form.attachment);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof DoubtError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("doubt reply failed", error);
    return NextResponse.json({ error: "Unable to send reply." }, { status: 500 });
  }
}
