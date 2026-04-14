export const IMAGE_MODELS = [
  { id: "gemini-2.5-flash-image", label: "Standardmodell", cost: 1 },
  { id: "gemini-3.1-flash-image-preview", label: "Schnell & Kreativ", cost: 2 },
  { id: "gemini-3-pro-image-preview", label: "Höchste Qualität", cost: 5 },
] as const;

export type ImageModelId = (typeof IMAGE_MODELS)[number]["id"];
export type ImageModel = (typeof IMAGE_MODELS)[number];

export const DEFAULT_MODEL: ImageModelId = "gemini-2.5-flash-image";

/**
 * Credit cost for a single API call with the given model. Covers image +
 * video models. Falls back to 1 for unknown models.
 */
export function getModelCost(modelId: string): number {
  return (
    IMAGE_MODELS.find((m) => m.id === modelId)?.cost ??
    VIDEO_MODELS.find((m) => m.id === modelId)?.cost ??
    1
  );
}

export const ALLOWED_MODEL_IDS: ReadonlySet<string> = new Set(
  IMAGE_MODELS.map((m) => m.id)
);

// Image-to-Image/Editing wird nur von den Gemini-3.x Modellen unterstützt.
// gemini-2.5-flash-image ist reines Text-to-Image.
export const EDIT_CAPABLE_MODEL_IDS = [
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
] as const satisfies readonly ImageModelId[];

export type EditCapableModelId = (typeof EDIT_CAPABLE_MODEL_IDS)[number];

export const EDIT_CAPABLE_MODELS = IMAGE_MODELS.filter((m) =>
  (EDIT_CAPABLE_MODEL_IDS as readonly string[]).includes(m.id)
);

export const DEFAULT_EDIT_MODEL: EditCapableModelId =
  "gemini-3.1-flash-image-preview";

export const ALLOWED_EDIT_MODEL_IDS: ReadonlySet<string> = new Set(
  EDIT_CAPABLE_MODEL_IDS
);

// Gemini Image-Modelle unterstützen 1K, 2K, 4K (kleinere Werte nicht zulässig).
export const IMAGE_SIZES = [
  { id: "1K", label: "1K (klein, spart Speicher)" },
  { id: "2K", label: "2K (mittel)" },
  { id: "4K", label: "4K (groß)" },
] as const;

export type ImageSize = (typeof IMAGE_SIZES)[number]["id"];

export const DEFAULT_IMAGE_SIZE: ImageSize = "1K";

export const ALLOWED_IMAGE_SIZES: ReadonlySet<string> = new Set(
  IMAGE_SIZES.map((s) => s.id)
);

// --- Video Models (Veo 3.1) ---------------------------------------------

export const VIDEO_MODELS = [
  {
    id: "veo-3.1-lite-generate-preview",
    label: "Veo 3.1 Lite",
    cost: 10,
    supportsEndFrame: false,
  },
  {
    id: "veo-3.1-fast-generate-preview",
    label: "Veo 3.1 Fast",
    cost: 20,
    supportsEndFrame: true,
  },
  {
    id: "veo-3.1-generate-preview",
    label: "Veo 3.1",
    cost: 40,
    supportsEndFrame: true,
  },
] as const;

export type VideoModelId = (typeof VIDEO_MODELS)[number]["id"];
export type VideoModel = (typeof VIDEO_MODELS)[number];

export const DEFAULT_VIDEO_MODEL: VideoModelId = "veo-3.1-lite-generate-preview";

export const ALLOWED_VIDEO_MODEL_IDS: ReadonlySet<string> = new Set(
  VIDEO_MODELS.map((m) => m.id)
);

export function videoSupportsEndFrame(modelId: string): boolean {
  return VIDEO_MODELS.find((m) => m.id === modelId)?.supportsEndFrame ?? false;
}

export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16"] as const;
export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIOS)[number];
export const DEFAULT_VIDEO_ASPECT_RATIO: VideoAspectRatio = "16:9";

export const VIDEO_DURATIONS = [4, 6, 8] as const;
export type VideoDuration = (typeof VIDEO_DURATIONS)[number];
export const DEFAULT_VIDEO_DURATION: VideoDuration = 6;
