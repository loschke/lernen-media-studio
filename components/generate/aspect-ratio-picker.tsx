"use client";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const RATIOS = ["1:1", "3:2", "2:3", "16:9", "9:16", "4:3", "3:4"];

interface AspectRatioPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function AspectRatioPicker({ value, onChange }: AspectRatioPickerProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-muted-foreground">
        Seitenverhältnis
      </Label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v)}
        className="justify-start gap-1.5 flex-wrap"
      >
        {RATIOS.map((r) => (
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
  );
}
