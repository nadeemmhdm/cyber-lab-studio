import type { RoleType } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export function hasAnyRole(userRoles: RoleType[], allowed: RoleType[]) {
  return allowed.some((role) => userRoles.includes(role));
}

export async function requireRole(allowed: RoleType[]) {
  const session = await requireUser();
  if (!hasAnyRole(session.user.roles, allowed)) redirect("/dashboard?denied=1");
  return session;
}
