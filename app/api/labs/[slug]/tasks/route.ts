import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { LabEngineError, recordTaskProgress } from "@/lib/labs/engine";

const schema = z.object({ position: z.number().int().positive() });

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid task position." }, { status: 400 });
  const { slug } = await params;
  try {
    const progress = await recordTaskProgress(session.user.id, slug, parsed.data.position);
    return NextResponse.json({ ok: true, progress });
  } catch (error) {
    if (error instanceof LabEngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("task progress failed", error);
    return NextResponse.json({ error: "Unable to update task progress." }, { status: 500 });
  }
}
