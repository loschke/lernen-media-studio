// --- Bild-Angebote (GPT Image 2.5 über LiteLLM, ADR 0001) -----------------
//
// Die Oberfläche kennt zwei Angebote (Klassen), nicht Modelle: „Schnell“ und
// „Premium“. Der Modellname steht klein darunter. Welches Modell dahinter
// läuft, legt `modell` fest; die Umgebung kann es je Angebot überschreiben
// (MODELL_BILD_SCHNELL, MODELL_BILD_PREMIUM), dann zeigt die Oberfläche weiter
// den Standardnamen. Preis je Bild hängt an der Stufe (`quality`), nicht am
// Modell: medium ≈ 1,3 Cent, high ≈ 5,3 Cent (gemessen 15.10.2026).

export const IMAGE_MODELS = [
  {
    id: "schnell",
    label: "Schnell",
    modell: "gpt-image-2.5-flare",
    quality: "medium",
    cost: 1,
  },
  {
    id: "premium",
    label: "Premium",
    modell: "gpt-image-2.5-sunburst",
    quality: "high",
    cost: 4,
  },
] as const;

export type ImageModelId = (typeof IMAGE_MODELS)[number]["id"];
export type ImageModel = (typeof IMAGE_MODELS)[number];
export type ImageQuality = (typeof IMAGE_MODELS)[number]["quality"];

export const DEFAULT_MODEL: ImageModelId = "schnell";

/**
 * Credit cost for a single image call with the given model. Video costs
 * depend on the duration, see `getVideoCost`. Falls back to 1 for unknown
 * models.
 */
export function getModelCost(modelId: string): number {
  return IMAGE_MODELS.find((m) => m.id === modelId)?.cost ?? 1;
}

export const ALLOWED_MODEL_IDS: ReadonlySet<string> = new Set(
  IMAGE_MODELS.map((m) => m.id)
);

// Beide GPT-Image-Angebote können Bilder bearbeiten (/images/edits).
export const EDIT_CAPABLE_MODEL_IDS = [
  "schnell",
  "premium",
] as const satisfies readonly ImageModelId[];

export type EditCapableModelId = (typeof EDIT_CAPABLE_MODEL_IDS)[number];

export const EDIT_CAPABLE_MODELS = IMAGE_MODELS.filter((m) =>
  (EDIT_CAPABLE_MODEL_IDS as readonly string[]).includes(m.id)
);

export const DEFAULT_EDIT_MODEL: EditCapableModelId = "schnell";

export const ALLOWED_EDIT_MODEL_IDS: ReadonlySet<string> = new Set(
  EDIT_CAPABLE_MODEL_IDS
);

/** Angebot der Oberfläche → Modellname am Gateway und Qualitätsstufe. */
export function resolveImageModel(id: ImageModelId): {
  modell: string;
  quality: ImageQuality;
  label: string;
} {
  const eintrag = IMAGE_MODELS.find((m) => m.id === id) ?? IMAGE_MODELS[0];
  const override =
    id === "premium"
      ? process.env.MODELL_BILD_PREMIUM
      : process.env.MODELL_BILD_SCHNELL;
  return {
    modell: override || eintrag.modell,
    quality: eintrag.quality,
    label: eintrag.label,
  };
}

// --- Seitenverhältnis → Pixelgröße (F3 a, ADR 0001) -------------------------
// OpenAI will BREITExHÖHE: Kanten Vielfache von 16, höchstens 3840, Verhältnis
// bis 3:1. Eine feste Größe je Verhältnis hält Kosten und Dauer berechenbar.

export const ASPECT_RATIO_SIZES = {
  "1:1": "1024x1024",
  "3:2": "1536x1024",
  "2:3": "1024x1536",
  "16:9": "2048x1152",
  "9:16": "1152x2048",
  "4:3": "1024x768",
  "3:4": "768x1024",
} as const;

export type AspectRatio = keyof typeof ASPECT_RATIO_SIZES;
export type ImageSize = (typeof ASPECT_RATIO_SIZES)[AspectRatio];

export const DEFAULT_ASPECT_RATIO: AspectRatio = "1:1";

export function sizeForAspectRatio(ratio: unknown): ImageSize {
  if (typeof ratio === "string" && ratio in ASPECT_RATIO_SIZES) {
    return ASPECT_RATIO_SIZES[ratio as AspectRatio];
  }
  return ASPECT_RATIO_SIZES[DEFAULT_ASPECT_RATIO];
}

// --- Video Models (Veo 3.1 über die Videoschnittstelle des Gateways, ADR 0002)
// Die Kennungen sind die öffentlichen Modellnamen im LiteLLM. Nur Startbild;
// das Endbild ist mit Weg b entfallen (Rico, 15.10.2026). Credits je Dauer
// (Rico, 15.10. nachts, nach dem Prüfstand): rund 1,3 Cent je Credit wie bei
// den Bildern, aus den Sekundenpreisen des Gateways (Lite 0,05 $, Fast 0,10 $,
// Standard 0,40 $ je Sekunde) gerundet.

export const VIDEO_MODELS = [
  {
    id: "veo-3.1-lite-generate-preview",
    label: "Veo 3.1 Lite",
    costs: { 4: 15, 6: 25, 8: 30 },
  },
  {
    id: "veo-3.1-fast-generate-preview",
    label: "Veo 3.1 Fast",
    costs: { 4: 30, 6: 45, 8: 60 },
  },
  {
    id: "veo-3.1-generate-preview",
    label: "Veo 3.1",
    costs: { 4: 120, 6: 180, 8: 240 },
  },
] as const;

export type VideoModelId = (typeof VIDEO_MODELS)[number]["id"];
export type VideoModel = (typeof VIDEO_MODELS)[number];

export const DEFAULT_VIDEO_MODEL: VideoModelId = "veo-3.1-lite-generate-preview";

export const ALLOWED_VIDEO_MODEL_IDS: ReadonlySet<string> = new Set(
  VIDEO_MODELS.map((m) => m.id)
);

export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16"] as const;
export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIOS)[number];
export const DEFAULT_VIDEO_ASPECT_RATIO: VideoAspectRatio = "16:9";

/** Seitenverhältnis → `size` der Videoschnittstelle (gemessen 15.10.2026: kommt so zurück). */
export const VIDEO_SIZES: Record<VideoAspectRatio, string> = {
  "16:9": "1280x720",
  "9:16": "720x1280",
};

export const VIDEO_DURATIONS = [4, 6, 8] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];
export const DEFAULT_VIDEO_DURATION: VideoDuration = 6;

/** Credits für ein Video mit Modell und Dauer. Unbekanntes Modell: teuerste Stufe. */
export function getVideoCost(modelId: string, duration: VideoDuration): number {
  const model = VIDEO_MODELS.find((m) => m.id === modelId);
  return model ? model.costs[duration] : 240;
}
