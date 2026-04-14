"use client";

import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GalleryImage } from "@/hooks/useGallery";

interface GalleryItemProps {
  image: GalleryImage;
  onDownload: (image: GalleryImage) => void;
  onRemove: (id: string) => void;
  onSelect?: (image: GalleryImage) => void;
  selected?: boolean;
}

export function GalleryItem({
  image,
  onDownload,
  onRemove,
  onSelect,
  selected,
}: GalleryItemProps) {
  return (
    <div
      className={`group relative rounded-lg border overflow-hidden transition-all cursor-pointer ${
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-muted-foreground/30"
      }`}
      onClick={() => onSelect?.(image)}
    >
      <img
        src={`data:${image.mediaType};base64,${image.data}`}
        alt={image.prompt}
        className="w-full h-auto object-cover aspect-square"
      />
      <div className="p-2.5">
        <p
          className="text-xs line-clamp-2 text-muted-foreground"
          title={image.prompt}
        >
          {image.prompt}
        </p>
      </div>
      <div className="absolute inset-x-0 top-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/60 to-transparent flex justify-end gap-1.5">
        <Button
          size="icon-xs"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(image);
          }}
          title="Herunterladen"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon-xs"
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(image.id);
          }}
          title="Löschen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
