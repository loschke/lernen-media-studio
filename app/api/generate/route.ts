import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import {
  ALLOWED_MODEL_IDS,
  ALLOWED_IMAGE_SIZES,
  DEFAULT_MODEL,
  DEFAULT_IMAGE_SIZE,
  getModelCost,
  type ImageModelId,
  type ImageSize,
} from '@/lib/models';
import { getCurrentUser } from '@/lib/session';
import { spendCredits, refundCredits } from '@/lib/credits';
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
    const result = await generateText({
      model: google(chosenModel),
      providerOptions: {
        google: { imageConfig: { aspectRatio, imageSize } },
      },
      prompt,
    });

    const generated = result.files?.filter((f) => f.mediaType?.startsWith('image/')) || [];

    if (generated.length === 0) {
      credits = await refundCredits(user.sub, cost);
      return new Response(
        JSON.stringify({
          error: 'Kein Bild generiert. Eventuell hat ein Sicherheitsfilter gegriffen.',
          credits,
        }),
        { status: 500 }
      );
    }

    const uploaded = await Promise.all(
      generated.map(async (img) => {
        const id = crypto.randomUUID();
        const buffer = Buffer.from(img.uint8Array);
        const mediaType = img.mediaType || 'image/png';
        const timestamp = Date.now();
        await uploadImage(user.sub, id, buffer, { prompt, timestamp, mediaType, ext: 'png' });
        const url = await getImageUrl(user.sub, id);
        return { id, url, mediaType, prompt, timestamp };
      })
    );

    return new Response(
      JSON.stringify({ images: uploaded, text: result.text, credits }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Generate API Error:', error);
    credits = await refundCredits(user.sub, cost);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = /\b429\b|quota|rate.?limit/i.test(message) ? 429 : 500;
    return new Response(
      JSON.stringify({
        error: status === 429
          ? 'Google API-Kontingent erschöpft. Versuche es später erneut — Credits wurden zurückerstattet.'
          : 'Fehler bei der Bildgenerierung',
        details: message,
        credits,
      }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
