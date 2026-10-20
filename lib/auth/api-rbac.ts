import type { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/rbac";

export async function requireApiRole(allowed: RoleType[]) {
  const session = await getCurrentSession();
  if (!session) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  if (!hasAnyRole(session.user.roles, allowed)) return { response: NextResponse.json({ error: "Insufficient role." }, { status: 403 }) } as const;
  return { session } as const;
}
