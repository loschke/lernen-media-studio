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
  FastForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FittedVideo } from "@/components/ui/fitted-video";
import { VideoSettings } from "./video-settings";
import { VideoStarters } from "./video-starters";
import { useVideoSettings } from "@/hooks/useVideoSettings";
import {
  getVideoCost,
  extendDurationsFor,
  VIDEO_MAX_TOTAL_SECONDS,
  type VideoDuration,
} from "@/lib/models";
import { bildFuerUpload, letztesBildAusVideo, antwortLesen } from "@/lib/client-image";
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

// Gemessen 05.11.2026: Omni braucht 20 bis 40 s, ein Abruf dauert unter 1 s.
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 90; // sechs Minuten

/** Was die Bibliothek an den Video-Reiter übergibt. */
export interface VideoFollowUp {
  kind: "extend" | "lastFrame";
  item: GalleryImage;
}

/** Anhängbare Längen für ein Video, leer wenn es sich nicht fortsetzen lässt. */
function fortsetzbarUm(video: GalleryImage | null): VideoDuration[] {
  if (!video?.canExtend) return [];
  return extendDurationsFor(video.durationSec ?? 0);
}

interface VideoTabProps {
  galleryImages: GalleryImage[];
  credits: number;
  addVideo: (video: GalleryImage) => void;
  setCredits: (value: number) => void;
  pendingStartFrame: GalleryImage | null;
  onConsumePending: () => void;
  pendingAction: VideoFollowUp | null;
  onConsumePendingAction: () => void;
}

export function VideoTab({
  galleryImages,
  credits,
  addVideo,
  setCredits,
  pendingStartFrame,
  onConsumePending,
  pendingAction,
  onConsumePendingAction,
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
  // Fortsetzen (ADR 0003, Nachtrag 06.11.2026): Omni knüpft an dieses Video an
  // und gibt das ganze, verlängerte Video zurück. Schließt ein Startbild aus.
  const [extendFrom, setExtendFrom] = useState<GalleryImage | null>(null);
  const [isGrabbingFrame, setIsGrabbingFrame] = useState(false);
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
      setExtendFrom(null);
      setStartFrame({
        source: "gallery",
        id: pendingStartFrame.id,
        url: pendingStartFrame.url,
        mediaType: pendingStartFrame.mediaType,
      });
    }
    onConsumePending();
  }, [pendingStartFrame, onConsumePending]);

  const startExtend = useCallback((video: GalleryImage) => {
    setResult(null);
    setError("");
    setStartFrame(null);
    setPrompt("");
    setExtendFrom(video);
  }, []);

  const grabLastFrame = useCallback(async (video: GalleryImage) => {
    setError("");
    setIsGrabbingFrame(true);
    try {
      const frame = await letztesBildAusVideo(video.url);
      setExtendFrom(null);
      setStartFrame(frame);
      setResult(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Das letzte Bild ließ sich nicht lesen.");
    } finally {
      setIsGrabbingFrame(false);
    }
  }, []);

  // Übergabe aus der Bibliothek: Fortsetzen oder letztes Bild als Startframe.
  useEffect(() => {
    if (!pendingAction) return;
    if (pendingAction.kind === "extend") startExtend(pendingAction.item);
    else void grabLastFrame(pendingAction.item);
    onConsumePendingAction();
  }, [pendingAction, onConsumePendingAction, startExtend, grabLastFrame]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Ein Startbild je Anfrage, es bekommt das ganze Budget (Prüfstand S4).
    bildFuerUpload(file)
      .then((frame) => {
        setExtendFrom(null);
        setStartFrame(frame);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Bild konnte nicht gelesen werden.")
      );
  };

  const handleSelectGalleryAsFrame = (img: GalleryImage) => {
    // Only images work as frames
    if (!img.mediaType.startsWith("image/")) return;
    setExtendFrom(null);
    setStartFrame({
      source: "gallery",
      id: img.id,
      url: img.url,
      mediaType: img.mediaType,
    });
  };

  // Beim Fortsetzen gelten nur die Längen, mit denen das Video unter der
  // Obergrenze bleibt. Passt die gemerkte Dauer nicht, gilt die längste erlaubte.
  const extendDurations = fortsetzbarUm(extendFrom);
  const effectiveDuration: VideoDuration =
    extendFrom && !extendDurations.includes(duration)
      ? extendDurations[extendDurations.length - 1] ?? duration
      : duration;

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
          duration: effectiveDuration,
          startFrame: startFrame && !extendFrom ? toImageRef(startFrame) : undefined,
          extendFrom: extendFrom ? { id: extendFrom.id } : undefined,
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

      const laeuft = extendFrom ? "Dein Video wird fortgesetzt…" : "Dein Video wird generiert…";
      setProgressText(laeuft);

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
          setExtendFrom(null);
          break;
        }

        setProgressText(
          `${laeuft} (${attempts * (POLL_INTERVAL_MS / 1000)}s)`
        );

        if (attempts > MAX_POLL_ATTEMPTS) {
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
    effectiveDuration,
    startFrame,
    extendFrom,
    addVideo,
    setCredits,
  ]);

  const handleNew = () => {
    setResult(null);
    setStartFrame(null);
    setExtendFrom(null);
    setError("");
  };

  if (!isLoaded) return null;

  const cost = getVideoCost(model, effectiveDuration);
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
            <div className="flex flex-wrap justify-center gap-2 shrink-0">
              {fortsetzbarUm(result).length > 0 && (
                <Button
                  onClick={() => startExtend(result)}
                  variant="secondary"
                  title={`Omni hängt an dieses Video an, bis höchstens ${VIDEO_MAX_TOTAL_SECONDS} Sekunden`}
                >
                  <FastForward className="h-4 w-4 mr-2" />
                  Fortsetzen
                </Button>
              )}
              <Button
                onClick={() => grabLastFrame(result)}
                variant="secondary"
                disabled={isGrabbingFrame}
                title="Nimmt das letzte Bild dieses Videos als Startframe für ein neues Video"
              >
                {isGrabbingFrame ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-2" />
                )}
                Letztes Bild als Startframe
              </Button>
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
              {extendFrom
                ? "Eine Fortsetzung dauert länger als ein neues Video, je nach Gesamtlänge eine bis drei Minuten. Lass diesen Tab so lange geöffnet."
                : "Video-Generierung dauert je nach Länge und Auslastung meist 20 Sekunden bis eine Minute. Lass diesen Tab so lange geöffnet."}
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
      {!result && !isGenerating && !extendFrom && imageGalleryItems.length > 0 && (
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
            {extendFrom ? (
              <div className="flex items-center gap-3 px-3 py-3 border-b border-border/40">
                <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden border border-primary/50 bg-black">
                  <video
                    src={extendFrom.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <button
                    onClick={() => setExtendFrom(null)}
                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                    title="Fortsetzen abbrechen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <FastForward className="h-3.5 w-3.5 text-primary" />
                    Video fortsetzen
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bisher {extendFrom.durationSec ?? "?"} s, höchstens{" "}
                    {VIDEO_MAX_TOTAL_SECONDS} s. Du bekommst das ganze, verlängerte
                    Video als neuen Eintrag.
                  </p>
                </div>
              </div>
            ) : (
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
            )}

            {/* Prompt */}
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  extendFrom
                    ? "Beschreibe, wie das Video weitergeht..."
                    : "Beschreibe das Video, das du generieren möchtest..."
                }
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
                duration={effectiveDuration}
                onModelChange={setModel}
                onAspectRatioChange={setAspectRatio}
                onDurationChange={setDuration}
                durations={extendFrom ? extendDurations : undefined}
                extending={Boolean(extendFrom)}
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
                    {extendFrom ? (
                      <FastForward className="h-3.5 w-3.5 mr-1.5" />
                    ) : (
                      <Film className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {extendFrom ? "Video fortsetzen" : "Video generieren"}
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
