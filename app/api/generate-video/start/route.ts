import { GoogleGenAI } from "@google/genai";
import {
  ALLOWED_VIDEO_MODEL_IDS,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_VIDEO_ASPECT_RATIO,
  DEFAULT_VIDEO_DURATION,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  videoSupportsEndFrame,
  type VideoModelId,
  type VideoAspectRatio,
  type VideoDuration,
} from "@/lib/models";
import { getSessionId } from "@/lib/session";
import { fetchImageBuffer, r2Configured } from "@/lib/r2";
import {
  MAX_VIDEO_PROMPT_CHARS,
  MAX_UPLOAD_BYTES,
  base64ByteLength,
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
  sessionId: string
): Promise<{ imageBytes: string; mimeType: string }> {
  if (ref.source === "gallery") {
    const { buffer, mediaType } = await fetchImageBuffer(sessionId, ref.id);
    return { imageBytes: buffer.toString("base64"), mimeType: mediaType };
  }
  const cleaned = ref.data.replace(/^data:image\/\w+;base64,/, "");
  return {
    imageBytes: cleaned,
    mimeType: ref.mediaType || "image/png",
  };
}

function resolveApiKey(): string | null {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    null
  );
}

export async function POST(req: Request) {
  try {
    if (!r2Configured) {
      return new Response(
        JSON.stringify({ error: "Storage nicht konfiguriert (R2 Env-Vars fehlen)." }),
        { status: 500 }
      );
    }
    const apiKey = resolveApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API Key nicht konfiguriert." }),
        { status: 500 }
      );
    }

    const sessionId = await getSessionId();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Keine Session — bitte neu anmelden." }), { status: 401 });
    }

    const body = (await req.json()) as {
      prompt: string;
      model?: string;
      aspectRatio?: string;
      duration?: number;
      startFrame?: ImageRef;
      endFrame?: ImageRef;
    };

    if (!body.prompt || typeof body.prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt ist erforderlich." }), { status: 400 });
    }
    if (body.prompt.length > MAX_VIDEO_PROMPT_CHARS) {
      return new Response(
        JSON.stringify({ error: `Prompt zu lang (max. ${MAX_VIDEO_PROMPT_CHARS} Zeichen).` }),
        { status: 400 }
      );
    }
    for (const frame of [body.startFrame, body.endFrame]) {
      if (frame?.source === "upload" && base64ByteLength(frame.data) > MAX_UPLOAD_BYTES) {
        return new Response(
          JSON.stringify({
            error: `Frame zu groß (max. ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`,
          }),
          { status: 400 }
        );
      }
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

    // Endframe wird nur von Veo 3.1 Fast und Pro unterstützt (nicht Lite).
    if (body.endFrame && !videoSupportsEndFrame(model)) {
      return new Response(
        JSON.stringify({
          error:
            "Das gewählte Modell unterstützt keinen Endframe. Bitte Veo 3.1 Fast oder Veo 3.1 wählen.",
        }),
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const image = body.startFrame
      ? await resolveFrame(body.startFrame, sessionId)
      : undefined;
    const lastFrame = body.endFrame
      ? await resolveFrame(body.endFrame, sessionId)
      : undefined;

    const config: Record<string, unknown> = {
      aspectRatio,
      durationSeconds: duration,
      numberOfVideos: 1,
    };
    if (lastFrame) config.lastFrame = lastFrame;

    const op = await ai.models.generateVideos({
      model,
      prompt: body.prompt,
      ...(image ? { image } : {}),
      config,
    });

    // Operation name is stable; store context client-side so the status route
    // can persist the final video with the correct prompt/model on completion.
    return new Response(
      JSON.stringify({
        operationName: op.name,
        prompt: body.prompt,
        model,
        aspectRatio,
        duration,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Video start error:", error);
    const status = error?.status || error?.response?.status;
    if (status === 429) {
      return new Response(
        JSON.stringify({
          error:
            "Das Video-Kontingent für heute ist aufgebraucht. Bitte später erneut versuchen oder einen Screenshot machen und Rico melden.",
        }),
        { status: 429 }
      );
    }
    return new Response(
      JSON.stringify({
        error: "Fehler beim Starten der Video-Generierung",
        details: error?.message || "Unknown error",
      }),
      { status: 500 }
    );
  }
}
