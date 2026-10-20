import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { submitLabForValidation } from "@/lib/labs/completion";
import { LabEngineError } from "@/lib/labs/engine";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const { slug } = await params;

  try {
    const result = await submitLabForValidation(session.user.id, slug);
    return NextResponse.json(result, { status: result.passed ? 200 : 422, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LabEngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("lab validation failed", error);
    return NextResponse.json({ error: "Unable to validate the lab." }, { status: 500 });
  }
}
