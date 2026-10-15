// Video starten über die Videoschnittstelle des Gateways (ADR 0002, Weg b):
// POST {MODELL_GATEWAY_URL}/v1/videos, JSON ohne Bild oder Multipart mit
// `input_reference` als Startbild. Der Gateway reicht an Veo weiter, bucht die
// Kosten sofort beim Start und gibt eine Vorgangskennung zurück, die die
// Statusroute abfragt. Kein Google-Schlüssel mehr im Studio.
import {
  ALLOWED_VIDEO_MODEL_IDS,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_VIDEO_ASPECT_RATIO,
  DEFAULT_VIDEO_DURATION,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  VIDEO_SIZES,
  getVideoCost,
  type VideoModelId,
  type VideoAspectRatio,
  type VideoDuration,
} from "@/lib/models";
import { getCurrentUser } from "@/lib/session";
import { spendCredits, refundCredits } from "@/lib/credits";
import { fetchImageBuffer, r2Configured } from "@/lib/r2";
import {
  gatewayConfigured,
  gatewayAuthHeaders,
  gatewayVideoUrl,
  describeGatewayError,
  GATEWAY_MISSING_MESSAGE,
} from "@/lib/gateway";
import {
  MAX_VIDEO_PROMPT_CHARS,
  MAX_UPLOAD_BYTES,
  base64ByteLength,
  isValidVideoJobId,
} from "@/lib/validation";

export const maxDuration = 60;

interface ImageRefGallery {
  source: "gallery";
  id: string;
}
interface ImageRefUpload {
  source: "upload";
  data: string; // base64 (with or without data: prefix)
  mediaType?: string;
}
type ImageRef = ImageRefGallery | ImageRefUpload;

async function resolveFrame(
  ref: ImageRef,
  sub: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (ref.source === "gallery") {
    const { buffer, mediaType } = await fetchImageBuffer(sub, ref.id);
    return { buffer, mimeType: mediaType };
  }
  const cleaned = ref.data.replace(/^data:image\/\w+;base64,/, "");
  return {
    buffer: Buffer.from(cleaned, "base64"),
    mimeType: ref.mediaType || "image/png",
  };
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  if (!r2Configured) {
    return json({ error: "Storage nicht konfiguriert (R2 Env-Vars fehlen)." }, 500);
  }
  if (!gatewayConfigured) {
    return json({ error: GATEWAY_MISSING_MESSAGE }, 500);
  }

  const user = await getCurrentUser();
  if (!user) {
    return json({ error: "Keine Session — bitte neu anmelden." }, 401);
  }

  const body = (await req.json()) as {
    prompt: string;
    model?: string;
    aspectRatio?: string;
    duration?: number;
    startFrame?: ImageRef;
  };

  if (!body.prompt || typeof body.prompt !== "string") {
    return json({ error: "Prompt ist erforderlich." }, 400);
  }
  if (body.prompt.length > MAX_VIDEO_PROMPT_CHARS) {
    return json(
      { error: `Prompt zu lang (max. ${MAX_VIDEO_PROMPT_CHARS} Zeichen).` },
      400
    );
  }
  if (
    body.startFrame?.source === "upload" &&
    base64ByteLength(body.startFrame.data) > MAX_UPLOAD_BYTES
  ) {
    return json(
      { error: `Startframe zu groß (max. ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).` },
      400
    );
  }

  const model: VideoModelId =
    typeof body.model === "string" && ALLOWED_VIDEO_MODEL_IDS.has(body.model)
      ? (body.model as VideoModelId)
      : DEFAULT_VIDEO_MODEL;

  const aspectRatio: VideoAspectRatio =
    body.aspectRatio && (VIDEO_ASPECT_RATIOS as readonly string[]).includes(body.aspectRatio)
      ? (body.aspectRatio as VideoAspectRatio)
      : DEFAULT_VIDEO_ASPECT_RATIO;

  const duration: VideoDuration =
    body.duration && (VIDEO_DURATIONS as readonly number[]).includes(body.duration)
      ? (body.duration as VideoDuration)
      : DEFAULT_VIDEO_DURATION;

  const cost = getVideoCost(model, duration);
  const spend = await spendCredits(user.sub, cost);
  if (!spend.ok) {
    return json({ error: "insufficient_credits", credits: spend.remaining, cost }, 402);
  }

  let credits = spend.remaining;

  try {
    // Gemessen 15.10.2026 (scripts/veo-videos-pruefstand.mjs): `seconds` als
    // Text, `size` als BREITExHÖHE, Startbild als Multipart `input_reference`
    // (PNG und JPEG). Der Gateway antwortet in 1 bis 3 s mit der Kennung.
    const felder = {
      model,
      prompt: body.prompt,
      seconds: String(duration),
      size: VIDEO_SIZES[aspectRatio],
    };
    let init: RequestInit;
    if (body.startFrame) {
      const frame = await resolveFrame(body.startFrame, user.sub);
      const fd = new FormData();
      for (const [k, v] of Object.entries(felder)) fd.append(k, v);
      fd.append(
        "input_reference",
        new Blob([new Uint8Array(frame.buffer)], { type: frame.mimeType }),
        `start.${frame.mimeType.split("/")[1] || "png"}`
      );
      init = { method: "POST", headers: gatewayAuthHeaders(), body: fd };
    } else {
      init = {
        method: "POST",
        headers: { ...gatewayAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(felder),
      };
    }

    const res = await fetch(gatewayVideoUrl(""), {
      ...init,
      signal: AbortSignal.timeout(50_000),
    });
    const text = await res.text();
    let data: { id?: string; error?: { message?: string } } = {};
    try {
      data = JSON.parse(text);
    } catch {
      /* kein JSON, Text landet in der Fehlermeldung */
    }
    if (!res.ok) {
      throw new Error(data.error?.message || `Gateway ${res.status}: ${text.slice(0, 200)}`);
    }
    if (!isValidVideoJobId(data.id)) {
      throw new Error("Gateway hat keine gültige Vorgangskennung geliefert.");
    }

    return json(
      {
        jobId: data.id,
        prompt: body.prompt,
        model,
        aspectRatio,
        duration,
        cost,
        credits,
      },
      200
    );
  } catch (error: unknown) {
    console.error("Video start error:", error);
    credits = await refundCredits(user.sub, cost);
    const beschrieben = describeGatewayError(error, "Videogenerierung");
    return json(
      { error: beschrieben.error, details: beschrieben.details, credits },
      beschrieben.status
    );
  }
}
