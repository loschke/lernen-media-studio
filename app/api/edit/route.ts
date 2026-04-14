import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import {
  ALLOWED_EDIT_MODEL_IDS,
  ALLOWED_IMAGE_SIZES,
  DEFAULT_EDIT_MODEL,
  DEFAULT_IMAGE_SIZE,
  type EditCapableModelId,
  type ImageSize,
} from '@/lib/models';
import { getSessionId } from '@/lib/session';
import {
  uploadImage,
  getImageUrl,
  fetchImageBuffer,
  r2Configured,
} from '@/lib/r2';

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
  try {
    if (!r2Configured) {
      return new Response(
        JSON.stringify({ error: 'Storage nicht konfiguriert (R2 Env-Vars fehlen).' }),
        { status: 500 }
      );
    }

    const sessionId = await getSessionId();
    if (!sessionId) {
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

    const chosenModel: EditCapableModelId =
      typeof model === 'string' && ALLOWED_EDIT_MODEL_IDS.has(model)
        ? (model as EditCapableModelId)
        : DEFAULT_EDIT_MODEL;

    const imageSize = resolveImageSize();

    // Resolve each ref into a Buffer the model can consume.
    const buffers = await Promise.all(
      imageRefs.map(async (ref) => {
        if (ref.source === 'gallery') {
          const { buffer } = await fetchImageBuffer(sessionId, ref.id);
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
      return new Response(JSON.stringify({ error: 'Kein bearbeitetes Bild generiert.' }), { status: 500 });
    }

    // Upload result(s) to R2 with [Bearbeitet]-prefix in prompt for clarity.
    const uploaded = await Promise.all(
      generated.map(async (img) => {
        const id = crypto.randomUUID();
        const buffer = Buffer.from(img.uint8Array);
        const mediaType = img.mediaType || 'image/png';
        const timestamp = Date.now();
        const taggedPrompt = `[Bearbeitet] ${prompt}`;
        await uploadImage(sessionId, id, buffer, {
          prompt: taggedPrompt,
          timestamp,
          mediaType,
          ext: 'png',
        });
        const url = await getImageUrl(sessionId, id);
        return { id, url, mediaType, prompt: taggedPrompt, timestamp };
      })
    );

    return new Response(
      JSON.stringify({ images: uploaded, text: result.text }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Edit API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Fehler bei der Bildbearbeitung', details: error.message || 'Unknown error' }),
      { status: 500 }
    );
  }
}
