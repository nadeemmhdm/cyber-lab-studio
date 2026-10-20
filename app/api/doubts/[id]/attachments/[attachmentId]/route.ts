import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { DoubtError, getDoubtAttachment } from "@/lib/doubts/service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const { id, attachmentId } = await params;
    const attachment = await getDoubtAttachment(session.user.id, id, attachmentId);
    return new Response(attachment.data, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.sizeBytes),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        "Cache-Control": "private, max-age=300, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DoubtError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("doubt screenshot fetch failed", error);
    return NextResponse.json({ error: "Unable to load screenshot." }, { status: 500 });
  }
}
