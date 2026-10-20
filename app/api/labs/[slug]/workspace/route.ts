import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getWorkspace, LabEngineError } from "@/lib/labs/engine";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { slug } = await params;
  try {
    const workspace = await getWorkspace(session.user.id, slug);
    if (!workspace) return NextResponse.json({ error: "Lab environment has not been started." }, { status: 404 });
    return NextResponse.json({
      lab: { id: workspace.lab.id, number: workspace.lab.number, slug: workspace.lab.slug, title: workspace.lab.title, platform: workspace.lab.platform },
      version: { id: workspace.version.id, version: workspace.version.version, conceptExplanation: workspace.version.conceptExplanation, scenario: workspace.version.scenario, tasks: workspace.version.tasks },
      environment: { id: workspace.environment.id, state: workspace.environment.environmentState, resources: workspace.environment.resources, resetCount: workspace.environment.resetCount, updatedAt: workspace.environment.updatedAt },
      progress: workspace.progress,
      attempt: workspace.attempt,
      policy: workspace.policy,
    });
  } catch (error) {
    if (error instanceof LabEngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("workspace load failed", error);
    return NextResponse.json({ error: "Unable to load workspace." }, { status: 500 });
  }
}
