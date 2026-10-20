import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { readDoubtForm } from "@/lib/doubts/http";
import { createLabDoubt, DoubtError } from "@/lib/doubts/service";
import { enforceRateLimit, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.STUDENT]);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "doubt.create", auth.session.user.id, { limit: 10, windowMs: 60_000 });
    const { slug } = await params;
    const form = await readDoubtForm(request);
    const created = await createLabDoubt(auth.session.user.id, slug, form.message, form.attachment);
    return NextResponse.json({ ok: true, threadId: created.thread.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof DoubtError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("create lab doubt failed", error);
    return NextResponse.json({ error: "Unable to send your doubt." }, { status: 500 });
  }
}
