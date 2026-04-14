import { useState, useEffect, useCallback } from "react";
import {
  ALLOWED_MODEL_IDS,
  DEFAULT_MODEL,
  type ImageModelId,
} from "@/lib/models";

const MODEL_KEY = "media_studio_model";
const RATIO_KEY = "media_studio_aspect_ratio";
const DEFAULT_RATIO = "1:1";

export function useGenerateSettings() {
  const [model, setModelState] = useState<ImageModelId>(DEFAULT_MODEL);
  const [aspectRatio, setAspectRatioState] = useState<string>(DEFAULT_RATIO);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedModel = localStorage.getItem(MODEL_KEY);
    if (storedModel && ALLOWED_MODEL_IDS.has(storedModel)) {
      setModelState(storedModel as ImageModelId);
    }
    const storedRatio = localStorage.getItem(RATIO_KEY);
    if (storedRatio) {
      setAspectRatioState(storedRatio);
    }
    setIsLoaded(true);
  }, []);

  const setModel = useCallback((next: ImageModelId) => {
    setModelState(next);
    localStorage.setItem(MODEL_KEY, next);
  }, []);

  const setAspectRatio = useCallback((next: string) => {
    setAspectRatioState(next);
    localStorage.setItem(RATIO_KEY, next);
  }, []);

  return {
    model,
    aspectRatio,
    setModel,
    setAspectRatio,
    isLoaded,
  };
}
