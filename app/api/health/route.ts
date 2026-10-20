import { NextResponse } from "next/server";
import { firebaseAdminConfigured } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: { engine: "sqlite", status: "reachable" },
      authentication: { provider: "firebase", adminConfigured: firebaseAdminConfigured() },
      service: "cyber-lab-studio",
      responseMs: Math.round(performance.now() - startedAt),
      timestamp: new Date().toISOString(),
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      status: "degraded",
      database: { engine: "sqlite", status: "unreachable" },
      authentication: { provider: "firebase", adminConfigured: firebaseAdminConfigured() },
      service: "cyber-lab-studio",
      responseMs: Math.round(performance.now() - startedAt),
      timestamp: new Date().toISOString(),
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
