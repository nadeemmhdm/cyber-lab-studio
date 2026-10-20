import { timingSafeEqual } from "node:crypto";
import { RoleType } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CSRF_COOKIE } from "@/app/api/auth/csrf/route";
import { SESSION_COOKIE, firebaseSessionCookieOptions } from "@/lib/auth/session";
import { sameOrigin } from "@/lib/auth/security";
import { firebaseAdminConfigured, getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ idToken: z.string().min(20), csrfToken: z.string().min(20) });
const SESSION_MS = 1000 * 60 * 60 * 24 * 5;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!firebaseAdminConfigured()) return NextResponse.json({ error: "Firebase Admin is not configured." }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sign-in payload." }, { status: 400 });

  const jar = await cookies();
  const storedCsrf = jar.get(CSRF_COOKIE)?.value ?? "";
  if (!storedCsrf || !safeEqual(storedCsrf, parsed.data.csrfToken)) {
    return NextResponse.json({ error: "CSRF validation failed." }, { status: 403 });
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(parsed.data.idToken);
    const authTime = Number(decoded.auth_time ?? 0) * 1000;
    if (!authTime || Date.now() - authTime > 5 * 60 * 1000) {
      return NextResponse.json({ error: "A recent sign-in is required." }, { status: 401 });
    }

    const email = decoded.email?.trim().toLowerCase();
    if (!email || decoded.email_verified !== true) {
      return NextResponse.json({ error: "Verify your email before signing in." }, { status: 403 });
    }

    const displayName = typeof decoded.name === "string" && decoded.name.trim() ? decoded.name.trim().slice(0, 120) : email.split("@")[0];
    const existing = await prisma.user.findFirst({ where: { OR: [{ firebaseUid: decoded.uid }, { email }] } });
    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { firebaseUid: decoded.uid, email, displayName, emailVerifiedAt: existing.emailVerifiedAt ?? new Date() },
      });
    } else {
      const studentRole = await prisma.role.upsert({
        where: { key: RoleType.STUDENT },
        update: {},
        create: { key: RoleType.STUDENT, name: "Student", description: "Learns and completes labs." },
      });
      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email,
          displayName,
          emailVerifiedAt: new Date(),
          roles: { create: { roleId: studentRole.id } },
        },
      });
    }

    if (user.suspendedAt) return NextResponse.json({ error: "This account is suspended." }, { status: 403 });

    const sessionCookie = await auth.createSessionCookie(parsed.data.idToken, { expiresIn: SESSION_MS });
    jar.set(SESSION_COOKIE, sessionCookie, firebaseSessionCookieOptions(new Date(Date.now() + SESSION_MS)));
    jar.set(CSRF_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "auth.firebase.session.created", targetType: "User", targetId: user.id } });

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch (error) {
    console.error("Firebase session creation failed", error);
    return NextResponse.json({ error: "Unable to create a secure session." }, { status: 401 });
  }
}
