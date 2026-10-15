import { generateImage } from 'ai';
import {
  ALLOWED_MODEL_IDS,
  DEFAULT_MODEL,
  getModelCost,
  resolveImageModel,
  sizeForAspectRatio,
  type ImageModelId,
} from '@/lib/models';
import {
  openaiGateway,
  gatewayConfigured,
  describeGatewayError,
  GATEWAY_MISSING_MESSAGE,
} from '@/lib/gateway';
import { getCurrentUser } from '@/lib/session';
import { spendCredits, refundCredits } from '@/lib/credits';
import { uploadImage, getImageUrl, r2Configured } from '@/lib/r2';
import { MAX_PROMPT_CHARS } from '@/lib/validation';

// Sunburst high: 40 s gemessen (15.10.2026). 120 s laut F4 a in ADR 0001.
export const maxDuration = 120;
const GATEWAY_TIMEOUT_MS = 110_000;

export async function POST(req: Request) {
  if (!r2Configured) {
    return new Response(
      JSON.stringify({ error: 'Storage nicht konfiguriert (R2 Env-Vars fehlen).' }),
      { status: 500 }
    );
  }
  if (!gatewayConfigured) {
    return new Response(JSON.stringify({ error: GATEWAY_MISSING_MESSAGE }), { status: 500 });
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

  const { modell, quality } = resolveImageModel(chosenModel);
  const size = sizeForAspectRatio(aspectRatio);
  let credits = spend.remaining;

  try {
    const result = await generateImage({
      model: openaiGateway().image(modell),
      prompt,
      size,
      maxRetries: 0,
      providerOptions: {
        openai: { quality, outputFormat: 'png' },
      },
      abortSignal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    });

    const generated = result.images ?? [];

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
      JSON.stringify({ images: uploaded, text: '', credits }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Generate API Error:', error);
    credits = await refundCredits(user.sub, cost);
    const { status, error: text, details } = describeGatewayError(error, 'Bildgenerierung');
    return new Response(
      JSON.stringify({ error: text, details, credits }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
