import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { getWorkspace, LabEngineError } from "@/lib/labs/engine";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";
import { SecuritySimulatorError } from "@/lib/simulators/security/engine";
import { runPersistedSentinelAnalytics, updatePersistedDefenderIncident, updatePersistedSentinelIncident } from "@/lib/simulators/security/persistence";

const schema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("run-sentinel-detections"), ruleId: z.string().trim().min(1).optional() }),
  z.object({ operation: z.literal("update-sentinel-incident"), incidentId: z.string().trim().min(1), status: z.enum(["New", "Active", "Resolved"]).optional(), severity: z.enum(["Informational", "Low", "Medium", "High", "Critical"]).optional(), note: z.string().trim().max(2000).optional() }),
  z.object({ operation: z.literal("update-defender-incident"), incidentId: z.string().trim().min(1), status: z.enum(["New", "Active", "Resolved"]).optional(), severity: z.enum(["Informational", "Low", "Medium", "High", "Critical"]).optional(), note: z.string().trim().max(2000).optional() }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    enforceRateLimit(request, "lab.security", session.user.id, { limit: 30, windowMs: 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 16 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Invalid security operation." }, { status: 400 });
    const { slug } = await params;
    const workspace = await getWorkspace(session.user.id, slug);
    if (!workspace) return NextResponse.json({ error: "Start the lab before using security operations." }, { status: 409 });
    const input = parsed.data;
    if (input.operation === "run-sentinel-detections") {
      if (workspace.lab.platform !== "SENTINEL") return NextResponse.json({ error: "Sentinel detections are available only in Sentinel labs." }, { status: 400 });
      const result = await runPersistedSentinelAnalytics(session.user.id, workspace.environment.id, input.ruleId);
      return NextResponse.json(result.result, { headers: { "Cache-Control": "no-store" } });
    }
    if (input.operation === "update-sentinel-incident") {
      const result = await updatePersistedSentinelIncident(session.user.id, workspace.environment.id, input.incidentId, { status: input.status, severity: input.severity, note: input.note, author: session.user.displayName });
      return NextResponse.json(result.result, { headers: { "Cache-Control": "no-store" } });
    }
    const result = await updatePersistedDefenderIncident(session.user.id, workspace.environment.id, input.incidentId, { status: input.status, severity: input.severity, note: input.note, author: session.user.displayName });
    return NextResponse.json(result.result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    if (error instanceof LabEngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    if (error instanceof SecuritySimulatorError) return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    console.error("Security operation failed", error);
    return NextResponse.json({ error: "Unable to complete the security operation." }, { status: 500 });
  }
}
