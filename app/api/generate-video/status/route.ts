// Videostatus über die Videoschnittstelle des Gateways (ADR 0002, Weg b):
// GET {MODELL_GATEWAY_URL}/v1/videos/{id}, bei `completed` GET .../content,
// Datei nach R2. Der Schlüssel bleibt im Kopf, nie in der Adresse.
import { getSessionId } from "@/lib/session";
import { uploadMedia, getMediaUrl, r2Configured } from "@/lib/r2";
import {
  gatewayConfigured,
  gatewayAuthHeaders,
  gatewayVideoUrl,
  GATEWAY_MISSING_MESSAGE,
} from "@/lib/gateway";
import { isValidVideoJobId, MAX_VIDEO_PROMPT_CHARS } from "@/lib/validation";

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

    const statusRes = await fetch(gatewayVideoUrl(`/${jobId}`), {
      headers: gatewayAuthHeaders(),
      signal: AbortSignal.timeout(20_000),
    });
    if (!statusRes.ok) {
      // Richtung r1 (ADR 0002): Ein 403 beim ersten Abruf kam über diesen Weg
      // einmal vor, danach normal. Er und 429 gelten als „noch nicht fertig“,
      // die Oberfläche fragt ohnehin weiter.
      if (statusRes.status === 403 || statusRes.status === 429) {
        return json({ done: false }, 200);
      }
      const text = await statusRes.text();
      throw new Error(`Status-Abruf fehlgeschlagen (${statusRes.status}): ${text.slice(0, 200)}`);
    }
    const job = (await statusRes.json()) as {
      status?: string;
      error?: { message?: string } | null;
    };

    if (job.status === "failed") {
      return json(
        { done: true, error: job.error?.message || "Video-Generierung fehlgeschlagen" },
        200
      );
    }
    if (job.status !== "completed") {
      return json({ done: false }, 200);
    }

    const fileRes = await fetch(gatewayVideoUrl(`/${jobId}/content`), {
      headers: gatewayAuthHeaders(),
      signal: AbortSignal.timeout(40_000),
    });
    if (!fileRes.ok) {
      throw new Error(`Video-Download fehlgeschlagen (${fileRes.status})`);
    }
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    if (buffer.length === 0) {
      return json(
        {
          done: true,
          error: "Kein Video in der Antwort — eventuell hat ein Sicherheitsfilter gegriffen.",
        },
        200
      );
    }

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

    return json(
      { done: true, video: { id, url, mediaType, prompt, timestamp } },
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
