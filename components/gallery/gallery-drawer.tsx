"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GalleryPanel } from "./gallery-panel";
import type { GalleryImage } from "@/hooks/useGallery";

interface GalleryDrawerProps {
  images: GalleryImage[];
  onDownload: (image: GalleryImage) => void;
  onRemove: (id: string) => void;
}

export function GalleryDrawer({
  images,
  onDownload,
  onRemove,
}: GalleryDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className="fixed bottom-4 right-4 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-colors"
        >
          <ImageIcon className="h-5 w-5" />
          {images.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {images.length}
            </Badge>
          )}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Galerie</SheetTitle>
          </SheetHeader>
          <GalleryPanel
            images={images}
            onDownload={onDownload}
            onRemove={onRemove}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
