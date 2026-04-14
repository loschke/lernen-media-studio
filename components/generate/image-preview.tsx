"use client";

import { Download, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FittedImage } from "@/components/ui/fitted-image";
import type { GalleryImage } from "@/hooks/useGallery";

interface ImagePreviewProps {
  image: GalleryImage;
  onDownload: (image: GalleryImage) => void;
  onLoadIntoEdit: (image: GalleryImage) => void;
}

export function ImagePreview({
  image,
  onDownload,
  onLoadIntoEdit,
}: ImagePreviewProps) {
  return (
    <FittedImage
      src={image.url}
      alt={image.prompt}
      className="animate-in fade-in zoom-in duration-500 rounded-xl overflow-hidden border border-border bg-muted/30"
    >
      <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end gap-3">
        <p className="text-sm text-white/90 line-clamp-2 flex-1">
          {image.prompt}
        </p>
        <div className="flex gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onLoadIntoEdit(image)}
            title="In Bearbeiten öffnen"
          >
            <Edit3 className="h-4 w-4 mr-1.5" />
            Bearbeiten
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            onClick={() => onDownload(image)}
            title="Herunterladen"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </FittedImage>
  );
}
