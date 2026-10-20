import { LearningMode, RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { updatePlatformControls } from "@/lib/management/service";

const schema = z.object({
  maintenanceEnabled: z.boolean().optional(),
  maintenanceMessage: z.string().max(240).optional(),
  maxActiveEnvironmentsPerUser: z.number().int().min(1).max(100).optional(),
  allowedModes: z.array(z.nativeEnum(LearningMode)).min(1).max(3).optional(),
  showHints: z.boolean().optional(),
  showSolutions: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid platform settings payload." }, { status: 400 });
  const controls = await updatePlatformControls(auth.session.user.id, parsed.data);
  return NextResponse.json({ ok: true, controls });
}
