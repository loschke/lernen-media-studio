"use client";

import { ImageIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GalleryItem } from "./gallery-item";
import type { GalleryImage } from "@/hooks/useGallery";

interface GalleryPanelProps {
  images: GalleryImage[];
  onDownload: (image: GalleryImage) => void;
  onRemove: (id: string) => void;
  onSelect?: (image: GalleryImage) => void;
  selectedId?: string;
}

export function GalleryPanel({
  images,
  onDownload,
  onRemove,
  onSelect,
  selectedId,
}: GalleryPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-bold text-sm flex items-center gap-2 text-foreground">
          <ImageIcon className="h-4 w-4 text-primary" />
          Deine Galerie
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Bilder bleiben in der Session gespeichert
        </p>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-3">
          {images.length === 0 ? (
            <div className="text-center p-6 border border-border border-dashed rounded-lg text-muted-foreground text-sm">
              Noch keine Bilder generiert. Lege los!
            </div>
          ) : (
            images.map((img) => (
              <GalleryItem
                key={img.id}
                image={img}
                onDownload={onDownload}
                onRemove={onRemove}
                onSelect={onSelect}
                selected={selectedId === img.id}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
