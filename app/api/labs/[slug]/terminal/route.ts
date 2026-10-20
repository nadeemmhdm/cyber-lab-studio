import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { getWorkspace, LabEngineError } from "@/lib/labs/engine";
import { executePersistedAwsCommand } from "@/lib/simulators/aws/persistence";

const schema = z.object({ command: z.string().trim().min(1).max(2000) });

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid AWS CLI command." }, { status: 400 });
  const { slug } = await params;

  try {
    const workspace = await getWorkspace(session.user.id, slug);
    if (!workspace) return NextResponse.json({ error: "Start the lab before opening the terminal." }, { status: 409 });
    if (workspace.lab.platform !== "AWS") return NextResponse.json({ error: "AWS CLI is available only in AWS labs." }, { status: 400 });
    const result = await executePersistedAwsCommand(session.user.id, workspace.environment.id, parsed.data.command);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LabEngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("AWS terminal execution failed", error);
    return NextResponse.json({ error: "Unable to execute the simulated command." }, { status: 500 });
  }
}
