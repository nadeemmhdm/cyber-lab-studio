import { DoubtStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { DoubtError, setDoubtStatus } from "@/lib/doubts/service";
import { readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const schema = z.object({ status: z.nativeEnum(DoubtStatus) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const parsed = schema.safeParse(await readJsonLimited(request, 2048));
    if (!parsed.success) return NextResponse.json({ error: "Invalid doubt status." }, { status: 400 });
    const { id } = await params;
    await setDoubtStatus(session.user.id, id, parsed.data.status);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof DoubtError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("doubt status update failed", error);
    return NextResponse.json({ error: "Unable to update doubt status." }, { status: 500 });
  }
}
