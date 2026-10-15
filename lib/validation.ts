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
 * Vorgangskennung der Videoschnittstelle des Gateways (ADR 0002), damit die
 * Statusroute keine beliebigen Pfade an den Gateway reicht. Gemessen
 * 15.10.2026: `video_` plus Base64 (etwa 190 Zeichen, enthält Anbieter,
 * Modell und die Google-Operation).
 */
export function isValidVideoJobId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  if (id.length < 7 || id.length > 1024) return false;
  return /^video_[A-Za-z0-9+/=_-]+$/.test(id);
}
