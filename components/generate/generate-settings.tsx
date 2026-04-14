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
import { AspectRatioPicker } from "./aspect-ratio-picker";
import { IMAGE_MODELS, type ImageModel, type ImageModelId } from "@/lib/models";

interface GenerateSettingsProps {
  model: ImageModelId;
  aspectRatio: string;
  onModelChange: (value: ImageModelId) => void;
  onAspectRatioChange: (value: string) => void;
  /** Optional: Nur diese Modelle in der Auswahl zeigen. Default = alle. */
  availableModels?: readonly ImageModel[];
}

export function GenerateSettings({
  model,
  aspectRatio,
  onModelChange,
  onAspectRatioChange,
  availableModels = IMAGE_MODELS,
}: GenerateSettingsProps) {
  const currentModel = availableModels.find((m) => m.id === model);
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
          <span className="text-muted-foreground/70">· {aspectRatio}</span>
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
            onValueChange={(v) => onModelChange(v as ImageModelId)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-sm">{m.label}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {m.id}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-primary shrink-0 px-2 py-0.5 rounded-md bg-primary/10">
                      {m.cost} {m.cost === 1 ? "Credit" : "Credits"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <AspectRatioPicker
          value={aspectRatio}
          onChange={onAspectRatioChange}
        />
      </PopoverContent>
    </Popover>
  );
}
