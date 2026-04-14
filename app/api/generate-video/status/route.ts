import { getSessionId } from "@/lib/session";
import { uploadMedia, getMediaUrl, r2Configured } from "@/lib/r2";

export const maxDuration = 60;

function resolveApiKey(): string | null {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    null
  );
}

async function downloadVideo(uri: string, apiKey: string): Promise<Buffer> {
  // The URI returned by Veo points at the Gemini Files API and requires the
  // API key appended as a query parameter.
  const separator = uri.includes("?") ? "&" : "?";
  const res = await fetch(`${uri}${separator}key=${apiKey}`);
  if (!res.ok) {
    throw new Error(`Video-Download fehlgeschlagen (${res.status})`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function POST(req: Request) {
  try {
    if (!r2Configured) {
      return new Response(
        JSON.stringify({ error: "Storage nicht konfiguriert." }),
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
      return new Response(JSON.stringify({ error: "Keine Session." }), { status: 401 });
    }

    const { operationName, prompt } = (await req.json()) as {
      operationName: string;
      prompt: string;
    };

    if (!operationName) {
      return new Response(JSON.stringify({ error: "operationName fehlt." }), { status: 400 });
    }

    // Poll the long-running operation via REST. The SDK's getVideosOperation
    // requires an internal Operation instance — fetching the REST endpoint
    // directly sidesteps that constraint.
    const opRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
      { headers: { "x-goog-api-key": apiKey } }
    );
    if (!opRes.ok) {
      const text = await opRes.text();
      throw new Error(
        `Operation-Abruf fehlgeschlagen (${opRes.status}): ${text.slice(0, 200)}`
      );
    }
    const op = (await opRes.json()) as {
      done?: boolean;
      error?: { message?: string };
      response?: {
        generateVideoResponse?: {
          generatedSamples?: Array<{ video?: { uri?: string } }>;
        };
        generatedVideos?: Array<{ video?: { uri?: string } }>;
      };
    };

    if (!op.done) {
      return new Response(JSON.stringify({ done: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (op.error) {
      return new Response(
        JSON.stringify({
          done: true,
          error: op.error.message || "Video-Generierung fehlgeschlagen",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // API returns results under either shape depending on version.
    const uri =
      op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
      op.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return new Response(
        JSON.stringify({
          done: true,
          error: "Kein Video-URI in der Antwort — eventuell hat ein Sicherheitsfilter gegriffen.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const buffer = await downloadVideo(uri, apiKey);

    const id = crypto.randomUUID();
    const mediaType = "video/mp4";
    const timestamp = Date.now();
    await uploadMedia(sessionId, id, buffer, {
      prompt,
      timestamp,
      mediaType,
      ext: "mp4",
    });
    const url = await getMediaUrl(sessionId, id, "mp4");

    return new Response(
      JSON.stringify({
        done: true,
        video: { id, url, mediaType, prompt, timestamp },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Video status error:", error);
    return new Response(
      JSON.stringify({
        error: "Fehler beim Abrufen des Video-Status",
        details: error?.message || "Unknown error",
      }),
      { status: 500 }
    );
  }
}
