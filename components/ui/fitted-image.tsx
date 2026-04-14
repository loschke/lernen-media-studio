"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FittedImageProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  children?: ReactNode;
}

/**
 * Displays an image at its natural aspect ratio, filling the maximum available
 * space within its parent (up to 100% width AND 100% height). Reads the image's
 * natural dimensions via onLoad and applies them as CSS aspect-ratio on the
 * wrapper, which lets the browser compute the optimal size with max-h/max-w
 * caps working correctly.
 *
 * Parent MUST have a definite height (e.g. `h-full` in a flex column with
 * `flex-1`) for `max-h-full` to function.
 *
 * Children are rendered as absolute overlays aligned to the image's bounds.
 */
export function FittedImage({
  src,
  alt,
  className,
  imgClassName,
  children,
}: FittedImageProps) {
  const [ratio, setRatio] = useState<number | undefined>();

  return (
    <div className="w-full h-full min-h-0 flex items-center justify-center">
      <div
        className={cn("relative group max-h-full max-w-full", className)}
        style={ratio ? { aspectRatio: String(ratio) } : undefined}
      >
        <img
          src={src}
          alt={alt}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalHeight > 0) {
              setRatio(img.naturalWidth / img.naturalHeight);
            }
          }}
          className={cn(
            "block w-full h-full object-contain",
            imgClassName
          )}
        />
        {children}
      </div>
    </div>
  );
}
