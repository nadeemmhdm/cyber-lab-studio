import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  await revokeCurrentSession();
  return NextResponse.json({ ok: true });
}
