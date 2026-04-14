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
    const { prompt, images, model } = await req.json();

    if (!prompt || !images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: 'Prompt und mindestens ein Bild sind erforderlich.' }), { status: 400 });
    }

    const chosenModel: EditCapableModelId =
      typeof model === 'string' && ALLOWED_EDIT_MODEL_IDS.has(model)
        ? (model as EditCapableModelId)
        : DEFAULT_EDIT_MODEL;

    const imageSize = resolveImageSize();

    const result = await generateText({
      model: google(chosenModel),
      providerOptions: {
        google: { imageConfig: { imageSize } },
      },
      messages: [
        {
          role: 'user',
          content: [
            ...images.map((imgData: string) => ({
              type: 'image' as const,
              // Wir entfernen ein evt. vorhandenes "data:image/xxx;base64," Prefix, falls vom Client gesendet
              image: Buffer.from(imgData.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
            })),
            { type: 'text' as const, text: prompt },
          ],
        },
      ],
    });

    const outputImages = result.files?.filter((f) => f.mediaType?.startsWith('image/')) || [];

    if (outputImages.length === 0) {
      return new Response(JSON.stringify({ error: 'Kein bearbeitetes Bild generiert.' }), { status: 500 });
    }

    return new Response(
      JSON.stringify({
        images: outputImages.map((img) => ({
          data: Buffer.from(img.uint8Array).toString('base64'),
          mediaType: img.mediaType,
        })),
        text: result.text,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Edit API Error:', error);
    return new Response(JSON.stringify({ error: 'Fehler bei der Bildbearbeitung', details: error.message || 'Unknown error' }), { status: 500 });
  }
}
