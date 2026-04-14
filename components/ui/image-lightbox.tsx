"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FittedImage } from "@/components/ui/fitted-image";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  triggerClassName?: string;
  children: ReactNode;
}

/**
 * Wraps a trigger element so that clicking it opens a fullscreen lightbox
 * showing the image at maximum viewport size, preserving aspect ratio.
 */
export function ImageLightbox({
  src,
  alt,
  triggerClassName,
  children,
}: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "block cursor-zoom-in transition-transform hover:scale-[1.03]",
          triggerClassName
        )}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 border-border bg-card/95 backdrop-blur-sm flex items-center justify-center sm:max-w-[95vw]">

          <DialogTitle className="sr-only">{alt || "Bild"}</DialogTitle>
          <div className="w-full h-full p-4">
            <FittedImage
              src={src}
              alt={alt}
              className="rounded-lg overflow-hidden"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
