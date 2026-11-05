// Videostatus über die Gemini-Durchleitung des Gateways (ADR 0003):
// GET {MODELL_GATEWAY_URL}/gemini/v1beta/interactions/{id}. Bei `completed`
// steckt das Video als Base64 in derselben Antwort, es geht von dort nach R2.
// Der Schlüssel bleibt im Kopf, nie in der Adresse.
import { getSessionId } from "@/lib/session";
import { uploadMedia, getMediaUrl, r2Configured } from "@/lib/r2";
import {
  gatewayConfigured,
  gatewayGoogleHeaders,
  gatewayInteractionsUrl,
  GATEWAY_MISSING_MESSAGE,
} from "@/lib/gateway";
import { isValidVideoJobId, MAX_VIDEO_PROMPT_CHARS } from "@/lib/validation";
import { mp4DurationSeconds } from "@/lib/mp4";

export const maxDuration = 60;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  try {
    if (!r2Configured) {
      return json({ error: "Storage nicht konfiguriert." }, 500);
    }
    if (!gatewayConfigured) {
      return json({ error: GATEWAY_MISSING_MESSAGE }, 500);
    }

    const sessionId = await getSessionId();
    if (!sessionId) {
      return json({ error: "Keine Session." }, 401);
    }

    const { jobId, prompt } = (await req.json()) as {
      jobId: string;
      prompt: string;
    };

    if (!isValidVideoJobId(jobId)) {
      return json({ error: "Ungültige Vorgangskennung." }, 400);
    }
    if (typeof prompt !== "string" || prompt.length > MAX_VIDEO_PROMPT_CHARS) {
      return json(
        { error: `Prompt fehlt oder zu lang (max. ${MAX_VIDEO_PROMPT_CHARS} Zeichen).` },
        400
      );
    }

    // Gemessen 05.11.2026: Abruf rund 0,8 s, solange das Video läuft. Die
    // fertige Antwort trägt das Video (8 s in 720p: 5,3 MB, 3,3 s).
    const statusRes = await fetch(gatewayInteractionsUrl(`/${jobId}`), {
      headers: gatewayGoogleHeaders(),
      signal: AbortSignal.timeout(45_000),
    });
    if (!statusRes.ok) {
      // Wie bei ADR 0002: 403 und 429 gelten als „noch nicht fertig“, die
      // Oberfläche fragt ohnehin weiter.
      if (statusRes.status === 403 || statusRes.status === 429) {
        return json({ done: false }, 200);
      }
      const text = await statusRes.text();
      throw new Error(`Status-Abruf fehlgeschlagen (${statusRes.status}): ${text.slice(0, 200)}`);
    }
    const job = (await statusRes.json()) as {
      status?: string;
      error?: { message?: string } | null;
      // Gemessen 06.11.2026: Ein gescheiterter Vorgang trägt `errors` (Liste).
      errors?: { message?: string; code?: string }[] | null;
      response_format?: { aspect_ratio?: string } | null;
      steps?: {
        type?: string;
        content?: { type?: string; data?: string; text?: string }[];
      }[];
    };

    if (job.status === "failed" || job.status === "cancelled") {
      const grund = job.errors?.[0]?.message || job.error?.message;
      return json(
        {
          done: true,
          error: grund
            ? `Video-Generierung fehlgeschlagen: ${grund.slice(0, 300)}`
            : "Video-Generierung fehlgeschlagen",
        },
        200
      );
    }
    if (job.status !== "completed") {
      return json({ done: false }, 200);
    }

    // Die Antwort enthält auch die Eingabe (Schritt `user_input`). Das Video
    // steht in einem Schritt des Modells.
    const ausgabe = (job.steps ?? [])
      .filter((s) => s.type !== "user_input")
      .flatMap((s) => s.content ?? []);
    const video = ausgabe.find((c) => c.type === "video" && c.data);
    const buffer = video?.data ? Buffer.from(video.data, "base64") : Buffer.alloc(0);
    if (buffer.length === 0) {
      const hinweis = ausgabe.find((c) => c.type === "text" && c.text)?.text;
      return json(
        {
          done: true,
          error: hinweis
            ? `Kein Video erhalten. Antwort des Modells: ${hinweis.slice(0, 300)}`
            : "Kein Video in der Antwort. Eventuell hat ein Sicherheitsfilter gegriffen.",
        },
        200
      );
    }

    const id = crypto.randomUUID();
    const mediaType = "video/mp4";
    const timestamp = Date.now();
    // Länge aus der Datei (nach einer Fortsetzung ist es das ganze Video),
    // Kennung und Seitenverhältnis des Vorgangs für „Fortsetzen“.
    const sekunden = mp4DurationSeconds(buffer);
    const durationSec = sekunden ? Math.round(sekunden) : undefined;
    await uploadMedia(sessionId, id, buffer, {
      prompt,
      timestamp,
      mediaType,
      ext: "mp4",
      interactionId: jobId,
      durationSec,
      aspectRatio: job.response_format?.aspect_ratio,
    });
    const url = await getMediaUrl(sessionId, id, "mp4");

    return json(
      {
        done: true,
        video: { id, url, mediaType, prompt, timestamp, durationSec, canExtend: true },
      },
      200
    );
  } catch (error: unknown) {
    console.error("Video status error:", error);
    return json(
      {
        error: "Fehler beim Abrufen des Video-Status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
