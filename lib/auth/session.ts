import type { RoleType } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createOpaqueToken, hashToken } from "@/lib/auth/crypto";
import { getClientIp, hashIdentifier } from "@/lib/auth/security";

export const SESSION_COOKIE = "cyberlab_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerifiedAt: Date | null;
  roles: RoleType[];
};

function cookieOptions(expires?: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createSession(request: Request, userId: string) {
  const raw = createOpaqueToken(32);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      ipHash: hashIdentifier(getClientIp(request)),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, raw, cookieOptions(expiresAt));
}

export async function getCurrentSession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: { include: { roles: { include: { role: true } } } } },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.suspendedAt) return null;

  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    user: {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      emailVerifiedAt: session.user.emailVerifiedAt,
      roles: session.user.roles.map((entry) => entry.role.key),
    } satisfies SessionUser,
  };
}

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export async function revokeCurrentSession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.set(SESSION_COOKIE, "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}

export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}
