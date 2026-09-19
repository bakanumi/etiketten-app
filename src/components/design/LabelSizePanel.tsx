"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LABEL_SIZE_PRESETS } from "@/lib/label/presets";

export function LabelSizePanel({
  widthMm,
  heightMm,
  onChange,
}: {
  widthMm: number;
  heightMm: number;
  onChange: (patch: { widthMm?: number; heightMm?: number }) => void;
}) {
  const matchingPreset = LABEL_SIZE_PRESETS.find(
    (p) => p.widthMm === widthMm && p.heightMm === heightMm
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label>Vorlage</Label>
        <Select
          value={matchingPreset?.label ?? "custom"}
          onValueChange={(v) => {
            const preset = LABEL_SIZE_PRESETS.find((p) => p.label === v);
            if (preset) onChange({ widthMm: preset.widthMm, heightMm: preset.heightMm });
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue>{(v: string) => (v === "custom" ? "Benutzerdefiniert" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LABEL_SIZE_PRESETS.map((p) => (
              <SelectItem key={p.label} value={p.label}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Benutzerdefiniert</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Breite (mm)</Label>
        <Input
          type="number"
          min={5}
          max={500}
          step={0.5}
          className="w-24"
          value={widthMm}
          onChange={(e) => onChange({ widthMm: Number(e.target.value) || 5 })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Höhe (mm)</Label>
        <Input
          type="number"
          min={5}
          max={500}
          step={0.5}
          className="w-24"
          value={heightMm}
          onChange={(e) => onChange({ heightMm: Number(e.target.value) || 5 })}
        />
      </div>
    </div>
  );
}
