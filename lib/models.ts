export const IMAGE_MODELS = [
  { id: "gemini-2.5-flash-image", label: "Standardmodell" },
  { id: "gemini-3.1-flash-image-preview", label: "Schnell & Kreativ" },
  { id: "gemini-3-pro-image-preview", label: "Höchste Qualität" },
] as const;

export type ImageModelId = (typeof IMAGE_MODELS)[number]["id"];

export const DEFAULT_MODEL: ImageModelId = "gemini-2.5-flash-image";

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
