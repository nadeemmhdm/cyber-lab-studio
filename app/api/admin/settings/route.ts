import { LearningMode, RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { updatePlatformControls } from "@/lib/management/service";
import { enforceRateLimit, readJsonLimited, RequestGuardError, requestGuardResponse } from "@/lib/security/request-guard";

const schema = z.object({ maintenanceEnabled: z.boolean().optional(), maintenanceMessage: z.string().max(240).optional(), maxActiveEnvironmentsPerUser: z.number().int().min(1).max(100).optional(), allowedModes: z.array(z.nativeEnum(LearningMode)).min(1).max(3).optional(), showHints: z.boolean().optional(), showSolutions: z.boolean().optional() });

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  try {
    enforceRateLimit(request, "admin.settings", auth.session.user.id, { limit: 20, windowMs: 60_000 });
    const parsed = schema.safeParse(await readJsonLimited(request, 16 * 1024));
    if (!parsed.success) return NextResponse.json({ error: "Invalid platform settings payload." }, { status: 400 });
    return NextResponse.json({ ok: true, controls: await updatePlatformControls(auth.session.user.id, parsed.data) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestGuardError) return requestGuardResponse(error);
    throw error;
  }
}
