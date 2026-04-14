"use client";

import { useState } from "react";
import { Sparkles, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePreview } from "./image-preview";
import { GenerateSettings } from "./generate-settings";
import { useGenerateSettings } from "@/hooks/useGenerateSettings";
import type { GalleryImage } from "@/hooks/useGallery";

interface GenerateTabProps {
  images: GalleryImage[];
  generationsLeft: number;
  addImage: (image: Omit<GalleryImage, "id" | "timestamp">) => void;
  decrementCount: (amount?: number) => void;
  onDownload: (image: GalleryImage) => void;
  onLoadIntoEdit: (image: GalleryImage) => void;
}

const GENERATE_COST = 1;

export function GenerateTab({
  images,
  generationsLeft,
  addImage,
  decrementCount,
  onDownload,
  onLoadIntoEdit,
}: GenerateTabProps) {
  const { model, aspectRatio, setModel, setAspectRatio, isLoaded } =
    useGenerateSettings();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio, model }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler bei der Generierung");
      }

      if (data.images && data.images.length > 0) {
        data.images.forEach((img: { data: string; mediaType: string }) => {
          addImage({ data: img.data, mediaType: img.mediaType, prompt });
        });
        decrementCount(GENERATE_COST);
      }
      setPrompt("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Canvas area — fit to viewport */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-6 min-h-0">
        {images.length > 0 ? (
          <ImagePreview
            image={images[0]}
            onDownload={onDownload}
            onLoadIntoEdit={onLoadIntoEdit}
          />
        ) : (
          <div className="flex flex-col items-center text-center text-muted-foreground gap-3">
            <div className="rounded-full bg-muted p-5">
              <Sparkles className="h-10 w-10 opacity-40" />
            </div>
            <p className="font-serif italic text-base">
              Beschreibe dein Bild und klicke auf Generieren.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 md:mx-8 mb-3 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex items-start gap-3">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Bottom bar — prompt + settings + generate */}
      <div className="shrink-0 border-t border-border/50 bg-card/50 px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Beschreibe das Bild, das du generieren möchtest..."
            className="min-h-[96px] max-h-[240px] resize-none flex-1 thin-scrollbar"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <GenerateSettings
            model={model}
            aspectRatio={aspectRatio}
            onModelChange={setModel}
            onAspectRatioChange={setAspectRatio}
          />
          <Button
            onClick={handleGenerate}
            disabled={
              !prompt.trim() ||
              isGenerating ||
              generationsLeft < GENERATE_COST
            }
            className="h-[52px] px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shrink-0"
            title={`Kostet ${GENERATE_COST} Credit`}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generieren
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
