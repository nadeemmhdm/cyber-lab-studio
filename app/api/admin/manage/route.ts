import { LearningMode, RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import {
  ManagementError, assignInstructor, createLabVersion, getAdminOverview, publishLabVersion,
  removeInstructorAssignment, setUserRoles, setUserSuspended, updateLabMetadata, updatePublishedCurriculum,
} from "@/lib/management/service";
import { getPlatformControls, updatePlatformControls } from "@/lib/management/settings";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("user.roles"), userId: z.string().min(1), roles: z.array(z.nativeEnum(RoleType)).min(1) }),
  z.object({ action: z.literal("user.suspend"), userId: z.string().min(1), suspended: z.boolean() }),
  z.object({ action: z.literal("assignment.set"), instructorId: z.string().min(1), studentId: z.string().min(1) }),
  z.object({ action: z.literal("assignment.remove"), instructorId: z.string().min(1), studentId: z.string().min(1) }),
  z.object({ action: z.literal("lab.update"), slug: z.string().min(1), enabled: z.boolean().optional(), title: z.string().max(160).optional(), objective: z.string().max(500).optional(), estimatedMinutes: z.number().int().min(5).max(480).optional() }),
  z.object({ action: z.literal("curriculum.update"), slug: z.string().min(1), conceptExplanation: z.string().max(12000).optional(), scenario: z.string().max(8000).optional(), hints: z.array(z.string().max(4000)).length(3).optional(), solutionSummary: z.string().max(8000).optional() }),
  z.object({ action: z.literal("version.create"), slug: z.string().min(1) }),
  z.object({ action: z.literal("version.publish"), slug: z.string().min(1), version: z.number().int().positive() }),
  z.object({ action: z.literal("controls.update"), maintenanceMode: z.boolean(), allowedLearningModes: z.array(z.nativeEnum(LearningMode)).min(1), showHints: z.boolean(), showSolutions: z.boolean(), maxLabStartsPerDay: z.number().int().min(1).max(500) }),
]);

export async function GET() {
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  const [overview, controls] = await Promise.all([getAdminOverview(), getPlatformControls()]);
  return NextResponse.json({ ...overview, controls });
}

export async function PATCH(request: Request) {
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid management request." }, { status: 400 });
  const actorId = auth.session.user.id;
  try {
    const data = parsed.data;
    let result: unknown;
    switch (data.action) {
      case "user.roles": result = await setUserRoles(actorId, data.userId, data.roles); break;
      case "user.suspend": result = await setUserSuspended(actorId, data.userId, data.suspended); break;
      case "assignment.set": result = await assignInstructor(actorId, data.instructorId, data.studentId); break;
      case "assignment.remove": result = await removeInstructorAssignment(actorId, data.instructorId, data.studentId); break;
      case "lab.update": result = await updateLabMetadata(actorId, data.slug, data); break;
      case "curriculum.update": result = await updatePublishedCurriculum(actorId, data.slug, data); break;
      case "version.create": result = await createLabVersion(actorId, data.slug); break;
      case "version.publish": result = await publishLabVersion(actorId, data.slug, data.version); break;
      case "controls.update": result = await updatePlatformControls(actorId, data); break;
    }
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof ManagementError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("Admin management action failed", error);
    return NextResponse.json({ error: "Management action failed." }, { status: 500 });
  }
}
