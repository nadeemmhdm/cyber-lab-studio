import { RoleType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-rbac";
import { sameOrigin } from "@/lib/auth/security";
import { ManagementError, updateLabManagement } from "@/lib/management/service";

const schema = z.object({
  enabled: z.boolean().optional(),
  title: z.string().min(1).max(160).optional(),
  objective: z.string().min(1).max(1000).optional(),
  version: z.object({ id: z.string().min(1), published: z.boolean().optional(), conceptExplanation: z.string().max(12000).optional(), scenario: z.string().max(12000).optional() }).optional(),
  hint: z.object({ id: z.string().min(1), content: z.string().min(1).max(8000) }).optional(),
  solution: z.object({ id: z.string().min(1), summary: z.string().max(12000).optional(), verification: z.string().max(12000).optional(), commonMistakes: z.string().max(12000).optional(), troubleshooting: z.string().max(12000).optional() }).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const auth = await requireApiRole([RoleType.ADMIN]);
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid lab management payload." }, { status: 400 });
  const { id } = await params;
  try {
    const lab = await updateLabManagement(auth.session.user.id, id, parsed.data);
    return NextResponse.json({ ok: true, lab });
  } catch (error) {
    if (error instanceof ManagementError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("lab management update failed", error);
    return NextResponse.json({ error: "Unable to update lab." }, { status: 500 });
  }
}
