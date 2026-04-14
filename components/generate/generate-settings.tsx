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
import { IMAGE_MODELS, type ImageModelId } from "@/lib/models";

interface GenerateSettingsProps {
  model: ImageModelId;
  aspectRatio: string;
  onModelChange: (value: ImageModelId) => void;
  onAspectRatioChange: (value: string) => void;
  /** Optional: Nur diese Modelle in der Auswahl zeigen. Default = alle. */
  availableModels?: readonly { id: ImageModelId; label: string }[];
}

export function GenerateSettings({
  model,
  aspectRatio,
  onModelChange,
  onAspectRatioChange,
  availableModels = IMAGE_MODELS,
}: GenerateSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-[52px] w-[52px] shrink-0 text-muted-foreground hover:text-foreground"
          title="Einstellungen"
        >
          <Settings className="h-5 w-5" />
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
                  <div className="flex flex-col items-start">
                    <span className="text-sm">{m.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.id}
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
