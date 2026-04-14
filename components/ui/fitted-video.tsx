"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FittedVideoProps {
  src: string;
  className?: string;
  videoClassName?: string;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
  muted?: boolean;
  children?: ReactNode;
}

/**
 * Displays a video at its natural aspect ratio, filling the available space
 * within a flex parent with definite height (mirrors FittedImage semantics).
 */
export function FittedVideo({
  src,
  className,
  videoClassName,
  autoPlay = false,
  loop = true,
  controls = true,
  muted = true,
  children,
}: FittedVideoProps) {
  const [ratio, setRatio] = useState<number | undefined>();

  return (
    <div className="w-full h-full min-h-0 flex items-center justify-center">
      <div
        className={cn("relative group max-h-full max-w-full", className)}
        style={ratio ? { aspectRatio: String(ratio) } : undefined}
      >
        <video
          src={src}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoHeight > 0) {
              setRatio(v.videoWidth / v.videoHeight);
            }
          }}
          autoPlay={autoPlay}
          loop={loop}
          controls={controls}
          muted={muted}
          playsInline
          className={cn("block w-full h-full object-contain", videoClassName)}
        />
        {children}
      </div>
    </div>
  );
}
