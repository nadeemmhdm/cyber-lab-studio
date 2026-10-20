import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createCodeChallenge, createOpaqueToken } from "@/lib/auth/crypto";

const OAUTH_COOKIE = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/login?google=unavailable", request.url));

  const state = createOpaqueToken(24);
  const verifier = createOpaqueToken(48);
  const nonce = createOpaqueToken(24);
  const jar = await cookies();
  jar.set("cyberlab_oauth_state", state, OAUTH_COOKIE);
  jar.set("cyberlab_oauth_verifier", verifier, OAUTH_COOKIE);
  jar.set("cyberlab_oauth_nonce", nonce, OAUTH_COOKIE);

  const callback = new URL("/api/auth/google/callback", process.env.APP_URL ?? request.url).toString();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", createCodeChallenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return NextResponse.redirect(url);
}
