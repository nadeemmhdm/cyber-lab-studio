import type { RoleType } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { firebaseAdminConfigured, getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "cyberlab_session";

export type SessionUser = {
  id: string;
  firebaseUid: string | null;
  email: string;
  displayName: string;
  emailVerifiedAt: Date | null;
  roles: RoleType[];
};

export function firebaseSessionCookieOptions(expires?: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function getCurrentSession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw || !firebaseAdminConfigured()) return null;

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(raw, true);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      include: { roles: { include: { role: true } } },
    });
    if (!user || user.suspendedAt) return null;
    return {
      sessionId: decoded.uid,
      expiresAt: new Date(Number(decoded.exp) * 1000),
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        emailVerifiedAt: user.emailVerifiedAt,
        roles: user.roles.map((entry) => entry.role.key),
      } satisfies SessionUser,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export async function revokeCurrentSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...firebaseSessionCookieOptions(new Date(0)), maxAge: 0 });
}

export async function revokeAllSessions(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firebaseUid: true } });
  if (user?.firebaseUid && firebaseAdminConfigured()) {
    await getFirebaseAdminAuth().revokeRefreshTokens(user.firebaseUid);
  }
  await revokeCurrentSession();
}
