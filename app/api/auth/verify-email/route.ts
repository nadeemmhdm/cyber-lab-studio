import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeAuthToken } from "@/lib/auth/tokens";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/login?verification=invalid", request.url));

  const consumed = await consumeAuthToken("verify-email", token);
  if (!consumed) return NextResponse.redirect(new URL("/login?verification=invalid", request.url));

  const user = await prisma.user.update({ where: { id: consumed.userId }, data: { emailVerifiedAt: new Date() } });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "auth.email_verified", targetType: "User", targetId: user.id } });
  return NextResponse.redirect(new URL("/login?verification=success", request.url));
}
