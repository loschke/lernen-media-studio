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

export const maxDuration = 60;

// Bildgröße wird zentral über die Env-Variable gesteuert (Default: 1K).
// Nicht vom Client steuerbar.
function resolveImageSize(): ImageSize {
  const envSize = process.env.DEFAULT_IMAGE_SIZE;
  if (envSize && ALLOWED_IMAGE_SIZES.has(envSize)) {
    return envSize as ImageSize;
  }
  return DEFAULT_IMAGE_SIZE;
}

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio = '1:1', model } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
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

    const images = result.files?.filter(f => f.mediaType?.startsWith('image/')) || [];

    if (images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Kein Bild generiert. Eventuell hat ein Sicherheitsfilter gegriffen.' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        images: images.map(img => ({
          data: Buffer.from(img.uint8Array).toString('base64'),
          mediaType: img.mediaType,
        })),
        text: result.text,
      }),
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
