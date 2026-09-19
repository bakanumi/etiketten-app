"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FONT_OPTIONS } from "@/lib/label/fonts";
import type {
  ElementPatch,
  FontId,
  HorizontalAlign,
  LabelElement,
  QrErrorCorrection,
  VerticalAlign,
} from "@/lib/label/types";
import { ALL_COLUMNS_TOKEN, unknownPlaceholders } from "@/lib/label/template";
import { Trash2 } from "lucide-react";

/** Hängt einen Spalten-Platzhalter an: bei Text in eine neue Zeile, beim QR-Code direkt dahinter. */
function appendPlaceholder(element: LabelElement, column: string): string {
  const token = `{{${column}}}`;
  if (!element.template.trim()) return token;
  return element.type === "text" ? `${element.template}\n${token}` : `${element.template} ${token}`;
}

const H_ALIGN: { value: HorizontalAlign; label: string }[] = [
  { value: "left", label: "Links" },
  { value: "center", label: "Zentriert" },
  { value: "right", label: "Rechts" },
];

const V_ALIGN: { value: VerticalAlign; label: string }[] = [
  { value: "top", label: "Oben" },
  { value: "middle", label: "Mitte" },
  { value: "bottom", label: "Unten" },
];

const QR_EC_LABELS: Record<QrErrorCorrection, string> = {
  L: "Niedrig (L)",
  M: "Mittel (M)",
  Q: "Hoch (Q)",
  H: "Sehr hoch (H)",
};

const FONT_LABELS: Record<string, string> = Object.fromEntries(
  FONT_OPTIONS.map((f) => [f.id, f.label])
);

export function ElementInspector({
  element,
  columns,
  onChange,
  onDelete,
}: {
  element: LabelElement | null;
  columns: string[];
  onChange: (patch: ElementPatch) => void;
  onDelete: () => void;
}) {
  if (!element) {
    return (
      <div className="text-sm text-muted-foreground p-3">
        Kein Element ausgewählt. Klicke auf ein Element im Etikett oder füge eines hinzu.
      </div>
    );
  }

  const missing = unknownPlaceholders(element.template, columns);

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {element.type === "text" ? "Textelement" : "QR-Code"}
        </span>
        <Button variant="destructive" size="icon-sm" onClick={onDelete} aria-label="Element löschen">
          <Trash2 />
        </Button>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label>{element.type === "text" ? "Inhalt (mehrzeilig)" : "Inhalt / kodierter Wert"}</Label>
        {element.type === "text" ? (
          <Textarea
            rows={3}
            value={element.template}
            onChange={(e) => onChange({ template: e.target.value })}
          />
        ) : (
          <Input value={element.template} onChange={(e) => onChange({ template: e.target.value })} />
        )}
        {columns.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-muted-foreground">Werte einfügen:</p>
            <div className="flex flex-wrap gap-1">
              {element.type === "text" && (
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => onChange({ template: ALL_COLUMNS_TOKEN })}
                  title="Alle Werte der Zeile untereinander, je Wert eine Zeile"
                >
                  Alle Werte als Zeilen
                </Button>
              )}
              {columns.map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => onChange({ template: appendPlaceholder(element, c) })}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        )}
        {missing.length > 0 && (
          <p className="text-xs text-destructive">
            Keine passende Spalte für: {missing.map((m) => `{{${m}}}`).join(", ")} – bleibt auf dem
            Etikett leer.
          </p>
        )}
      </div>

      {element.type === "text" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Schriftart</Label>
              <Select
                value={element.fontFamily}
                onValueChange={(v) => v && onChange({ fontFamily: v as FontId })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => FONT_LABELS[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Schriftgröße (pt)</Label>
              <Input
                type="number"
                min={4}
                max={200}
                value={element.fontSizePt}
                onChange={(e) => onChange({ fontSizePt: Number(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="line-height">Zeilenabstand</Label>
              <Input
                id="line-height"
                type="number"
                min={0.8}
                max={3}
                step={0.05}
                value={element.lineHeight ?? 1.15}
                onChange={(e) => onChange({ lineHeight: Number(e.target.value) || 1.15 })}
              />
            </div>
            <div className="flex h-8 items-center gap-2">
              <Checkbox
                checked={element.bold ?? false}
                onCheckedChange={(c) => onChange({ bold: c === true })}
                id="bold"
              />
              <Label htmlFor="bold">Fett</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Ausrichtung horizontal</Label>
              <Select
                value={element.align}
                onValueChange={(v) => v && onChange({ align: v as HorizontalAlign })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) => H_ALIGN.find((a) => a.value === v)?.label ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {H_ALIGN.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ausrichtung vertikal</Label>
              <Select
                value={element.verticalAlign}
                onValueChange={(v) => v && onChange({ verticalAlign: v as VerticalAlign })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) => V_ALIGN.find((a) => a.value === v)?.label ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {V_ALIGN.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {element.type === "qr" && (
        <div className="space-y-1.5">
          <Label>Fehlerkorrektur</Label>
          <Select
            value={element.errorCorrectionLevel ?? "M"}
            onValueChange={(v) => v && onChange({ errorCorrectionLevel: v as QrErrorCorrection })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) => QR_EC_LABELS[v as QrErrorCorrection] ?? v}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L">Niedrig (L)</SelectItem>
              <SelectItem value="M">Mittel (M)</SelectItem>
              <SelectItem value="Q">Hoch (Q)</SelectItem>
              <SelectItem value="H">Sehr hoch (H)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>X (mm)</Label>
          <Input
            type="number"
            step={0.5}
            value={round(element.xMm)}
            onChange={(e) => onChange({ xMm: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Y (mm)</Label>
          <Input
            type="number"
            step={0.5}
            value={round(element.yMm)}
            onChange={(e) => onChange({ yMm: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Breite (mm)</Label>
          <Input
            type="number"
            step={0.5}
            min={2}
            value={round(element.widthMm)}
            onChange={(e) => onChange({ widthMm: Number(e.target.value) || 2 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Höhe (mm)</Label>
          <Input
            type="number"
            step={0.5}
            min={2}
            value={round(element.heightMm)}
            onChange={(e) => onChange({ heightMm: Number(e.target.value) || 2 })}
          />
        </div>
      </div>
    </div>
  );
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}
