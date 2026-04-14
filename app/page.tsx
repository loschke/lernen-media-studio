"use client";

import { useState, useCallback } from "react";
import { useGallery, GalleryImage } from "@/hooks/useGallery";

import { GenerateTab } from "@/components/generate/generate-tab";
import { EditTab } from "@/components/edit/edit-tab";
import { ChatTab } from "@/components/chat/chat-tab";
import { GalleryView } from "@/components/gallery/gallery-view";

const MODES = [
  { id: "generate", label: "Generieren" },
  { id: "edit", label: "Bearbeiten" },
  { id: "chat", label: "Chat" },
  { id: "gallery", label: "Galerie" },
] as const;

type Mode = (typeof MODES)[number]["id"];

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

  const handleDownload = (img: GalleryImage) => {
    const link = document.createElement("a");
    link.href = `data:${img.mediaType};base64,${img.data}`;
    link.download = `bildwerkstatt-${img.id.substring(0, 8)}.png`;
    link.click();
  };

  const handleLoadIntoEdit = (img: GalleryImage) => {
    setPendingEditImage(img);
    setMode("edit");
  };

  const handleConsumePending = useCallback(() => {
    setPendingEditImage(null);
  }, []);

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 md:px-10 h-14 shrink-0 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-black tracking-tight text-foreground">
            Bildwerkstatt<span className="text-primary">.</span>
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

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">Verbleibend:</span>
          <span
            className={`font-bold ${
              generationsLeft < 5 ? "text-destructive" : "text-primary"
            }`}
          >
            {generationsLeft}
          </span>
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
            onConsumePending={handleConsumePending}
          />
        )}
        {mode === "chat" && <ChatTab />}
        {mode === "gallery" && (
          <GalleryView
            images={images}
            onDownload={handleDownload}
            onRemove={removeImage}
            onLoadIntoEdit={handleLoadIntoEdit}
          />
        )}
      </main>
    </div>
  );
}
