import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import {
  ALLOWED_EDIT_MODEL_IDS,
  ALLOWED_IMAGE_SIZES,
  DEFAULT_EDIT_MODEL,
  DEFAULT_IMAGE_SIZE,
  getModelCost,
  type EditCapableModelId,
  type ImageSize,
} from '@/lib/models';
import { getCurrentUser } from '@/lib/session';
import { spendCredits, refundCredits } from '@/lib/credits';
import {
  uploadImage,
  getImageUrl,
  fetchImageBuffer,
  r2Configured,
} from '@/lib/r2';
import {
  MAX_PROMPT_CHARS,
  MAX_REF_IMAGES,
  MAX_UPLOAD_BYTES,
  base64ByteLength,
} from '@/lib/validation';

export const maxDuration = 60;

function resolveImageSize(): ImageSize {
  const envSize = process.env.DEFAULT_IMAGE_SIZE;
  if (envSize && ALLOWED_IMAGE_SIZES.has(envSize)) {
    return envSize as ImageSize;
  }
  return DEFAULT_IMAGE_SIZE;
}

interface ImageRefGallery {
  source: 'gallery';
  id: string;
}
interface ImageRefUpload {
  source: 'upload';
  data: string; // base64 (with or without data: prefix)
  mediaType?: string;
}
type ImageRef = ImageRefGallery | ImageRefUpload;

export async function POST(req: Request) {
  if (!r2Configured) {
    return new Response(
      JSON.stringify({ error: 'Storage nicht konfiguriert (R2 Env-Vars fehlen).' }),
      { status: 500 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Keine Session — bitte neu anmelden.' }), { status: 401 });
  }

  const { prompt, imageRefs, model } = (await req.json()) as {
    prompt: string;
    imageRefs: ImageRef[];
    model?: string;
  };

  if (!prompt || !Array.isArray(imageRefs) || imageRefs.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Prompt und mindestens ein Bild sind erforderlich.' }),
      { status: 400 }
    );
  }
  if (typeof prompt !== 'string' || prompt.length > MAX_PROMPT_CHARS) {
    return new Response(
      JSON.stringify({ error: `Prompt zu lang (max. ${MAX_PROMPT_CHARS} Zeichen).` }),
      { status: 400 }
    );
  }
  if (imageRefs.length > MAX_REF_IMAGES) {
    return new Response(
      JSON.stringify({ error: `Maximal ${MAX_REF_IMAGES} Referenzbilder erlaubt.` }),
      { status: 400 }
    );
  }
  for (const ref of imageRefs) {
    if (ref.source === 'upload' && base64ByteLength(ref.data) > MAX_UPLOAD_BYTES) {
      return new Response(
        JSON.stringify({
          error: `Upload zu groß (max. ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB pro Bild).`,
        }),
        { status: 400 }
      );
    }
  }

  const chosenModel: EditCapableModelId =
    typeof model === 'string' && ALLOWED_EDIT_MODEL_IDS.has(model)
      ? (model as EditCapableModelId)
      : DEFAULT_EDIT_MODEL;

  const cost = getModelCost(chosenModel);
  const spend = await spendCredits(user.sub, cost);
  if (!spend.ok) {
    return new Response(
      JSON.stringify({ error: 'insufficient_credits', credits: spend.remaining, cost }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const imageSize = resolveImageSize();
  let credits = spend.remaining;

  try {
    const buffers = await Promise.all(
      imageRefs.map(async (ref) => {
        if (ref.source === 'gallery') {
          const { buffer } = await fetchImageBuffer(user.sub, ref.id);
          return buffer;
        }
        const cleaned = ref.data.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(cleaned, 'base64');
      })
    );

    const result = await generateText({
      model: google(chosenModel),
      providerOptions: {
        google: { imageConfig: { imageSize } },
      },
      messages: [
        {
          role: 'user',
          content: [
            ...buffers.map((image) => ({ type: 'image' as const, image })),
            { type: 'text' as const, text: prompt },
          ],
        },
      ],
    });

    const generated = result.files?.filter((f) => f.mediaType?.startsWith('image/')) || [];

    if (generated.length === 0) {
      credits = await refundCredits(user.sub, cost);
      return new Response(
        JSON.stringify({ error: 'Kein bearbeitetes Bild generiert.', credits }),
        { status: 500 }
      );
    }

    const uploaded = await Promise.all(
      generated.map(async (img) => {
        const id = crypto.randomUUID();
        const buffer = Buffer.from(img.uint8Array);
        const mediaType = img.mediaType || 'image/png';
        const timestamp = Date.now();
        const taggedPrompt = `[Bearbeitet] ${prompt}`;
        await uploadImage(user.sub, id, buffer, {
          prompt: taggedPrompt,
          timestamp,
          mediaType,
          ext: 'png',
        });
        const url = await getImageUrl(user.sub, id);
        return { id, url, mediaType, prompt: taggedPrompt, timestamp };
      })
    );

    return new Response(
      JSON.stringify({ images: uploaded, text: result.text, credits }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Edit API Error:', error);
    credits = await refundCredits(user.sub, cost);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = /\b429\b|quota|rate.?limit/i.test(message) ? 429 : 500;
    return new Response(
      JSON.stringify({
        error: status === 429
          ? 'Google API-Kontingent erschöpft. Versuche es später erneut — Credits wurden zurückerstattet.'
          : 'Fehler bei der Bildbearbeitung',
        details: message,
        credits,
      }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
