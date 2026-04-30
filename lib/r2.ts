import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  // Don't throw at module load — let routes handle missing config gracefully
  console.warn("R2 config incomplete. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.");
}

export const r2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucketName);

export const r2Client = r2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })
  : null;

export const R2_BUCKET = bucketName!;

export interface MediaMetadata {
  prompt: string;
  timestamp: number;
  mediaType: string;
  /** File extension without dot, e.g. "png" or "mp4". Older entries may omit this. */
  ext?: string;
}

// Back-compat alias
export type ImageMetadata = MediaMetadata;

function mediaKey(sessionId: string, id: string, ext: string) {
  return `sessions/${sessionId}/${id}.${ext}`;
}
function metaKey(sessionId: string, id: string) {
  return `sessions/${sessionId}/${id}.json`;
}

function extFromMediaType(mediaType: string): string {
  if (mediaType.startsWith("video/mp4")) return "mp4";
  if (mediaType.startsWith("video/")) return mediaType.split("/")[1] || "mp4";
  if (mediaType.startsWith("image/png")) return "png";
  if (mediaType.startsWith("image/jpeg")) return "jpg";
  if (mediaType.startsWith("image/webp")) return "webp";
  if (mediaType.startsWith("image/")) return mediaType.split("/")[1] || "png";
  return "bin";
}

/**
 * Upload a media blob (image or video) and its metadata sidecar.
 */
export async function uploadMedia(
  sessionId: string,
  id: string,
  buffer: Buffer,
  metadata: MediaMetadata
): Promise<void> {
  if (!r2Client) throw new Error("R2 not configured");

  const ext = metadata.ext ?? extFromMediaType(metadata.mediaType);
  const fullMeta: MediaMetadata = { ...metadata, ext };

  await Promise.all([
    r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: mediaKey(sessionId, id, ext),
        Body: buffer,
        ContentType: metadata.mediaType,
      })
    ),
    r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: metaKey(sessionId, id),
        Body: JSON.stringify(fullMeta),
        ContentType: "application/json",
      })
    ),
  ]);
}

// Back-compat wrapper used by the image generate/edit routes.
export async function uploadImage(
  sessionId: string,
  id: string,
  imageBuffer: Buffer,
  metadata: MediaMetadata
): Promise<void> {
  return uploadMedia(sessionId, id, imageBuffer, metadata);
}

async function readMeta(
  sessionId: string,
  id: string
): Promise<MediaMetadata | null> {
  if (!r2Client) throw new Error("R2 not configured");
  try {
    const res = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: metaKey(sessionId, id),
      })
    );
    const text = await res.Body!.transformToString();
    return JSON.parse(text) as MediaMetadata;
  } catch {
    return null;
  }
}

/**
 * Delete both media and sidecar. Looks up the extension via the sidecar;
 * falls back to ".png" for legacy entries.
 */
export async function deleteImage(sessionId: string, id: string): Promise<void> {
  if (!r2Client) throw new Error("R2 not configured");
  const meta = await readMeta(sessionId, id);
  const ext = meta?.ext ?? extFromMediaType(meta?.mediaType ?? "image/png");
  await Promise.all([
    r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: mediaKey(sessionId, id, ext),
      })
    ),
    r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: metaKey(sessionId, id),
      })
    ),
  ]);
}

/**
 * Presigned URL for the media blob. Accepts optional ext; otherwise looks it
 * up from the sidecar.
 */
export async function getMediaUrl(
  sessionId: string,
  id: string,
  ext?: string,
  expiresIn: number = 28800
): Promise<string> {
  if (!r2Client) throw new Error("R2 not configured");
  let resolvedExt = ext;
  if (!resolvedExt) {
    const meta = await readMeta(sessionId, id);
    resolvedExt = meta?.ext ?? extFromMediaType(meta?.mediaType ?? "image/png");
  }
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: mediaKey(sessionId, id, resolvedExt),
    }),
    { expiresIn }
  );
}

// Back-compat used by image routes — assumes png.
export async function getImageUrl(
  sessionId: string,
  id: string,
  expiresIn: number = 28800
): Promise<string> {
  return getMediaUrl(sessionId, id, "png", expiresIn);
}

/**
 * Fetch raw media bytes. Primarily used by edit/video routes to pass gallery
 * refs to Gemini. Looks up extension from sidecar.
 */
export async function fetchImageBuffer(
  sessionId: string,
  id: string
): Promise<{ buffer: Buffer; mediaType: string }> {
  if (!r2Client) throw new Error("R2 not configured");
  const meta = await readMeta(sessionId, id);
  const ext = meta?.ext ?? extFromMediaType(meta?.mediaType ?? "image/png");
  const res = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: mediaKey(sessionId, id, ext),
    })
  );
  const bytes = await res.Body!.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    mediaType: res.ContentType || meta?.mediaType || "image/png",
  };
}

interface GalleryEntry {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  mediaType: string;
}

/**
 * Lists all media for a session. Discovers ids via sidecar JSON files, which
 * ensures both images and videos are picked up regardless of extension.
 * Sorted newest-first by timestamp.
 */
export async function listGallery(sessionId: string): Promise<GalleryEntry[]> {
  if (!r2Client) throw new Error("R2 not configured");

  const list = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: `sessions/${sessionId}/`,
    })
  );

  const objects = list.Contents || [];
  const ids = new Set<string>();
  for (const obj of objects) {
    if (!obj.Key) continue;
    const match = obj.Key.match(/^sessions\/[^/]+\/([^/]+)\.json$/);
    if (match) ids.add(match[1]);
  }

  const entries = await Promise.all(
    [...ids].map(async (id): Promise<GalleryEntry | null> => {
      const meta = await readMeta(sessionId, id);
      if (!meta) return null;
      const ext = meta.ext ?? extFromMediaType(meta.mediaType);
      try {
        const url = await getMediaUrl(sessionId, id, ext);
        return {
          id,
          url,
          prompt: meta.prompt,
          timestamp: meta.timestamp,
          mediaType: meta.mediaType,
        };
      } catch {
        return null;
      }
    })
  );

  return entries
    .filter((e): e is GalleryEntry => e !== null)
    .sort((a, b) => b.timestamp - a.timestamp);
}
