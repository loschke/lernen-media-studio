"use client";

import { ImageIcon, Download, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GalleryImage } from "@/hooks/useGallery";

interface GalleryViewProps {
  images: GalleryImage[];
  onDownload: (image: GalleryImage) => void;
  onRemove: (id: string) => void;
  onLoadIntoEdit: (image: GalleryImage) => void;
}

export function GalleryView({
  images,
  onDownload,
  onRemove,
  onLoadIntoEdit,
}: GalleryViewProps) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4 p-6">
        <div className="rounded-full bg-muted p-5">
          <ImageIcon className="h-10 w-10 opacity-40" />
        </div>
        <div>
          <p className="text-base font-medium text-foreground/70">Noch keine Bilder</p>
          <p className="text-sm mt-1">Generierte Bilder erscheinen hier.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4 md:p-6">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative rounded-lg overflow-hidden border border-border bg-card aspect-square"
          >
            <img
              src={`data:${img.mediaType};base64,${img.data}`}
              alt={img.prompt}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 via-transparent to-black/40 flex flex-col justify-between p-2.5">
              <div className="flex justify-end gap-1.5">
                <Button
                  size="icon-xs"
                  variant="secondary"
                  onClick={() => onLoadIntoEdit(img)}
                  title="In Bearbeiten öffnen"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-xs"
                  variant="secondary"
                  onClick={() => onDownload(img)}
                  title="Herunterladen"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-xs"
                  variant="destructive"
                  onClick={() => onRemove(img.id)}
                  title="Löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-white/80 line-clamp-2">{img.prompt}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
