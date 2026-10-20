import { AttemptStatus, Prisma, ProgressStatus } from "@prisma/client";
import { evaluateAchievements } from "@/lib/achievements/evaluator";
import { LabEngineError, resolvePublishedLab } from "@/lib/labs/engine";
import { validateLabEvidence } from "@/lib/labs/validators";
import { prisma } from "@/lib/prisma";
import { generateCompletionFlag } from "@/lib/security/flags";

async function issueFlag(tx: Prisma.TransactionClient, userId: string, labId: string, completionId: string) {
  const existing = await tx.flag.findUnique({ where: { userId_labId: { userId, labId } } });
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await tx.flag.create({ data: { userId, labId, completionId, value: generateCompletionFlag() } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new LabEngineError("FLAG_ISSUANCE_FAILED", "Unable to issue a unique completion flag.", 500);
}

export async function submitLabForValidation(userId: string, slug: string) {
  return prisma.$transaction(async (tx) => {
    const { lab, version } = await resolvePublishedLab(slug, tx);

    const existingCompletion = await tx.completionRecord.findUnique({
      where: { userId_labId: { userId, labId: lab.id } },
      include: { flag: true },
    });
    if (existingCompletion?.flag) {
      return {
        passed: true,
        completed: true,
        flag: existingCompletion.flag.value,
        feedback: [{ label: "Lab was already validated", passed: true }],
        achievements: [] as { key: string; name: string }[],
      };
    }

    const [environment, progress, attempt, terminalHistory, queryHistory] = await Promise.all([
      tx.labEnvironment.findUnique({ where: { userId_labId_labVersionId: { userId, labId: lab.id, labVersionId: version.id } } }),
      tx.labProgress.findUnique({ where: { userId_labId: { userId, labId: lab.id } } }),
      tx.labAttempt.findFirst({ where: { userId, labId: lab.id, labVersionId: version.id }, orderBy: { startedAt: "desc" } }),
      tx.terminalHistory.findMany({ where: { userId, environmentId: { not: null } }, orderBy: { createdAt: "asc" } }),
      tx.queryHistory.findMany({ where: { userId, environmentId: { not: null } }, orderBy: { createdAt: "asc" } }),
    ]);

    if (!environment) throw new LabEngineError("ENVIRONMENT_NOT_STARTED", "Start the lab before validation.", 409);
    if (!progress || !attempt) throw new LabEngineError("ATTEMPT_NOT_STARTED", "Start the lab before validation.", 409);

    const scopedTerminal = terminalHistory.filter((entry) => entry.environmentId === environment.id);
    const scopedQueries = queryHistory.filter((entry) => entry.environmentId === environment.id);
    const feedback = validateLabEvidence({
      labNumber: lab.number,
      platform: lab.platform,
      taskCount: version.tasks.length,
      lastTaskPosition: progress.lastTaskPosition,
      environmentState: environment.environmentState,
      initialState: version.initialState,
      terminalHistory: scopedTerminal.map((entry) => ({ command: entry.command, exitCode: entry.exitCode })),
      queryHistory: scopedQueries.map((entry) => ({ query: entry.query, rowCount: entry.rowCount, errorCode: entry.errorCode })),
    });
    const passed = feedback.every((check) => check.passed);
    const now = new Date();

    await tx.validationResult.upsert({
      where: { attemptId: attempt.id },
      update: { passed, feedback },
      create: { attemptId: attempt.id, passed, feedback },
    });

    if (!passed) {
      await tx.labAttempt.update({ where: { id: attempt.id }, data: { status: AttemptStatus.FAILED, submittedAt: now } });
      await tx.auditLog.create({ data: { actorId: userId, action: "LAB_VALIDATION_FAILED", targetType: "Lab", targetId: lab.id, metadata: { labNumber: lab.number, version: version.version } } });
      return { passed: false, completed: false, feedback, achievements: [] as { key: string; name: string }[] };
    }

    const completion = await tx.completionRecord.create({ data: { userId, labId: lab.id, labVersionId: version.id, completedAt: now } });
    const flag = await issueFlag(tx, userId, lab.id, completion.id);

    await Promise.all([
      tx.labProgress.upsert({
        where: { userId_labId: { userId, labId: lab.id } },
        create: { userId, labId: lab.id, status: ProgressStatus.COMPLETED, completionPct: 100, lastTaskPosition: version.tasks.length, startedAt: attempt.startedAt, completedAt: now },
        update: { status: ProgressStatus.COMPLETED, completionPct: 100, lastTaskPosition: version.tasks.length, completedAt: now },
      }),
      tx.labEnvironment.update({ where: { id: environment.id }, data: { completedAt: now } }),
      tx.labAttempt.update({ where: { id: attempt.id }, data: { status: AttemptStatus.PASSED, submittedAt: now, completedAt: now } }),
      tx.auditLog.create({ data: { actorId: userId, action: "LAB_VALIDATION_PASSED", targetType: "Lab", targetId: lab.id, metadata: { labNumber: lab.number, version: version.version, completionId: completion.id } } }),
    ]);

    const achievements = await evaluateAchievements(tx, userId);
    return { passed: true, completed: true, flag: flag.value, feedback, achievements };
  });
}
