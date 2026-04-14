"use client";

import { Clapperboard, Mountain, Sparkles, Package } from "lucide-react";

interface Starter {
  id: string;
  title: string;
  description: string;
  icon: typeof Clapperboard;
  prompt: string;
}

// Vier Beispiel-Prompts entlang des Veo-Prompting-Frameworks:
// Subject → Action → Scene → Camera → Style/Lighting → Audio.
// Englisch, weil Veo damit am besten umgeht.
const STARTERS: Starter[] = [
  {
    id: "cinematic",
    title: "Cinematic Scene",
    description: "Filmische Szene mit Kamerabewegung",
    icon: Clapperboard,
    prompt:
      "A lone detective in a trench coat walks down a rain-soaked alley at night. Slow dolly-in tracking shot at eye level, shallow depth of field. Neo-noir cinematic style, neon signs reflecting in puddles, volumetric light through steam. Moody synthwave score, distant city sirens, soft rain ambience.",
  },
  {
    id: "nature",
    title: "Nature Documentary",
    description: "Landschaft im Dokumentar-Stil",
    icon: Mountain,
    prompt:
      "A majestic eagle soars above snow-capped mountain peaks at sunrise. Sweeping aerial drone shot, following the bird from behind, gradually tilting down to reveal a vast alpine valley. Photorealistic documentary style, golden hour lighting, crisp atmospheric haze. Wind sound, distant eagle calls, orchestral swell.",
  },
  {
    id: "product",
    title: "Product Reveal",
    description: "Produktshot mit Studio-Lighting",
    icon: Package,
    prompt:
      "A sleek black wireless headphone rotates slowly on a matte pedestal. Locked-off macro shot, 360-degree orbital camera, extreme close-up on the ear cup as droplets of water bead on the surface. Premium commercial aesthetic, studio lighting with soft rim light, pure black background. Deep bass hum, subtle electronic pulse, a single resonant chime.",
  },
  {
    id: "stylized",
    title: "Stylized Animation",
    description: "Animierte Szene im Studio-Ghibli-Stil",
    icon: Sparkles,
    prompt:
      "A young girl in a yellow raincoat chases a glowing firefly through a lush forest clearing. Low-angle tracking shot that follows her at running speed, leaves and petals swirling in the wind. Hand-drawn 2D animation in the style of Studio Ghibli, soft pastel colors, dappled sunlight through the canopy. Whimsical piano melody, gentle wind through leaves, light footsteps on grass.",
  },
];

interface VideoStartersProps {
  onSelect: (prompt: string) => void;
}

export function VideoStarters({ onSelect }: VideoStartersProps) {
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
