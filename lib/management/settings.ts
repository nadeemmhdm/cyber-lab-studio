import { LearningMode, Prisma, RoleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlatformControls = {
  maintenanceMode: boolean;
  allowedLearningModes: LearningMode[];
  showHints: boolean;
  showSolutions: boolean;
  maxLabStartsPerDay: number;
};

export const DEFAULT_PLATFORM_CONTROLS: PlatformControls = {
  maintenanceMode: false,
  allowedLearningModes: [LearningMode.GUIDED, LearningMode.PRACTICE, LearningMode.CHALLENGE],
  showHints: true,
  showSolutions: true,
  maxLabStartsPerDay: 50,
};

function isObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function getPlatformControls(tx: Prisma.TransactionClient | typeof prisma = prisma): Promise<PlatformControls> {
  const row = await tx.platformSetting.findUnique({ where: { key: "platform.controls" } });
  if (!row || !isObject(row.value)) return DEFAULT_PLATFORM_CONTROLS;
  const value = row.value;
  const modes = Array.isArray(value.allowedLearningModes)
    ? value.allowedLearningModes.filter((mode): mode is LearningMode => typeof mode === "string" && Object.values(LearningMode).includes(mode as LearningMode))
    : DEFAULT_PLATFORM_CONTROLS.allowedLearningModes;
  return {
    maintenanceMode: typeof value.maintenanceMode === "boolean" ? value.maintenanceMode : false,
    allowedLearningModes: modes.length ? modes : DEFAULT_PLATFORM_CONTROLS.allowedLearningModes,
    showHints: typeof value.showHints === "boolean" ? value.showHints : true,
    showSolutions: typeof value.showSolutions === "boolean" ? value.showSolutions : true,
    maxLabStartsPerDay: typeof value.maxLabStartsPerDay === "number" && Number.isInteger(value.maxLabStartsPerDay) && value.maxLabStartsPerDay > 0 ? Math.min(value.maxLabStartsPerDay, 500) : 50,
  };
}

export async function updatePlatformControls(actorId: string, controls: PlatformControls) {
  const clean: PlatformControls = {
    maintenanceMode: Boolean(controls.maintenanceMode),
    allowedLearningModes: Array.from(new Set(controls.allowedLearningModes)).filter((mode) => Object.values(LearningMode).includes(mode)),
    showHints: Boolean(controls.showHints),
    showSolutions: Boolean(controls.showSolutions),
    maxLabStartsPerDay: Math.max(1, Math.min(500, Math.trunc(controls.maxLabStartsPerDay))),
  };
  if (!clean.allowedLearningModes.length) clean.allowedLearningModes = [LearningMode.GUIDED];
  return prisma.$transaction(async (tx) => {
    const setting = await tx.platformSetting.upsert({
      where: { key: "platform.controls" },
      update: { value: clean },
      create: { key: "platform.controls", value: clean },
    });
    await tx.auditLog.create({ data: { actorId, action: "ADMIN_PLATFORM_CONTROLS_UPDATED", targetType: "PlatformSetting", targetId: setting.key, metadata: clean } });
    return clean;
  });
}

export async function userHasPrivilegedRole(tx: Prisma.TransactionClient, userId: string) {
  const count = await tx.userRole.count({ where: { userId, role: { key: { in: [RoleType.ADMIN, RoleType.INSTRUCTOR] } } } });
  return count > 0;
}
