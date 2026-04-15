/**
 * Shared input caps for API routes. Anything above these limits is an abuse
 * signal — refuse early, before hitting Gemini.
 */
export const MAX_PROMPT_CHARS = 2000;
export const MAX_VIDEO_PROMPT_CHARS = 1024; // Veo API hard limit
export const MAX_REF_IMAGES = 3;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB per uploaded image
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function base64ByteLength(data: string): number {
  const cleaned = data.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  // Each 4 base64 chars = 3 bytes; padding `=` chars subtract.
  const padding = (cleaned.match(/=+$/)?.[0] ?? "").length;
  return Math.floor((cleaned.length * 3) / 4) - padding;
}

/**
 * Validate a Veo operation name so we don't blindly proxy arbitrary IDs to
 * the Gemini API. Format seen in practice:
 *   `models/<model-id>/operations/<opaque-id>`
 * We accept a conservative alphanumeric + `-._/:` charset.
 */
export function isValidOperationName(name: unknown): name is string {
  if (typeof name !== "string") return false;
  if (name.length === 0 || name.length > 256) return false;
  if (!/^models\/[A-Za-z0-9._-]+\/operations\/[A-Za-z0-9._-]+$/.test(name)) {
    return false;
  }
  return true;
}
