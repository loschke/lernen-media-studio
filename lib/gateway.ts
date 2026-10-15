// Anbindung an Ricos LiteLLM-Gateway (ADR 0001).
//
// Eine Adresse, ein virtueller Schlüssel je App. Bild und Bearbeitung laufen
// über das OpenAI-Paket (/v1/images/*), der Chat über das Anthropic-Paket
// (/v1/messages). Beide Pakete bekommen nur Adresse und Schlüssel umgebogen.
// Video (Veo) läuft über die Videoschnittstelle des Gateways (/v1/videos,
// ADR 0002), ohne Paket, mit fetch.

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

const url = (process.env.MODELL_GATEWAY_URL || "").replace(/\/+$/, "");
const key = process.env.MODELL_GATEWAY_KEY || "";

export const gatewayConfigured = Boolean(url && key);

export const CHAT_MODEL = process.env.MODELL_CHAT || "claude-haiku-5-5";

function baseURL(): string {
  return `${url}/v1`;
}

/** OpenAI-Paket mit Gateway-Adresse: `openaiGateway().image(modell)`. */
export function openaiGateway() {
  return createOpenAI({ baseURL: baseURL(), apiKey: key });
}

/** Anthropic-Paket mit Gateway-Adresse: `anthropicGateway()(CHAT_MODEL)`. */
export function anthropicGateway() {
  return createAnthropic({ baseURL: baseURL(), apiKey: key });
}

/** Kopf für direkte Aufrufe des Gateways (Video). Schlüssel nie in der Adresse. */
export function gatewayAuthHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${key}` };
}

/** `gatewayVideoUrl("")` ist der Start, `gatewayVideoUrl("/<id>")` der Status, `"/<id>/content"` die Datei. */
export function gatewayVideoUrl(pfad: string): string {
  return `${url}/v1/videos${pfad}`;
}

export const GATEWAY_MISSING_MESSAGE =
  "KI-Gateway nicht konfiguriert (MODELL_GATEWAY_URL und MODELL_GATEWAY_KEY fehlen).";

/**
 * Fehler des Gateways in Status und Text für die Oberfläche übersetzen.
 * Gemessen am 15.10.2026: unbekanntes Modell 403, falscher Schlüssel 401,
 * Stufe oder Größe ungültig 400, Budget des Schlüssels erschöpft als
 * "ExceededBudget"/"budget", Rate-Limit 429.
 */
export function describeGatewayError(
  error: unknown,
  was: "Bildgenerierung" | "Bildbearbeitung" | "Videogenerierung"
): { status: number; error: string; details: string } {
  const message = error instanceof Error ? error.message : String(error);
  if (/not available for this API key|model_access_denied/i.test(message)) {
    return {
      status: 500,
      error:
        "Das Modell ist beim KI-Gateway nicht freigegeben. Credits wurden zurückerstattet, bitte Rico Bescheid geben.",
      details: message,
    };
  }
  if (/prepayment credits|credits are depleted/i.test(message)) {
    // Gemessen 15.10.2026: Google antwortet 402 „Your prepayment credits are
    // depleted“, wenn das Guthaben bei AI Studio aufgebraucht ist. Der
    // Gateway reicht das durch; es ist nicht das Budget des Studio-Schlüssels.
    return {
      status: 402,
      error:
        "Der Anbieter hinter dem KI-Gateway hat kein Guthaben mehr (Google AI Studio). Credits wurden zurückerstattet, bitte Rico Bescheid geben.",
      details: message,
    };
  }
  if (/budget/i.test(message)) {
    return {
      status: 402,
      error:
        "Das Monatsbudget des Studios beim KI-Gateway ist erschöpft. Credits wurden zurückerstattet, bitte Rico Bescheid geben.",
      details: message,
    };
  }
  if (/\b429\b|rate.?limit|quota/i.test(message)) {
    return {
      status: 429,
      error:
        "Der KI-Anbieter nimmt gerade keine weiteren Anfragen an. Versuche es gleich noch einmal, Credits wurden zurückerstattet.",
      details: message,
    };
  }
  if (/abort|timeout|timed out/i.test(message)) {
    return {
      status: 504,
      error: `${was} hat zu lange gedauert und wurde abgebrochen. Credits wurden zurückerstattet.`,
      details: message,
    };
  }
  if (/safety|moderation|content_policy|rejected/i.test(message)) {
    return {
      status: 422,
      error:
        "Der Anbieter hat den Prompt oder das Bild abgelehnt (Inhaltsfilter). Credits wurden zurückerstattet.",
      details: message,
    };
  }
  return {
    status: 500,
    error: `Fehler bei der ${was}. Credits wurden zurückerstattet.`,
    details: message,
  };
}
