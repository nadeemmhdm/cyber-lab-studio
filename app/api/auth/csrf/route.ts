import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const CSRF_COOKIE = "cyberlab_csrf";

export async function GET() {
  const token = randomBytes(32).toString("base64url");
  const jar = await cookies();
  jar.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.json({ csrfToken: token }, { headers: { "Cache-Control": "no-store" } });
}
