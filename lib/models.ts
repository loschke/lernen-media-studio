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

// --- Video (Gemini Omni Flash über die Gemini-Durchleitung des Gateways, ADR 0003)
// Google hat die Veo-3.1-Previews am 22.10.2026 abgeschaltet, Nachfolger ist
// Omni über die Interactions API. Die Kennung ist der öffentliche Modellname
// im LiteLLM, ohne Anbieter-Präfix: Die Durchleitung reicht ihn wörtlich an
// Google weiter. Credits je Dauer (Vorschlag 05.11.2026): 720p kostet bei
// Google rund 0,07 $ je Sekunde, ein Credit steht wie bei den Bildern für rund
// 1,3 Cent.

export const VIDEO_MODELS = [
  {
    id: "gemini-omni-1.2-flash",
    label: "Gemini Omni Flash",
    costs: { 4: 20, 6: 30, 8: 45, 10: 55, 15: 80 },
  },
] as const;

export type VideoModelId = (typeof VIDEO_MODELS)[number]["id"];
export type VideoModel = (typeof VIDEO_MODELS)[number];

export const DEFAULT_VIDEO_MODEL: VideoModelId = "gemini-omni-1.2-flash";

export const ALLOWED_VIDEO_MODEL_IDS: ReadonlySet<string> = new Set(
  VIDEO_MODELS.map((m) => m.id)
);

/** Modellname am Gateway. `MODELL_VIDEO` überschreibt ihn, die Oberfläche zeigt weiter den Standardnamen. */
export function resolveVideoModel(id: VideoModelId): string {
  return process.env.MODELL_VIDEO || id;
}

export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16"] as const;
export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIOS)[number];
export const DEFAULT_VIDEO_ASPECT_RATIO: VideoAspectRatio = "16:9";

/** Feste Auflösung: hält Kosten und Dauer berechenbar (360p, 1080p und 4k hätten andere Preise). */
export const VIDEO_RESOLUTION = "720p";

// Omni nimmt ganze Sekunden von 3 bis 15 an (gemessen 05.11.2026: 20 s gibt 400).
export const VIDEO_DURATIONS = [4, 6, 8, 10, 15] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];
export const DEFAULT_VIDEO_DURATION: VideoDuration = 6;

// --- Video fortsetzen (ADR 0003, Nachtrag 06.11.2026) ----------------------
// Omni hängt an ein eigenes Video 3 bis 10 s an und gibt das ganze Video
// zurück, höchstens 30 s. Die angehängten Sekunden kosten dieselben Credits
// wie ein neues Video dieser Länge. Google hält gespeicherte Vorgänge 55 Tage.

export const VIDEO_EXTEND_DURATIONS = [4, 6, 8, 10] as const satisfies readonly VideoDuration[];
export const VIDEO_MAX_TOTAL_SECONDS = 30;
export const VIDEO_EXTEND_MAX_AGE_DAYS = 55;

/** Anhängbare Längen für ein Video der Länge `bisher` (Sekunden). Leer: nicht fortsetzbar. */
export function extendDurationsFor(bisher: number): VideoDuration[] {
  return VIDEO_EXTEND_DURATIONS.filter((d) => bisher + d <= VIDEO_MAX_TOTAL_SECONDS);
}

/** Credits für ein Video mit Modell und Dauer. Unbekanntes Modell: teuerste Stufe. */
export function getVideoCost(modelId: string, duration: VideoDuration): number {
  const model = VIDEO_MODELS.find((m) => m.id === modelId);
  return model ? model.costs[duration] : 80;
}
