import type { DoubtAttachmentInput } from "@/lib/doubts/service";
import { DoubtError } from "@/lib/doubts/service";

const MAX_MULTIPART_BYTES = 2 * 1024 * 1024 + 32 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function readDoubtForm(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_MULTIPART_BYTES) throw new DoubtError("PAYLOAD_TOO_LARGE", "Doubt request is too large.", 413);
  const form = await request.formData();
  const message = String(form.get("message") ?? "");
  const file = form.get("screenshot");
  let attachment: DoubtAttachmentInput | null = null;
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED.has(file.type)) throw new DoubtError("IMAGE_TYPE_INVALID", "Screenshot must be PNG, JPEG, or WebP.", 415);
    if (file.size > 2 * 1024 * 1024) throw new DoubtError("IMAGE_SIZE_INVALID", "Screenshot must be smaller than 2 MB.", 413);
    attachment = { fileName: file.name || "screenshot.png", mimeType: file.type as DoubtAttachmentInput["mimeType"], data: Buffer.from(await file.arrayBuffer()) };
  }
  return { message, attachment };
}
