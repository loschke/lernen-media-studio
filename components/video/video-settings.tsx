"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  VIDEO_MODELS,
  VIDEO_ASPECT_RATIOS,
  VIDEO_DURATIONS,
  type VideoModelId,
  type VideoAspectRatio,
  type VideoDuration,
} from "@/lib/models";

interface VideoSettingsProps {
  model: VideoModelId;
  aspectRatio: VideoAspectRatio;
  duration: VideoDuration;
  onModelChange: (value: VideoModelId) => void;
  onAspectRatioChange: (value: VideoAspectRatio) => void;
  onDurationChange: (value: VideoDuration) => void;
}

export function VideoSettings({
  model,
  aspectRatio,
  duration,
  onModelChange,
  onAspectRatioChange,
  onDurationChange,
}: VideoSettingsProps) {
  const currentModel = VIDEO_MODELS.find((m) => m.id === model);
  const modelLabel = currentModel?.label ?? "Modell";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          title="Einstellungen"
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="text-foreground/80">{modelLabel}</span>
          <span className="text-muted-foreground/70">· {aspectRatio} · {duration}s</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-80 space-y-4"
      >
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">
            Modell
          </Label>
          <Select
            value={model}
            onValueChange={(v) => onModelChange(v as VideoModelId)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-sm">{m.label}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {m.supportsEndFrame ? "Start + Endframe" : "Nur Startframe"}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-primary shrink-0 px-2 py-0.5 rounded-md bg-primary/10">
                      {m.cost} Credits
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">
            Seitenverhältnis
          </Label>
          <ToggleGroup
            type="single"
            value={aspectRatio}
            onValueChange={(v) => v && onAspectRatioChange(v as VideoAspectRatio)}
            className="justify-start gap-1.5"
          >
            {VIDEO_ASPECT_RATIOS.map((r) => (
              <ToggleGroupItem
                key={r}
                value={r}
                aria-label={r}
                className="border border-border data-[state=on]:bg-primary/15 data-[state=on]:border-primary/40 data-[state=on]:text-primary transition-colors text-sm px-3"
              >
                {r}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">
            Dauer
          </Label>
          <ToggleGroup
            type="single"
            value={String(duration)}
            onValueChange={(v) => {
              if (!v) return;
              const n = parseInt(v, 10) as VideoDuration;
              onDurationChange(n);
            }}
            className="justify-start gap-1.5"
          >
            {VIDEO_DURATIONS.map((d) => (
              <ToggleGroupItem
                key={d}
                value={String(d)}
                aria-label={`${d}s`}
                className="border border-border data-[state=on]:bg-primary/15 data-[state=on]:border-primary/40 data-[state=on]:text-primary transition-colors text-sm px-3"
              >
                {d}s
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </PopoverContent>
    </Popover>
  );
}
