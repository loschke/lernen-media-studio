import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import {
  ALLOWED_MODEL_IDS,
  ALLOWED_IMAGE_SIZES,
  DEFAULT_MODEL,
  DEFAULT_IMAGE_SIZE,
  type ImageModelId,
  type ImageSize,
} from '@/lib/models';
import { getSessionId } from '@/lib/session';
import { uploadImage, getImageUrl, r2Configured } from '@/lib/r2';
import { MAX_PROMPT_CHARS } from '@/lib/validation';

export const maxDuration = 60;

function resolveImageSize(): ImageSize {
  const envSize = process.env.DEFAULT_IMAGE_SIZE;
  if (envSize && ALLOWED_IMAGE_SIZES.has(envSize)) {
    return envSize as ImageSize;
  }
  return DEFAULT_IMAGE_SIZE;
}

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

    const { prompt, aspectRatio = '1:1', model } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return new Response(
        JSON.stringify({ error: `Prompt zu lang (max. ${MAX_PROMPT_CHARS} Zeichen).` }),
        { status: 400 }
      );
    }

    const chosenModel: ImageModelId =
      typeof model === 'string' && ALLOWED_MODEL_IDS.has(model)
        ? (model as ImageModelId)
        : DEFAULT_MODEL;

    const imageSize = resolveImageSize();

    const result = await generateText({
      model: google(chosenModel),
      providerOptions: {
        google: { imageConfig: { aspectRatio, imageSize } },
      },
      prompt,
    });

    const generated = result.files?.filter((f) => f.mediaType?.startsWith('image/')) || [];

    if (generated.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Kein Bild generiert. Eventuell hat ein Sicherheitsfilter gegriffen.' }),
        { status: 500 }
      );
    }

    // Upload each generated image to R2 and collect metadata for the client.
    const uploaded = await Promise.all(
      generated.map(async (img) => {
        const id = crypto.randomUUID();
        const buffer = Buffer.from(img.uint8Array);
        const mediaType = img.mediaType || 'image/png';
        const timestamp = Date.now();
        await uploadImage(sessionId, id, buffer, { prompt, timestamp, mediaType, ext: 'png' });
        const url = await getImageUrl(sessionId, id);
        return { id, url, mediaType, prompt, timestamp };
      })
    );

    return new Response(
      JSON.stringify({ images: uploaded, text: result.text }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Generate API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Fehler bei der Bildgenerierung', details: error.message || 'Unknown error' }),
      { status: 500 }
    );
  }
}
