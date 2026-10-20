import { DoubtStatus, RoleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class DoubtError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = "DoubtError";
  }
}

export type DoubtAttachmentInput = { fileName: string; mimeType: "image/png" | "image/jpeg" | "image/webp"; data: Uint8Array<ArrayBuffer> };
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function validateMessage(message: string) {
  const value = message.trim();
  if (value.length < 2 || value.length > 6000) throw new DoubtError("MESSAGE_INVALID", "Doubt message must contain 2-6000 characters.");
  return value;
}

function validateAttachment(attachment?: DoubtAttachmentInput | null) {
  if (!attachment) return null;
  if (!ALLOWED_MIME.has(attachment.mimeType)) throw new DoubtError("IMAGE_TYPE_INVALID", "Screenshot must be PNG, JPEG, or WebP.", 415);
  if (!attachment.data.length || attachment.data.length > MAX_IMAGE_BYTES) throw new DoubtError("IMAGE_SIZE_INVALID", "Screenshot must be smaller than 2 MB.", 413);
  return { fileName: attachment.fileName.trim().slice(0, 180) || "screenshot.png", mimeType: attachment.mimeType, sizeBytes: attachment.data.length, data: attachment.data };
}

async function rolesForUser(userId: string) {
  const rows = await prisma.userRole.findMany({ where: { userId }, include: { role: { select: { key: true } } } });
  return rows.map((entry) => entry.role.key);
}

export async function createLabDoubt(studentId: string, labSlug: string, message: string, attachment?: DoubtAttachmentInput | null) {
  const text = validateMessage(message);
  const image = validateAttachment(attachment);
  const studentRoles = await rolesForUser(studentId);
  if (!studentRoles.includes(RoleType.STUDENT)) throw new DoubtError("STUDENT_REQUIRED", "Only student accounts can open lab doubts.", 403);
  const [lab, assignment] = await Promise.all([
    prisma.lab.findUnique({ where: { slug: labSlug }, select: { id: true, number: true, title: true } }),
    prisma.instructorAssignment.findFirst({ where: { studentId, instructor: { suspendedAt: null } }, orderBy: { createdAt: "asc" }, select: { instructorId: true } }),
  ]);
  if (!lab) throw new DoubtError("LAB_NOT_FOUND", "Lab not found.", 404);
  if (!assignment) throw new DoubtError("INSTRUCTOR_NOT_ASSIGNED", "No instructor is assigned to your account yet. Ask an administrator to assign one.", 409);

  return prisma.$transaction(async (tx) => {
    const thread = await tx.doubtThread.create({ data: { studentId, instructorId: assignment.instructorId, labId: lab.id } });
    const createdMessage = await tx.doubtMessage.create({
      data: {
        threadId: thread.id,
        authorId: studentId,
        message: text,
        ...(image ? { attachments: { create: image } } : {}),
      },
      include: { attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } } },
    });
    await tx.auditLog.create({ data: { actorId: studentId, action: "doubt.thread.created", targetType: "DoubtThread", targetId: thread.id, metadata: { labId: lab.id, instructorId: assignment.instructorId, hasScreenshot: Boolean(image) } } });
    return { thread, message: createdMessage, lab };
  });
}

export async function listStudentDoubts(studentId: string) {
  return prisma.doubtThread.findMany({
    where: { studentId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      lab: { select: { number: true, slug: true, title: true } },
      instructor: { select: { displayName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { message: true, createdAt: true, authorId: true } },
    },
  });
}

export async function listInstructorDoubts(instructorId: string, includeAll = false) {
  return prisma.doubtThread.findMany({
    where: includeAll ? {} : { instructorId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      lab: { select: { number: true, slug: true, title: true } },
      student: { select: { id: true, username: true, displayName: true } },
      instructor: { select: { id: true, displayName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { message: true, createdAt: true, authorId: true } },
    },
  });
}

async function authorizeThread(userId: string, threadId: string) {
  const thread = await prisma.doubtThread.findUnique({
    where: { id: threadId },
    include: { lab: { select: { number: true, slug: true, title: true } }, student: { select: { id: true, username: true, displayName: true } }, instructor: { select: { id: true, displayName: true } } },
  });
  if (!thread) throw new DoubtError("DOUBT_NOT_FOUND", "Doubt conversation not found.", 404);
  const roles = await rolesForUser(userId);
  const admin = roles.includes(RoleType.ADMIN);
  if (!admin && thread.studentId !== userId && thread.instructorId !== userId) throw new DoubtError("DOUBT_FORBIDDEN", "You cannot access this doubt conversation.", 403);
  return { thread, roles, admin };
}

export async function getDoubtThread(userId: string, threadId: string) {
  const auth = await authorizeThread(userId, threadId);
  const messages = await prisma.doubtMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: {
      author: { select: { id: true, displayName: true, username: true, roles: { include: { role: { select: { key: true } } } } } },
      attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
    },
  });
  return { ...auth, messages };
}

export async function replyToDoubt(userId: string, threadId: string, message: string, attachment?: DoubtAttachmentInput | null) {
  const text = validateMessage(message);
  const image = validateAttachment(attachment);
  const { thread, roles, admin } = await authorizeThread(userId, threadId);
  if (thread.status === DoubtStatus.CLOSED) throw new DoubtError("DOUBT_CLOSED", "This doubt conversation is closed.", 409);
  const isStudent = thread.studentId === userId && roles.includes(RoleType.STUDENT);
  const isInstructor = thread.instructorId === userId && roles.includes(RoleType.INSTRUCTOR);
  if (!isStudent && !isInstructor && !admin) throw new DoubtError("DOUBT_FORBIDDEN", "You cannot reply to this conversation.", 403);
  return prisma.$transaction(async (tx) => {
    const created = await tx.doubtMessage.create({
      data: { threadId, authorId: userId, message: text, ...(image ? { attachments: { create: image } } : {}) },
      include: { attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } } },
    });
    const nextStatus = isStudent ? DoubtStatus.OPEN : DoubtStatus.ANSWERED;
    await tx.doubtThread.update({ where: { id: threadId }, data: { status: nextStatus, updatedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: userId, action: isStudent ? "doubt.student.replied" : "doubt.instructor.replied", targetType: "DoubtThread", targetId: threadId, metadata: { hasScreenshot: Boolean(image) } } });
    return created;
  });
}

export async function setDoubtStatus(userId: string, threadId: string, status: DoubtStatus) {
  const { thread, roles, admin } = await authorizeThread(userId, threadId);
  const instructor = thread.instructorId === userId && roles.includes(RoleType.INSTRUCTOR);
  const student = thread.studentId === userId && roles.includes(RoleType.STUDENT);
  if (status === DoubtStatus.CLOSED && !student && !instructor && !admin) throw new DoubtError("DOUBT_FORBIDDEN", "You cannot close this conversation.", 403);
  if (status !== DoubtStatus.CLOSED && !instructor && !admin) throw new DoubtError("DOUBT_FORBIDDEN", "Only the assigned instructor can change this status.", 403);
  await prisma.$transaction([
    prisma.doubtThread.update({ where: { id: threadId }, data: { status, updatedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorId: userId, action: "doubt.status.updated", targetType: "DoubtThread", targetId: threadId, metadata: { status } } }),
  ]);
}

export async function getDoubtAttachment(userId: string, threadId: string, attachmentId: string) {
  await authorizeThread(userId, threadId);
  const attachment = await prisma.doubtAttachment.findFirst({ where: { id: attachmentId, message: { threadId } } });
  if (!attachment) throw new DoubtError("ATTACHMENT_NOT_FOUND", "Screenshot not found.", 404);
  return attachment;
}
