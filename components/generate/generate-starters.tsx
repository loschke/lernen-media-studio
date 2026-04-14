"use client";

import { Camera, Palette, BarChart3, Aperture } from "lucide-react";

interface Starter {
  id: string;
  title: string;
  description: string;
  icon: typeof Camera;
  prompt: string;
}

// Vier Beispiel-Prompts entlang des 4K-Frameworks. Englisch, weil
// Gemini-Bildmodelle damit am besten umgehen.
const STARTERS: Starter[] = [
  {
    id: "stock",
    title: "Stockbild Business",
    description: "Professionelle Foto-Aesthetik",
    icon: Camera,
    prompt:
      "professional photo of a diverse team collaborating around a laptop in a bright modern office, soft natural window light, eye level shot, shallow depth of field, candid editorial style",
  },
  {
    id: "artistic",
    title: "Künstlerisches Motiv",
    description: "Oel auf Leinwand, romantisch",
    icon: Palette,
    prompt:
      "oil painting of a lone fisherman in a wooden rowing boat on a misty lake at sunrise, golden hour, low angle shot, dramatic chiaroscuro lighting, in the style of Caspar David Friedrich",
  },
  {
    id: "infographic",
    title: "Infografik",
    description: "Flat-Vektor mit klarer Botschaft",
    icon: BarChart3,
    prompt:
      "minimalist flat vector infographic explaining the water cycle, isometric perspective, clean geometric icons with labels, muted teal and warm orange palette, white background, editorial illustration",
  },
  {
    id: "detail",
    title: "Detailaufnahme",
    description: "Makro-Fotografie",
    icon: Aperture,
    prompt:
      "extreme close-up macro photograph of a single dewdrop on a fresh green leaf, golden hour backlight, soft bokeh background, ultra sharp focus, vibrant natural colors, nature photography",
  },
];

interface GenerateStartersProps {
  onSelect: (prompt: string) => void;
}

export function GenerateStarters({ onSelect }: GenerateStartersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mx-auto">
      {STARTERS.map((s) => {
        const Icon = s.icon;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.prompt)}
            className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-sm text-foreground">
                  {s.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
