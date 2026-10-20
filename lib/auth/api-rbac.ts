import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/rbac";
import { getPlatformControls } from "@/lib/platform/settings";

export async function requireApiRole(allowed: RoleType[]) {
  const session = await getCurrentSession();
  if (!session) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  if (!hasAnyRole(session.user.roles, allowed)) return { response: NextResponse.json({ error: "Insufficient role." }, { status: 403 }) } as const;
  if (!session.user.roles.includes(RoleType.ADMIN)) {
    const controls = await getPlatformControls();
    if (controls.maintenance.enabled) {
      return { response: NextResponse.json({ error: controls.maintenance.message, code: "MAINTENANCE_MODE" }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }) } as const;
    }
  }
  return { session } as const;
}
