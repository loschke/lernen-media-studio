"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Film,
  Loader2,
  Info,
  X,
  Save,
  ImagePlus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FittedVideo } from "@/components/ui/fitted-video";
import { VideoSettings } from "./video-settings";
import { VideoStarters } from "./video-starters";
import { useVideoSettings } from "@/hooks/useVideoSettings";
import { getVideoCost } from "@/lib/models";
import type { GalleryImage } from "@/hooks/useGallery";

type FrameSource =
  | { source: "gallery"; id: string; url: string; mediaType: string }
  | { source: "upload"; data: string; mediaType: string };

function frameSrc(f: FrameSource): string {
  if (f.source === "gallery") return f.url;
  return `data:${f.mediaType};base64,${f.data}`;
}

function toImageRef(f: FrameSource) {
  return f.source === "gallery"
    ? { source: "gallery", id: f.id }
    : { source: "upload", data: f.data, mediaType: f.mediaType };
}

const POLL_INTERVAL_MS = 7000;

// Vercel nimmt höchstens 4,5 MB je Anfrage an und antwortet darüber mit dem
// Text „Request Entity Too Large“ statt JSON (Prüfstand Etappe 2, S4: ein
// 4,35-MB-JPEG wurde als Base64 zu 5,8 MB). Darum werden hochgeladene Fotos
// im Browser auf höchstens 2048 px Kante und etwa 3 MB verkleinert; als
// Base64 bleiben das rund 4 MB. Veo bekommt davon nichts mit.
const MAX_FRAME_EDGE = 2048;
const MAX_FRAME_BYTES = 3 * 1024 * 1024;

async function frameAusDatei(file: File): Promise<FrameSource> {
  const lesen = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_FRAME_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_FRAME_BYTES) {
    bitmap.close();
    return { source: "upload", data: await lesen(file), mediaType: file.type };
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let qualitaet = 0.9;
  let blob: Blob | null = null;
  while (qualitaet >= 0.5) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", qualitaet));
    if (blob && blob.size <= MAX_FRAME_BYTES) break;
    qualitaet -= 0.1;
  }
  if (!blob) throw new Error("Bild konnte nicht verkleinert werden.");
  return { source: "upload", data: await lesen(blob), mediaType: "image/jpeg" };
}

/** Antwort lesen, auch wenn Vercel Text statt JSON schickt (413 bei zu großer Anfrage). */
async function antwortLesen(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 413) {
      return { error: "Die Anfrage ist zu groß für den Server (höchstens 4,5 MB). Bitte ein kleineres Startbild wählen." };
    }
    return { error: `Unerwartete Antwort des Servers (${res.status}): ${text.slice(0, 120)}` };
  }
}

interface VideoTabProps {
  galleryImages: GalleryImage[];
  credits: number;
  addVideo: (video: GalleryImage) => void;
  setCredits: (value: number) => void;
  pendingStartFrame: GalleryImage | null;
  onConsumePending: () => void;
}

export function VideoTab({
  galleryImages,
  credits,
  addVideo,
  setCredits,
  pendingStartFrame,
  onConsumePending,
}: VideoTabProps) {
  const {
    model,
    aspectRatio,
    duration,
    setModel,
    setAspectRatio,
    setDuration,
    isLoaded,
  } = useVideoSettings();

  const [prompt, setPrompt] = useState("");
  // Nur ein Startbild: Das Endbild ist mit ADR 0002 (Video über die
  // Videoschnittstelle des Gateways) entfallen.
  const [startFrame, setStartFrame] = useState<FrameSource | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState<string>("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<GalleryImage | null>(null);

  const startInputRef = useRef<HTMLInputElement>(null);

  // Accept incoming startFrame from Gallery
  useEffect(() => {
    if (!pendingStartFrame) return;
    // Only image mediaType makes sense as a frame
    if (pendingStartFrame.mediaType.startsWith("image/")) {
      setStartFrame({
        source: "gallery",
        id: pendingStartFrame.id,
        url: pendingStartFrame.url,
        mediaType: pendingStartFrame.mediaType,
      });
    }
    onConsumePending();
  }, [pendingStartFrame, onConsumePending]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    frameAusDatei(file)
      .then(setStartFrame)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Bild konnte nicht gelesen werden.")
      );
  };

  const handleSelectGalleryAsFrame = (img: GalleryImage) => {
    // Only images work as frames
    if (!img.mediaType.startsWith("image/")) return;
    setStartFrame({
      source: "gallery",
      id: img.id,
      url: img.url,
      mediaType: img.mediaType,
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError("");
    setResult(null);
    setProgressText("Video wird vorbereitet…");

    try {
      const startRes = await fetch("/api/generate-video/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          aspectRatio,
          duration,
          startFrame: startFrame ? toImageRef(startFrame) : undefined,
        }),
      });
      const startData = await antwortLesen(startRes);
      if (typeof startData.credits === "number") {
        setCredits(startData.credits);
      }
      if (!startRes.ok) {
        throw new Error(String(startData.error || "Start fehlgeschlagen"));
      }

      const jobId = String(startData.jobId || "");
      if (!jobId) throw new Error("Keine Vorgangskennung erhalten");

      setProgressText("Veo generiert dein Video…");

      let attempts = 0;
      while (true) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        attempts++;
        const statusRes = await fetch("/api/generate-video/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, prompt }),
        });
        const statusData = await antwortLesen(statusRes);

        if (!statusRes.ok) {
          throw new Error(String(statusData.error || "Status-Abruf fehlgeschlagen"));
        }

        if (statusData.done) {
          if (statusData.error) throw new Error(String(statusData.error));
          const video = statusData.video as GalleryImage;
          setResult(video);
          addVideo(video);
          break;
        }

        setProgressText(
          `Veo generiert dein Video… (${attempts * (POLL_INTERVAL_MS / 1000)}s)`
        );

        if (attempts > 60) {
          throw new Error(
            "Zeitüberschreitung beim Warten auf das Video. Bitte später erneut versuchen."
          );
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setIsGenerating(false);
      setProgressText("");
    }
  }, [
    prompt,
    model,
    aspectRatio,
    duration,
    startFrame,
    addVideo,
    setCredits,
  ]);

  const handleNew = () => {
    setResult(null);
    setStartFrame(null);
    setError("");
  };

  if (!isLoaded) return null;

  const cost = getVideoCost(model, duration);
  const imageGalleryItems = galleryImages.filter((g) =>
    g.mediaType.startsWith("image/")
  );

  return (
    <div className="flex flex-col h-full relative">
      {result && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleNew}
          className="absolute top-3 right-4 z-10 h-8 gap-1.5 bg-card/90 backdrop-blur-sm text-muted-foreground hover:text-foreground"
          title="Neues Video starten"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Neues Video
        </Button>
      )}

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-3 sm:p-6 min-h-0">
        {result ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500 w-full h-full min-h-0">
            <div className="flex-1 min-h-0 w-full">
              <FittedVideo
                src={result.url}
                autoPlay
                loop
                controls
                muted={false}
                className="rounded-xl overflow-hidden border border-border bg-black"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button onClick={handleNew} variant="secondary">
                <Save className="h-4 w-4 mr-2" />
                Fertig
              </Button>
            </div>
          </div>
        ) : isGenerating ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-serif italic text-base">{progressText}</p>
            <p className="text-xs max-w-sm">
              Video-Generierung dauert je nach Modell und Auslastung 30 Sekunden
              bis mehrere Minuten. Du kannst diesen Tab geöffnet lassen.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-8 max-w-xl w-full overflow-y-auto thin-scrollbar py-4">
            <div className="space-y-3">
              <div className="rounded-full bg-primary/15 text-primary p-5 mx-auto w-fit">
                <Film className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                Welches Video soll entstehen?
              </h2>
              <p className="font-serif italic text-base text-muted-foreground">
                Wähle eine Szene als Startpunkt oder beschreibe direkt dein
                eigenes Video unten.
              </p>
            </div>
            <VideoStarters onSelect={(value) => setPrompt(value)} />
          </div>
        )}
      </div>

      {error && (
        <div className="mx-3 sm:mx-4 md:mx-8 mb-3 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex items-start gap-3">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Gallery image strip for frame selection */}
      {!result && !isGenerating && imageGalleryItems.length > 0 && (
        <div className="shrink-0 px-3 sm:px-4 md:px-8 pb-2">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-muted-foreground mb-2">
              Aus Galerie als Startframe übernehmen
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {imageGalleryItems.map((img) => {
                const isStart =
                  startFrame?.source === "gallery" && startFrame.id === img.id;
                return (
                  <button
                    key={img.id}
                    onClick={() => handleSelectGalleryAsFrame(img)}
                    className={`relative shrink-0 rounded-md overflow-hidden border-2 h-14 w-14 transition-all ${
                      isStart
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    title={isStart ? "Startframe" : "Als Startframe übernehmen"}
                  >
                    <img
                      src={img.url}
                      alt={img.prompt}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {isStart && (
                      <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-[9px] font-semibold text-primary-foreground py-0.5">
                        START
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Prompt card */}
      {!result && (
        <div className="shrink-0 px-3 sm:px-4 md:px-8 py-3 sm:py-4">
          <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card overflow-hidden focus-within:border-primary/50 transition-colors">
            {/* Frame slots */}
            <div className="flex items-center gap-3 px-3 py-3 border-b border-border/40">
              {/* Start */}
              <FrameSlot
                label="Startframe"
                frame={startFrame}
                onRemove={() => setStartFrame(null)}
                onPickClick={() => startInputRef.current?.click()}
              />
              <input
                ref={startInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />

              <p className="text-xs text-muted-foreground ml-auto">
                Startframe optional
              </p>
            </div>

            {/* Prompt */}
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Beschreibe das Video, das du generieren möchtest..."
                className="min-h-[96px] max-h-[240px] resize-none thin-scrollbar border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 pr-10"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
              {prompt && !isGenerating && (
                <button
                  type="button"
                  onClick={() => setPrompt("")}
                  className="absolute top-2 right-2 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  title="Prompt löschen"
                  aria-label="Prompt löschen"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between gap-2 px-2 py-2 border-t border-border/40">
              <VideoSettings
                model={model}
                aspectRatio={aspectRatio}
                duration={duration}
                onModelChange={setModel}
                onAspectRatioChange={setAspectRatio}
                onDurationChange={setDuration}
              />
              <Button
                onClick={handleGenerate}
                disabled={
                  !prompt.trim() || isGenerating || credits < cost
                }
                size="sm"
                className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                title={`Kostet ${cost} Credits`}
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Film className="h-3.5 w-3.5 mr-1.5" />
                    Video generieren
                    <span className="ml-1.5 text-[10px] opacity-70">
                      · {cost}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FrameSlot({
  label,
  frame,
  onRemove,
  onPickClick,
}: {
  label: string;
  frame: FrameSource | null;
  onRemove: () => void;
  onPickClick: () => void;
}) {
  if (frame) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative h-16 w-16 rounded-md overflow-hidden border border-primary/50">
          <img
            src={frameSrc(frame)}
            alt={label}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onRemove}
            className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
            title="Entfernen"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onPickClick}
        className="h-16 w-16 rounded-md border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        title={`${label} hochladen`}
      >
        <ImagePlus className="h-4 w-4" />
      </button>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
