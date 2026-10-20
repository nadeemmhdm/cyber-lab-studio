import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { LabEngineError, resetLab } from "@/lib/labs/engine";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const { slug } = await params;
  try {
    const environment = await resetLab(session.user.id, slug);
    return NextResponse.json({ ok: true, environmentId: environment.id, resetCount: environment.resetCount, state: environment.environmentState });
  } catch (error) {
    if (error instanceof LabEngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("lab reset failed", error);
    return NextResponse.json({ error: "Unable to reset the lab." }, { status: 500 });
  }
}
