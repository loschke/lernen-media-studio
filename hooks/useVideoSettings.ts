import { useState, useEffect, useCallback } from "react";
import {
  ALLOWED_VIDEO_MODEL_IDS,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_VIDEO_ASPECT_RATIO,
  DEFAULT_VIDEO_DURATION,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  type VideoModelId,
  type VideoAspectRatio,
  type VideoDuration,
} from "@/lib/models";

const MODEL_KEY = "media_studio_video_model";
const RATIO_KEY = "media_studio_video_aspect_ratio";
const DURATION_KEY = "media_studio_video_duration";

export function useVideoSettings() {
  const [model, setModelState] = useState<VideoModelId>(DEFAULT_VIDEO_MODEL);
  const [aspectRatio, setAspectRatioState] = useState<VideoAspectRatio>(
    DEFAULT_VIDEO_ASPECT_RATIO
  );
  const [duration, setDurationState] = useState<VideoDuration>(
    DEFAULT_VIDEO_DURATION
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedModel = localStorage.getItem(MODEL_KEY);
    if (storedModel && ALLOWED_VIDEO_MODEL_IDS.has(storedModel)) {
      setModelState(storedModel as VideoModelId);
    }
    const storedRatio = localStorage.getItem(RATIO_KEY);
    if (
      storedRatio &&
      (VIDEO_ASPECT_RATIOS as readonly string[]).includes(storedRatio)
    ) {
      setAspectRatioState(storedRatio as VideoAspectRatio);
    }
    const storedDuration = localStorage.getItem(DURATION_KEY);
    if (storedDuration) {
      const n = parseInt(storedDuration, 10);
      if ((VIDEO_DURATIONS as readonly number[]).includes(n)) {
        setDurationState(n as VideoDuration);
      }
    }
    setIsLoaded(true);
  }, []);

  const setModel = useCallback((next: VideoModelId) => {
    setModelState(next);
    localStorage.setItem(MODEL_KEY, next);
  }, []);
  const setAspectRatio = useCallback((next: VideoAspectRatio) => {
    setAspectRatioState(next);
    localStorage.setItem(RATIO_KEY, next);
  }, []);
  const setDuration = useCallback((next: VideoDuration) => {
    setDurationState(next);
    localStorage.setItem(DURATION_KEY, next.toString());
  }, []);

  return {
    model,
    aspectRatio,
    duration,
    setModel,
    setAspectRatio,
    setDuration,
    isLoaded,
  };
}
