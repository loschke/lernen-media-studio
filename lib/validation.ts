/**
 * Shared input caps for API routes. Anything above these limits is an abuse
 * signal — refuse early, before hitting Gemini.
 */
export const MAX_PROMPT_CHARS = 2000;
export const MAX_VIDEO_PROMPT_CHARS = 1024; // eigene Grenze gegen Missbrauch (früher die harte Grenze von Veo)
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
 * Vorgangskennung der Interactions API (ADR 0003), damit die Statusroute keine
 * beliebigen Pfade an den Gateway reicht. Gemessen 05.11.2026: `v1_` plus
 * URL-sicheres Base64, 70 Zeichen. Erlaubt sind nur Zeichen, die in einem
 * Pfadabschnitt nichts anrichten.
 */
/** Kennung eines Galerie-Eintrags (`crypto.randomUUID()`), bevor sie in einen Speicherpfad wandert. */
export function isValidGalleryId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9-]{8,64}$/.test(id);
}

export function isValidVideoJobId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  return /^[A-Za-z0-9_-]{10,512}$/.test(id);
}
