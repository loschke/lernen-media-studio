import { generateImage } from 'ai';
import {
  ALLOWED_EDIT_MODEL_IDS,
  DEFAULT_EDIT_MODEL,
  getModelCost,
  resolveImageModel,
  type EditCapableModelId,
} from '@/lib/models';
import {
  openaiGateway,
  gatewayConfigured,
  describeGatewayError,
  GATEWAY_MISSING_MESSAGE,
} from '@/lib/gateway';
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

// Sunburst high beim Bearbeiten: 55 s gemessen (15.10.2026). 120 s laut F4 a.
export const maxDuration = 120;
const GATEWAY_TIMEOUT_MS = 110_000;

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
  if (!gatewayConfigured) {
    return new Response(JSON.stringify({ error: GATEWAY_MISSING_MESSAGE }), { status: 500 });
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

  const { modell, quality } = resolveImageModel(chosenModel);
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

    // Keine `size`: das Ergebnis behält das Seitenverhältnis der Eingabe
    // (gemessen 15.10.2026: 1536x1024 rein, 1536x1024 raus). PNG und JPEG
    // gehen ohne Umwandlung durch, der Medientyp wird aus den Bytes erkannt.
    const result = await generateImage({
      model: openaiGateway().image(modell),
      prompt: { images: buffers, text: prompt },
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
      JSON.stringify({ images: uploaded, text: '', credits }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Edit API Error:', error);
    credits = await refundCredits(user.sub, cost);
    const { status, error: text, details } = describeGatewayError(error, 'Bildbearbeitung');
    return new Response(
      JSON.stringify({ error: text, details, credits }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
