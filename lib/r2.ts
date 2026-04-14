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

export interface ImageMetadata {
  prompt: string;
  timestamp: number;
  mediaType: string;
}

function objectKey(sessionId: string, id: string, suffix: "image" | "meta") {
  return suffix === "image"
    ? `sessions/${sessionId}/${id}.png`
    : `sessions/${sessionId}/${id}.json`;
}

/**
 * Upload an image (Buffer) and its metadata as a sidecar JSON.
 */
export async function uploadImage(
  sessionId: string,
  id: string,
  imageBuffer: Buffer,
  metadata: ImageMetadata
): Promise<void> {
  if (!r2Client) throw new Error("R2 not configured");

  await Promise.all([
    r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: objectKey(sessionId, id, "image"),
        Body: imageBuffer,
        ContentType: metadata.mediaType,
      })
    ),
    r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: objectKey(sessionId, id, "meta"),
        Body: JSON.stringify(metadata),
        ContentType: "application/json",
      })
    ),
  ]);
}

/**
 * Delete both image and sidecar.
 */
export async function deleteImage(sessionId: string, id: string): Promise<void> {
  if (!r2Client) throw new Error("R2 not configured");
  await Promise.all([
    r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: objectKey(sessionId, id, "image"),
      })
    ),
    r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: objectKey(sessionId, id, "meta"),
      })
    ),
  ]);
}

/**
 * Returns a presigned URL valid for `expiresIn` seconds (default 1 hour).
 */
export async function getImageUrl(
  sessionId: string,
  id: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!r2Client) throw new Error("R2 not configured");
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey(sessionId, id, "image"),
    }),
    { expiresIn }
  );
}

/**
 * Fetch the raw image bytes (used by edit route to pass gallery refs to Gemini).
 */
export async function fetchImageBuffer(
  sessionId: string,
  id: string
): Promise<{ buffer: Buffer; mediaType: string }> {
  if (!r2Client) throw new Error("R2 not configured");
  const res = await r2Client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey(sessionId, id, "image"),
    })
  );
  const bytes = await res.Body!.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    mediaType: res.ContentType || "image/png",
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
 * Lists all images for a session, returning signed URLs and metadata.
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
  // Group by id (image + sidecar share id stem)
  const ids = new Set<string>();
  for (const obj of objects) {
    if (!obj.Key) continue;
    const match = obj.Key.match(/^sessions\/[^/]+\/([^/]+)\.(png|json)$/);
    if (match) ids.add(match[1]);
  }

  const entries = await Promise.all(
    [...ids].map(async (id): Promise<GalleryEntry | null> => {
      try {
        const meta = await r2Client.send(
          new GetObjectCommand({
            Bucket: R2_BUCKET,
            Key: objectKey(sessionId, id, "meta"),
          })
        );
        const metaText = await meta.Body!.transformToString();
        const metadata: ImageMetadata = JSON.parse(metaText);
        const url = await getImageUrl(sessionId, id);
        return {
          id,
          url,
          prompt: metadata.prompt,
          timestamp: metadata.timestamp,
          mediaType: metadata.mediaType,
        };
      } catch {
        // Sidecar missing or unreadable — skip silently
        return null;
      }
    })
  );

  return entries
    .filter((e): e is GalleryEntry => e !== null)
    .sort((a, b) => b.timestamp - a.timestamp);
}
