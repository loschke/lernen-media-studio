"use client";

import { Sparkles, Wand2, Film, MessageCircle } from "lucide-react";

interface Intent {
  id: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  message: string;
}

const INTENTS: Intent[] = [
  {
    id: "image-prompt",
    title: "Bild-Prompt formulieren",
    description: "Geführt durch das 4K-Framework",
    icon: Sparkles,
    message:
      "Ich möchte einen detaillierten Bild-Prompt formulieren. Führe mich anhand des 4K-Frameworks (Konzept, Kontext, Komposition, Kreativität) Schritt für Schritt durch und stelle mir eine Frage nach der anderen. Starte mit K1 – Konzept (Subjekt + Medium).",
  },
  {
    id: "formula",
    title: "Prompt-Formel generieren",
    description: "Wiederverwendbar für Serien",
    icon: Wand2,
    message:
      "Ich möchte eine wiederverwendbare Prompt-Formel für eine Bildserie erstellen. Frage mich zuerst nach dem Zweck und der Zielgruppe, dann nach den Konsistenz-Elementen (was bleibt gleich) und den variablen Teilen (was ändert sich) – jeweils eine Frage nach der anderen.",
  },
  {
    id: "video-prompt",
    title: "Video-Prompt formulieren",
    description: "Mit der 6-Bausteine Kern-Formel",
    icon: Film,
    message:
      "Ich möchte einen strukturierten Video-Prompt formulieren. Führe mich durch die 6 Bausteine der Kern-Formel (Cinematography, Subject, Action, Context, Style, Audio). Stelle mir eine Frage nach der anderen, starte mit Cinematography.",
  },
  {
    id: "chat",
    title: "Zum Thema chatten",
    description: "Offene Fragen zur Bild-KI",
    icon: MessageCircle,
    message:
      "Stelle dich kurz vor und sag mir in drei bis fünf Stichpunkten, bei welchen Themen rund um KI-Bildgenerierung ich dich fragen kann.",
  },
];

interface ChatIntentsProps {
  onSelect: (message: string) => void;
}

export function ChatIntents({ onSelect }: ChatIntentsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mx-auto">
      {INTENTS.map((intent) => {
        const Icon = intent.icon;
        return (
          <button
            key={intent.id}
            type="button"
            onClick={() => onSelect(intent.message)}
            className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-sm text-foreground">
                  {intent.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {intent.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
