import { createHash } from "node:crypto";
import { getClientIp } from "@/lib/auth/security";

type Bucket = { count: number; resetAt: number; lastSeen: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export class RequestGuardError extends Error {
  constructor(public readonly code: "PAYLOAD_TOO_LARGE" | "RATE_LIMITED" | "INVALID_JSON", message: string, public readonly status: number, public readonly retryAfter?: number) {
    super(message);
    this.name = "RequestGuardError";
  }
}

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function cleanup(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  if (buckets.size < MAX_BUCKETS) return;
  const oldest = [...buckets.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen).slice(0, Math.ceil(MAX_BUCKETS * 0.1));
  for (const [key] of oldest) buckets.delete(key);
}

export function consumeRateLimit(rawKey: string, limit: number, windowMs: number, now = Date.now()) {
  cleanup(now);
  const key = digest(rawKey);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs, lastSeen: now };
    buckets.set(key, bucket);
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfter: Math.ceil(windowMs / 1000) };
  }
  existing.count += 1;
  existing.lastSeen = now;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return { allowed: existing.count <= limit, remaining: Math.max(0, limit - existing.count), retryAfter };
}

export function enforceRateLimit(request: Request, scope: string, subject: string | null | undefined, options: { limit: number; windowMs: number }) {
  const identity = subject || getClientIp(request);
  const result = consumeRateLimit(`${scope}:${identity}`, options.limit, options.windowMs);
  if (!result.allowed) throw new RequestGuardError("RATE_LIMITED", "Too many requests. Try again shortly.", 429, result.retryAfter);
  return result;
}

export async function readJsonLimited(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestGuardError("PAYLOAD_TOO_LARGE", `Request body exceeds ${maxBytes} bytes.`, 413);
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new RequestGuardError("PAYLOAD_TOO_LARGE", `Request body exceeds ${maxBytes} bytes.`, 413);
  try { return text ? JSON.parse(text) : null; }
  catch { throw new RequestGuardError("INVALID_JSON", "Request body must be valid JSON.", 400); }
}

export function requestGuardResponse(error: RequestGuardError) {
  const headers = error.retryAfter ? { "Retry-After": String(error.retryAfter), "Cache-Control": "no-store" } : { "Cache-Control": "no-store" };
  return Response.json({ error: error.message, code: error.code }, { status: error.status, headers });
}

export function resetRateLimitsForTests() { buckets.clear(); }
