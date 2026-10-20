import { LearningMode } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { LabEngineError, startLab } from "@/lib/labs/engine";

const schema = z.object({ mode: z.nativeEnum(LearningMode).default(LearningMode.GUIDED) });

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid learning mode." }, { status: 400 });
  const { slug } = await params;
  try {
    const runtime = await startLab(session.user.id, slug, parsed.data.mode);
    return NextResponse.json({
      ok: true,
      environmentId: runtime.environment.id,
      attemptId: runtime.attempt.id,
      mode: runtime.attempt.mode,
      progress: runtime.progress,
      policy: runtime.policy,
    });
  } catch (error) {
    if (error instanceof LabEngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("lab start failed", error);
    return NextResponse.json({ error: "Unable to start the lab." }, { status: 500 });
  }
}
