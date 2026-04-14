"use client";

import { useState, useCallback } from "react";
import { useGallery, GalleryImage } from "@/hooks/useGallery";

import { GenerateTab } from "@/components/generate/generate-tab";
import { EditTab } from "@/components/edit/edit-tab";
import { VideoTab } from "@/components/video/video-tab";
import { ChatTab } from "@/components/chat/chat-tab";
import { GalleryView } from "@/components/gallery/gallery-view";

const MODES = [
  { id: "generate", label: "Generieren" },
  { id: "edit", label: "Bearbeiten" },
  { id: "video", label: "Video" },
  { id: "gallery", label: "Bibliothek" },
  { id: "chat", label: "Assistent" },
] as const;

type Mode = (typeof MODES)[number]["id"];

function extForDownload(mediaType: string): string {
  if (mediaType.startsWith("video/mp4")) return "mp4";
  if (mediaType.startsWith("video/")) return mediaType.split("/")[1] || "mp4";
  if (mediaType.startsWith("image/jpeg")) return "jpg";
  if (mediaType.startsWith("image/webp")) return "webp";
  return "png";
}

export default function MediaStudio() {
  const {
    images,
    addImage,
    removeImage,
    decrementCount,
    generationsLeft,
    isLoaded,
  } = useGallery();
  const [mode, setMode] = useState<Mode>("generate");
  const [pendingEditImage, setPendingEditImage] = useState<GalleryImage | null>(
    null
  );
  const [pendingVideoStartFrame, setPendingVideoStartFrame] =
    useState<GalleryImage | null>(null);

  const handleDownload = async (img: GalleryImage) => {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `bildwerkstatt-${img.id.substring(0, 8)}.${extForDownload(
        img.mediaType
      )}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.warn("Download failed", err);
    }
  };

  const handleLoadIntoEdit = (img: GalleryImage) => {
    setPendingEditImage(img);
    setMode("edit");
  };

  const handleLoadIntoVideo = (img: GalleryImage) => {
    setPendingVideoStartFrame(img);
    setMode("video");
  };

  const handleConsumePendingEdit = useCallback(() => {
    setPendingEditImage(null);
  }, []);
  const handleConsumePendingVideo = useCallback(() => {
    setPendingVideoStartFrame(null);
  }, []);

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 md:px-10 h-14 shrink-0 border-b border-border/50">
        {/* Brand: lernen.diy logo + Media Studio */}
        <div className="flex items-center gap-3">
          <span className="font-serif text-xl text-foreground leading-none">
            lernen<span className="italic text-primary">.diy</span>
          </span>
          <span className="h-5 w-px bg-border" />
          <span className="text-sm text-muted-foreground tracking-wide">
            Media Studio
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`relative px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === m.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
              {mode === m.id && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-sm">
          <nav className="hidden md:flex items-center gap-5 text-base">
            <a
              href="https://lernen.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif text-foreground/70 hover:text-foreground transition-colors leading-none"
            >
              lernen<span className="italic" style={{ color: "#0F766E" }}>.diy</span>
            </a>
            <a
              href="https://unlearn.how"
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif text-foreground/70 hover:text-foreground transition-colors leading-none"
            >
              <span className="italic">unlearn</span>
              <span style={{ color: "#a855f7" }}>.how</span>
            </a>
            <a
              href="https://loschke.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/70 hover:text-foreground transition-colors leading-none font-medium"
            >
              loschke<span style={{ color: "#FC2D01" }}>.ai</span>
            </a>
          </nav>
          <span className="h-5 w-px bg-border hidden md:inline-block" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="hidden sm:inline">Credits:</span>
            <span
              className={`font-bold ${
                generationsLeft < 5 ? "text-destructive" : "text-primary"
              }`}
            >
              {generationsLeft}
            </span>
          </div>
        </div>
      </header>

      {/* Content — fills remaining space */}
      <main className="flex-1 overflow-hidden">
        {mode === "generate" && (
          <GenerateTab
            images={images}
            generationsLeft={generationsLeft}
            addImage={addImage}
            decrementCount={decrementCount}
            onDownload={handleDownload}
            onLoadIntoEdit={handleLoadIntoEdit}
          />
        )}
        {mode === "edit" && (
          <EditTab
            galleryImages={images}
            generationsLeft={generationsLeft}
            addImage={addImage}
            decrementCount={decrementCount}
            pendingImage={pendingEditImage}
            onConsumePending={handleConsumePendingEdit}
          />
        )}
        {mode === "video" && (
          <VideoTab
            galleryImages={images}
            generationsLeft={generationsLeft}
            addVideo={addImage}
            decrementCount={decrementCount}
            pendingStartFrame={pendingVideoStartFrame}
            onConsumePending={handleConsumePendingVideo}
          />
        )}
        {mode === "chat" && <ChatTab />}
        {mode === "gallery" && (
          <GalleryView
            images={images}
            onDownload={handleDownload}
            onRemove={removeImage}
            onLoadIntoEdit={handleLoadIntoEdit}
            onLoadIntoVideo={handleLoadIntoVideo}
          />
        )}
      </main>
    </div>
  );
}
