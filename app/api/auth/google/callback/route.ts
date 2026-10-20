import { RoleType } from "@prisma/client";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeEqual } from "@/lib/auth/crypto";
import { normalizeEmail } from "@/lib/auth/validation";
import { createSession } from "@/lib/auth/session";

const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function clearOauthCookies(jar: Awaited<ReturnType<typeof cookies>>) {
  for (const name of ["cyberlab_oauth_state", "cyberlab_oauth_verifier", "cyberlab_oauth_nonce"]) {
    jar.set(name, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  }
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(new URL("/login?google=unavailable", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expectedState = jar.get("cyberlab_oauth_state")?.value;
  const verifier = jar.get("cyberlab_oauth_verifier")?.value;
  const nonce = jar.get("cyberlab_oauth_nonce")?.value;
  if (!code || !state || !expectedState || !verifier || !nonce || !safeEqual(state, expectedState)) {
    clearOauthCookies(jar);
    return NextResponse.redirect(new URL("/login?google=invalid", request.url));
  }

  const redirectUri = new URL("/api/auth/google/callback", process.env.APP_URL ?? request.url).toString();
  const exchange = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }),
  });
  if (!exchange.ok) {
    clearOauthCookies(jar);
    return NextResponse.redirect(new URL("/login?google=exchange_failed", request.url));
  }

  const tokenSet = (await exchange.json()) as { id_token?: string };
  if (!tokenSet.id_token) {
    clearOauthCookies(jar);
    return NextResponse.redirect(new URL("/login?google=invalid_token", request.url));
  }

  try {
    const verified = await jwtVerify(tokenSet.id_token, jwks, {
      audience: clientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    const emailClaim = verified.payload.email;
    if (typeof emailClaim !== "string" || verified.payload.email_verified !== true || verified.payload.nonce !== nonce) throw new Error("Invalid Google identity claims.");

    const email = normalizeEmail(emailClaim);
    let user = await prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
    if (user?.suspendedAt) throw new Error("Suspended account.");

    if (!user) {
      const role = await prisma.role.findUniqueOrThrow({ where: { key: RoleType.STUDENT } });
      user = await prisma.user.create({
        data: {
          email,
          displayName: typeof verified.payload.name === "string" ? verified.payload.name.slice(0, 80) : email.split("@")[0],
          emailVerifiedAt: new Date(),
          roles: { create: { roleId: role.id } },
        },
        include: { roles: { include: { role: true } } },
      });
    } else if (!user.emailVerifiedAt) {
      user = await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() }, include: { roles: { include: { role: true } } } });
    }

    await createSession(request, user.id);
    await prisma.auditLog.create({ data: { actorId: user.id, action: "auth.google_login", targetType: "User", targetId: user.id } });
    clearOauthCookies(jar);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch {
    clearOauthCookies(jar);
    return NextResponse.redirect(new URL("/login?google=invalid_identity", request.url));
  }
}
