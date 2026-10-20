import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { KqlError } from "@/lib/kql/engine";
import { getWorkspace, LabEngineError } from "@/lib/labs/engine";
import { executePersistedKqlQuery } from "@/lib/simulators/security/persistence";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const schema = z.object({ query: z.string().trim().min(1).max(8000) });
const platforms = new Set(["SENTINEL", "KQL", "DEFENDER_XDR"]);

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    enforceRateLimit(request, "lab.query", session.user.id, { limit: 30, windowMs: 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 16 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid KQL query." }, { status: 400 });
    const { slug } = await params;
    const workspace = await getWorkspace(session.user.id, slug);
    if (!workspace) return NextResponse.json({ error: "Start the lab before querying data." }, { status: 409 });
    if (!platforms.has(workspace.lab.platform)) return NextResponse.json({ error: "KQL is available only in Sentinel, KQL, and Defender XDR labs." }, { status: 400 });
    const result = await executePersistedKqlQuery(session.user.id, workspace.environment.id, parsed.data.query);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof LabEngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    if (error instanceof KqlError) return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    console.error("KQL execution failed", error);
    return NextResponse.json({ error: "Unable to execute the query." }, { status: 500 });
  }
}
