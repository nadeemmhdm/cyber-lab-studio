import type { Prisma } from "@prisma/client";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/achievements/definitions";

export async function evaluateAchievements(tx: Prisma.TransactionClient, userId: string) {
  const [completions, challengePasses, existing] = await Promise.all([
    tx.completionRecord.findMany({ where: { userId }, include: { lab: { select: { number: true } } } }),
    tx.labAttempt.count({ where: { userId, status: "PASSED", mode: "CHALLENGE" } }),
    tx.userAchievement.findMany({ where: { userId }, select: { achievement: { select: { key: true } } } }),
  ]);

  const completedNumbers = new Set(completions.map((entry) => entry.lab.number));
  const existingKeys = new Set(existing.map((entry) => entry.achievement.key));
  const earnedNow: { key: string; name: string }[] = [];

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    const criteria = definition.criteria;
    const eligible = criteria.type === "completion-count"
      ? completions.length >= (criteria.value ?? Number.POSITIVE_INFINITY)
      : criteria.type === "lab-set"
        ? (criteria.labs ?? []).every((number) => completedNumbers.has(number))
        : criteria.type === "passed-mode"
          ? criteria.mode === "CHALLENGE" && challengePasses > 0
          : false;
    if (!eligible) continue;

    const achievement = await tx.achievement.upsert({
      where: { key: definition.key },
      update: { name: definition.name, description: definition.description, criteria: definition.criteria },
      create: { key: definition.key, name: definition.name, description: definition.description, criteria: definition.criteria },
    });
    await tx.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      update: {},
      create: { userId, achievementId: achievement.id },
    });
    if (!existingKeys.has(definition.key)) earnedNow.push({ key: definition.key, name: definition.name });
  }

  return earnedNow;
}
