import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { getWorkspace, LabEngineError } from "@/lib/labs/engine";
import { executePersistedAwsCommand } from "@/lib/simulators/aws/persistence";
import { executePersistedAzureCommand } from "@/lib/simulators/azure/persistence";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const schema = z.object({ command: z.string().trim().min(1).max(2000) });

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    enforceRateLimit(request, "lab.terminal", session.user.id, { limit: 30, windowMs: 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 8 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid simulator CLI command." }, { status: 400 });
    const { slug } = await params;
    const workspace = await getWorkspace(session.user.id, slug);
    if (!workspace) return NextResponse.json({ error: "Start the lab before opening the terminal." }, { status: 409 });
    if (workspace.lab.platform === "AWS") return NextResponse.json(await executePersistedAwsCommand(session.user.id, workspace.environment.id, parsed.data.command), { headers: { "Cache-Control": "no-store" } });
    if (workspace.lab.platform === "AZURE") return NextResponse.json(await executePersistedAzureCommand(session.user.id, workspace.environment.id, parsed.data.command), { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: "CLI terminal is not available for this lab platform yet." }, { status: 400 });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof LabEngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("Simulator terminal execution failed", error);
    return NextResponse.json({ error: "Unable to execute the simulated command." }, { status: 500 });
  }
}
