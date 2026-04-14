import { useState, useEffect, useCallback } from "react";

export interface GalleryImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  mediaType: string;
}

const COUNT_KEY = "media_studio_count";

export function useGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [generationsLeft, setGenerationsLeft] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Initial load: credits from localStorage, gallery from API. If no local
  // count yet, fetch the server-configured default from /api/config
  // (reads DEFAULT_CREDITS env).
  useEffect(() => {
    const count = localStorage.getItem(COUNT_KEY);
    if (count) {
      setGenerationsLeft(parseInt(count, 10));
      fetchGallery().finally(() => setIsLoaded(true));
      return;
    }

    (async () => {
      let initialCount = 100;
      try {
        const res = await fetch("/api/config", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { defaultCredits?: number };
          if (typeof data.defaultCredits === "number" && data.defaultCredits > 0) {
            initialCount = data.defaultCredits;
          }
        }
      } catch {
        // Fall back to 100 if the config endpoint is unreachable.
      }
      setGenerationsLeft(initialCount);
      try {
        localStorage.setItem(COUNT_KEY, initialCount.toString());
      } catch {}
      fetchGallery().finally(() => setIsLoaded(true));
    })();
  }, []);

  const fetchGallery = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/gallery/list", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { images: GalleryImage[] };
        setImages(data.images || []);
      }
    } catch (err) {
      console.warn("Gallery fetch failed", err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  /**
   * Optimistically prepend a freshly-uploaded image (returned from
   * /api/generate or /api/edit) to the local state. The image is already
   * persisted in R2 by the API.
   */
  const addImage = useCallback((image: GalleryImage) => {
    setImages((prev) => {
      // Avoid duplicates if a refetch already added it.
      if (prev.some((p) => p.id === image.id)) return prev;
      return [image, ...prev];
    });
  }, []);

  const removeImage = useCallback(async (id: string) => {
    // Optimistic UI: remove first, then call server.
    setImages((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch("/api/gallery/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.warn("Gallery delete failed", err);
      // Refetch to restore truth on error.
      fetchGallery();
    }
  }, [fetchGallery]);

  const decrementCount = useCallback((amount: number = 1) => {
    setGenerationsLeft((p) => {
      const n = Math.max(0, p - amount);
      try {
        localStorage.setItem(COUNT_KEY, n.toString());
      } catch {}
      return n;
    });
  }, []);

  return {
    images,
    addImage,
    removeImage,
    decrementCount,
    refetchGallery: fetchGallery,
    generationsLeft,
    isLoaded,
    isFetching,
  };
}
