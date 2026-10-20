import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { firebaseAdminConfigured, getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

async function readStatus() {
  const session = await getCurrentSession();
  if (!session) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  if (!session.user.firebaseUid || !firebaseAdminConfigured()) return { response: NextResponse.json({ error: "Firebase Admin is unavailable." }, { status: 503 }) } as const;
  const record = await getFirebaseAdminAuth().getUser(session.user.firebaseUid);
  const factors = record.multiFactor?.enrolledFactors ?? [];
  return { session, factors } as const;
}

export async function GET() {
  const status = await readStatus();
  if ("response" in status) return status.response;
  return NextResponse.json({ enabled: status.factors.length > 0, factors: status.factors.map((factor) => ({ uid: factor.uid, displayName: factor.displayName ?? "Authenticator", factorId: factor.factorId })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const status = await readStatus();
  if ("response" in status) return status.response;
  const enabled = status.factors.length > 0;
  await prisma.auditLog.create({ data: { actorId: status.session.user.id, action: enabled ? "auth.mfa.enrolled.confirmed" : "auth.mfa.status.checked", targetType: "User", targetId: status.session.user.id, metadata: { factorCount: status.factors.length } } });
  return NextResponse.json({ enabled, factorCount: status.factors.length }, { headers: { "Cache-Control": "no-store" } });
}
