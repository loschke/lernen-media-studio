"use client";

import { useEffect, useState } from "react";
import {
  ImageIcon,
  Download,
  Trash2,
  Edit3,
  Film,
  Play,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { GalleryImage } from "@/hooks/useGallery";

type Filter = "all" | "image" | "video";

interface GalleryViewProps {
  images: GalleryImage[];
  onDownload: (image: GalleryImage) => void;
  onRemove: (id: string) => void;
  onLoadIntoEdit: (image: GalleryImage) => void;
  onLoadIntoVideo: (image: GalleryImage) => void;
}

export function GalleryView({
  images,
  onDownload,
  onRemove,
  onLoadIntoEdit,
  onLoadIntoVideo,
}: GalleryViewProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleCopyPrompt = async (item: GalleryImage) => {
    try {
      await navigator.clipboard.writeText(item.prompt);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((id) => (id === item.id ? null : id)), 1500);
    } catch {
      // Clipboard API can fail in insecure contexts — silent no-op.
    }
  };

  const imageCount = images.filter((i) => i.mediaType.startsWith("image/")).length;
  const videoCount = images.filter((i) => i.mediaType.startsWith("video/")).length;

  const filtered = images.filter((i) => {
    if (filter === "image") return i.mediaType.startsWith("image/");
    if (filter === "video") return i.mediaType.startsWith("video/");
    return true;
  });

  const lightboxItem =
    lightboxIndex !== null && lightboxIndex < filtered.length
      ? filtered[lightboxIndex]
      : null;

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setLightboxIndex((i) =>
          i === null ? null : (i + 1) % filtered.length
        );
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((i) =>
          i === null ? null : (i - 1 + filtered.length) % filtered.length
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, filtered.length]);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4 p-6">
        <div className="rounded-full bg-muted p-5">
          <ImageIcon className="h-10 w-10 opacity-40" />
        </div>
        <div>
          <p className="text-base font-medium text-foreground/70">Noch keine Medien</p>
          <p className="text-sm mt-1">Generierte Bilder und Videos erscheinen hier.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center gap-3 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 pb-2">
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as Filter)}
          className="gap-1.5"
        >
          <ToggleGroupItem
            value="all"
            aria-label="Alle"
            className="border border-border data-[state=on]:bg-primary/15 data-[state=on]:border-primary/40 data-[state=on]:text-primary transition-colors text-sm px-3"
          >
            Alle
            <span className="ml-1.5 text-xs opacity-60">{images.length}</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="image"
            aria-label="Bilder"
            className="border border-border data-[state=on]:bg-primary/15 data-[state=on]:border-primary/40 data-[state=on]:text-primary transition-colors text-sm px-3"
          >
            Bilder
            <span className="ml-1.5 text-xs opacity-60">{imageCount}</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="video"
            aria-label="Videos"
            className="border border-border data-[state=on]:bg-primary/15 data-[state=on]:border-primary/40 data-[state=on]:text-primary transition-colors text-sm px-3"
          >
            Videos
            <span className="ml-1.5 text-xs opacity-60">{videoCount}</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 p-3 sm:p-4 md:p-6 pt-2">
          {filtered.map((item, idx) => {
            const isVideo = item.mediaType.startsWith("video/");
            return (
              <div
                key={item.id}
                className="group relative rounded-lg overflow-hidden border border-border bg-card aspect-square"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  aria-label={isVideo ? "Video vergrößern" : "Bild vergrößern"}
                  className="absolute inset-0 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isVideo ? (
                    <>
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => {
                          const v = e.currentTarget;
                          v.muted = false;
                          v.volume = 1;
                          v.play().catch(() => {
                            // Browser autoplay policy may reject unmuted
                            // programmatic play — fall back to muted playback.
                            v.muted = true;
                            v.play().catch(() => {});
                          });
                        }}
                        onMouseLeave={(e) => {
                          const v = e.currentTarget;
                          v.pause();
                          v.currentTime = 0;
                          v.muted = true;
                        }}
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-sm">
                        <Film className="h-3 w-3" />
                        Video
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                        <div className="rounded-full bg-black/50 p-3">
                          <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.prompt}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
                <div className="absolute inset-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 via-transparent to-black/40 flex flex-col justify-between p-2.5 pointer-events-none">
                  <div className="flex justify-end gap-1.5 pointer-events-auto">
                    {!isVideo && (
                      <>
                        <Button
                          size="icon-xs"
                          variant="secondary"
                          onClick={() => onLoadIntoEdit(item)}
                          title="In Bearbeiten öffnen"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="secondary"
                          onClick={() => onLoadIntoVideo(item)}
                          title="Als Startframe für Video"
                        >
                          <Film className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon-xs"
                      variant="secondary"
                      onClick={() => handleCopyPrompt(item)}
                      title="Prompt kopieren"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="secondary"
                      onClick={() => onDownload(item)}
                      title="Herunterladen"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="destructive"
                      onClick={() => onRemove(item.id)}
                      title="Löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-white/80 line-clamp-2 pointer-events-auto">
                    {item.prompt}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog
        open={lightboxItem !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxIndex(null);
        }}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 border-border bg-card/95 backdrop-blur-sm sm:max-w-[95vw] flex flex-col">
          <DialogTitle className="sr-only">
            {lightboxItem?.prompt || "Medium"}
          </DialogTitle>
          {lightboxItem && (
            <>
              <div className="relative flex-1 min-h-0 flex items-center justify-center p-4">
                {lightboxItem.mediaType.startsWith("video/") ? (
                  <video
                    key={lightboxItem.id}
                    src={lightboxItem.url}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    controls
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    key={lightboxItem.id}
                    src={lightboxItem.url}
                    alt={lightboxItem.prompt}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                )}

                {filtered.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex((i) =>
                          i === null
                            ? null
                            : (i - 1 + filtered.length) % filtered.length
                        )
                      }
                      aria-label="Vorheriges"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 text-white p-2 transition-colors"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex((i) =>
                          i === null ? null : (i + 1) % filtered.length
                        )
                      }
                      aria-label="Nächstes"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 text-white p-2 transition-colors"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
              {lightboxItem.prompt && (
                <div className="shrink-0 px-6 pb-5 pt-1">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {lightboxItem.prompt}
                  </p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
