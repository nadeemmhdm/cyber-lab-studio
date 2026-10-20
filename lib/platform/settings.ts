import { LearningMode, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlatformControls = {
  maintenance: { enabled: boolean; message: string };
  quota: { maxActiveEnvironmentsPerUser: number };
  learning: { allowedModes: LearningMode[]; showHints: boolean; showSolutions: boolean };
};

export const DEFAULT_PLATFORM_CONTROLS: PlatformControls = {
  maintenance: { enabled: false, message: "CyberLab is temporarily in maintenance mode." },
  quota: { maxActiveEnvironmentsPerUser: 8 },
  learning: { allowedModes: [LearningMode.GUIDED, LearningMode.PRACTICE, LearningMode.CHALLENGE], showHints: true, showSolutions: true },
};

function objectValue(value: Prisma.JsonValue | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function getPlatformControls(tx: Prisma.TransactionClient = prisma): Promise<PlatformControls> {
  const rows = await tx.platformSetting.findMany({ where: { key: { in: ["maintenance", "quota", "learning"] } } });
  const values = new Map(rows.map((row) => [row.key, objectValue(row.value)]));
  const maintenance = values.get("maintenance") ?? {};
  const quota = values.get("quota") ?? {};
  const learning = values.get("learning") ?? {};
  const allowed = Array.isArray(learning.allowedModes)
    ? learning.allowedModes.filter((mode): mode is LearningMode => Object.values(LearningMode).includes(mode as LearningMode))
    : DEFAULT_PLATFORM_CONTROLS.learning.allowedModes;

  return {
    maintenance: {
      enabled: typeof maintenance.enabled === "boolean" ? maintenance.enabled : DEFAULT_PLATFORM_CONTROLS.maintenance.enabled,
      message: typeof maintenance.message === "string" && maintenance.message.trim() ? maintenance.message.slice(0, 240) : DEFAULT_PLATFORM_CONTROLS.maintenance.message,
    },
    quota: {
      maxActiveEnvironmentsPerUser: typeof quota.maxActiveEnvironmentsPerUser === "number"
        ? Math.max(1, Math.min(100, Math.floor(quota.maxActiveEnvironmentsPerUser)))
        : DEFAULT_PLATFORM_CONTROLS.quota.maxActiveEnvironmentsPerUser,
    },
    learning: {
      allowedModes: allowed.length ? allowed : [LearningMode.GUIDED],
      showHints: typeof learning.showHints === "boolean" ? learning.showHints : DEFAULT_PLATFORM_CONTROLS.learning.showHints,
      showSolutions: typeof learning.showSolutions === "boolean" ? learning.showSolutions : DEFAULT_PLATFORM_CONTROLS.learning.showSolutions,
    },
  };
}

export async function savePlatformControls(tx: Prisma.TransactionClient, controls: PlatformControls) {
  await Promise.all([
    tx.platformSetting.upsert({ where: { key: "maintenance" }, update: { value: controls.maintenance }, create: { key: "maintenance", value: controls.maintenance } }),
    tx.platformSetting.upsert({ where: { key: "quota" }, update: { value: controls.quota }, create: { key: "quota", value: controls.quota } }),
    tx.platformSetting.upsert({ where: { key: "learning" }, update: { value: controls.learning }, create: { key: "learning", value: controls.learning } }),
  ]);
}
