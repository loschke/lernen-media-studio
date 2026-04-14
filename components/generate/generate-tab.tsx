"use client";

import { useState } from "react";
import { Sparkles, Loader2, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePreview } from "./image-preview";
import { GenerateSettings } from "./generate-settings";
import { GenerateStarters } from "./generate-starters";
import { useGenerateSettings } from "@/hooks/useGenerateSettings";
import { getModelCost } from "@/lib/models";
import type { GalleryImage } from "@/hooks/useGallery";

interface GenerateTabProps {
  images: GalleryImage[];
  generationsLeft: number;
  addImage: (image: GalleryImage) => void;
  decrementCount: (amount?: number) => void;
  onDownload: (image: GalleryImage) => void;
  onLoadIntoEdit: (image: GalleryImage) => void;
}

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
  // Wenn der User "Neues Bild" klickt, merken wir uns die ID des aktuellen
  // Bildes und blenden es aus dem Canvas aus. Sobald ein neues generiert
  // wird, ersetzt es das alte (andere ID) und der Canvas zeigt es wieder.
  // Beim Mount mit leerem Canvas starten: das aktuell oberste Bild wird
  // per ID ausgeblendet. Tab-Wechsel unmountet die Komponente, beim
  // Wiedereintritt läuft diese Initialisierung erneut.
  const [dismissedId, setDismissedId] = useState<string | null>(
    () => images.find((i) => i.mediaType.startsWith("image/"))?.id ?? null
  );

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
        data.images.forEach((img: GalleryImage) => addImage(img));
        decrementCount(getModelCost(model));
      }
      setPrompt("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewImage = () => {
    if (latestImage) setDismissedId(latestImage.id);
    setPrompt("");
    setError("");
  };

  if (!isLoaded) return null;

  // Nur Bilder im Generate-Canvas zeigen (Videos sind nicht darstellbar).
  const latestImage = images.find((i) => i.mediaType.startsWith("image/"));
  const showCanvasImage = !!latestImage && latestImage.id !== dismissedId;
  const generateCost = getModelCost(model);

  return (
    <div className="flex flex-col h-full relative">
      {/* New Image button — only when an image is currently shown */}
      {showCanvasImage && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleNewImage}
          className="absolute top-3 right-4 z-10 h-8 gap-1.5 bg-card/90 backdrop-blur-sm text-muted-foreground hover:text-foreground"
          title="Neues Bild starten"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Neues Bild
        </Button>
      )}

      {/* Canvas area — fit to viewport */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-6 min-h-0">
        {showCanvasImage ? (
          <ImagePreview
            image={latestImage!}
            onDownload={onDownload}
            onLoadIntoEdit={onLoadIntoEdit}
          />
        ) : (
          <div className="flex flex-col items-center text-center gap-8 max-w-xl w-full overflow-y-auto thin-scrollbar py-4">
            <div className="space-y-3">
              <div className="rounded-full bg-primary/15 text-primary p-5 mx-auto w-fit">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                Was möchtest du erschaffen?
              </h2>
              <p className="font-serif italic text-base text-muted-foreground">
                Wähle einen Startpunkt oder schreibe direkt deinen Prompt unten.
              </p>
            </div>
            <GenerateStarters onSelect={(value) => setPrompt(value)} />
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 md:mx-8 mb-3 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex items-start gap-3">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Prompt-Card — Textarea above, action bar below */}
      <div className="shrink-0 px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card overflow-hidden focus-within:border-primary/50 transition-colors">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Beschreibe das Bild, das du generieren möchtest..."
            className="min-h-[96px] max-h-[240px] resize-none thin-scrollbar border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2 px-2 py-2 border-t border-border/40">
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
                generationsLeft < generateCost
              }
              size="sm"
              className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              title={`Kostet ${generateCost} ${
                generateCost === 1 ? "Credit" : "Credits"
              }`}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Generieren
                  <span className="ml-1.5 text-[10px] opacity-70">
                    · {generateCost}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
