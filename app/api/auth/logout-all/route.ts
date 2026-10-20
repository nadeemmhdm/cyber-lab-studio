import { NextResponse } from "next/server";
import { getCurrentSession, revokeAllSessions } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  await revokeAllSessions(session.user.id);
  return NextResponse.json({ ok: true });
}
