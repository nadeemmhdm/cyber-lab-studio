import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { LabEngineError, resetLab } from "@/lib/labs/engine";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const { slug } = await params;
  try {
    const lab = await prisma.lab.findUnique({ where: { slug }, select: { id: true } });
    if (lab) {
      const completion = await prisma.completionRecord.findUnique({ where: { userId_labId: { userId: session.user.id, labId: lab.id } }, select: { id: true } });
      if (completion) return NextResponse.json({ error: "Verified labs are immutable. Start another lab instead of resetting an earned completion.", code: "LAB_ALREADY_COMPLETED" }, { status: 409 });
    }
    const environment = await resetLab(session.user.id, slug);
    return NextResponse.json({ ok: true, environmentId: environment.id, resetCount: environment.resetCount, state: environment.environmentState });
  } catch (error) {
    if (error instanceof LabEngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("lab reset failed", error);
    return NextResponse.json({ error: "Unable to reset the lab." }, { status: 500 });
  }
}
