import { useState, useEffect, useCallback } from 'react';

export interface GalleryImage {
  id: string;
  data: string; // base64
  mediaType: string;
  prompt: string;
  timestamp: number;
}

const GALLERY_KEY = 'media_studio_gallery';
const COUNT_KEY = 'media_studio_count';

/**
 * Persist gallery to localStorage. If quota is exceeded, drop the oldest
 * entries until it fits. Images are stored newest-first, so we pop from the
 * tail. Returns the (potentially trimmed) list that actually got saved.
 */
function persistGallery(images: GalleryImage[]): GalleryImage[] {
  let trimmed = images;
  while (trimmed.length > 0) {
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(trimmed));
      return trimmed;
    } catch (err) {
      if (err instanceof DOMException && trimmed.length > 1) {
        trimmed = trimmed.slice(0, -1);
        continue;
      }
      console.warn('Gallery persist failed, clearing storage', err);
      try {
        localStorage.removeItem(GALLERY_KEY);
      } catch {}
      return [];
    }
  }
  return [];
}

export function useGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [generationsLeft, setGenerationsLeft] = useState<number>(100);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(GALLERY_KEY);
    if (stored) {
      try {
        setImages(JSON.parse(stored));
      } catch {}
    }
    const count = localStorage.getItem(COUNT_KEY);
    if (count) {
      setGenerationsLeft(parseInt(count, 10));
    } else {
      const initialCount = 100;
      setGenerationsLeft(initialCount);
      localStorage.setItem(COUNT_KEY, initialCount.toString());
    }
    setIsLoaded(true);
  }, []);

  const addImage = useCallback(
    (image: Omit<GalleryImage, 'id' | 'timestamp'>) => {
      const newImage: GalleryImage = {
        ...image,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      setImages((prev) => {
        const updated = [newImage, ...prev];
        const persisted = persistGallery(updated);
        return persisted.length === updated.length ? updated : persisted;
      });
    },
    []
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem(GALLERY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  /**
   * Decrement the credit counter by `amount` (default 1). Credits are
   * charged per API call: generate = 1, edit = 2.
   */
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
    generationsLeft,
    isLoaded,
  };
}
