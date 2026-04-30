import { useState, useEffect, useCallback } from "react";

export interface GalleryImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  mediaType: string;
}

export function useGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [credits, setCreditsState] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

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

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/credits", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { credits?: number };
        if (typeof data.credits === "number") {
          setCreditsState(data.credits);
        }
      }
    } catch (err) {
      console.warn("Credits fetch failed", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchCredits(), fetchGallery()]).finally(() =>
      setIsLoaded(true)
    );
  }, [fetchCredits, fetchGallery]);

  /**
   * Presigned R2 URLs expire after 8h. When the tab regains focus or
   * visibility, refresh the gallery so stale URLs get replaced before the
   * user notices broken thumbnails.
   */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchGallery();
    };
    const onFocus = () => fetchGallery();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchGallery]);

  /**
   * Optimistically prepend a freshly-uploaded image (returned from
   * /api/generate or /api/edit) to the local state. The image is already
   * persisted in R2 by the API.
   */
  const addImage = useCallback((image: GalleryImage) => {
    setImages((prev) => {
      if (prev.some((p) => p.id === image.id)) return prev;
      return [image, ...prev];
    });
  }, []);

  const removeImage = useCallback(async (id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch("/api/gallery/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.warn("Gallery delete failed", err);
      fetchGallery();
    }
  }, [fetchGallery]);

  /**
   * Server-side Credits sind die Source of Truth. Routes liefern den neuen
   * Stand im Response-Feld `credits` mit; UI übernimmt diesen Wert
   * unverändert. Kein optimistic local decrement.
   */
  const setCredits = useCallback((value: number) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      setCreditsState(Math.max(0, value));
    }
  }, []);

  return {
    images,
    addImage,
    removeImage,
    setCredits,
    refetchCredits: fetchCredits,
    refetchGallery: fetchGallery,
    credits,
    isLoaded,
    isFetching,
  };
}
