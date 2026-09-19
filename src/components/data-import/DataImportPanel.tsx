"use client";

import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ParsedData } from "@/lib/label/types";
import { Upload } from "lucide-react";

export function DataImportPanel({
  rawInput,
  hasHeader,
  data,
  onRawInputChange,
  onHasHeaderChange,
}: {
  rawInput: string;
  hasHeader: boolean;
  data: ParsedData;
  onRawInputChange: (value: string) => void;
  onHasHeaderChange: (value: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="raw-input">CSV oder Textliste einfügen</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="has-header"
              checked={hasHeader}
              onCheckedChange={(c) => onHasHeaderChange(c === true)}
            />
            <Label htmlFor="has-header">Erste Zeile ist Überschrift</Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload /> Datei laden
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              onRawInputChange(text);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <Textarea
        id="raw-input"
        rows={8}
        placeholder={"Name,Artikelnummer\nBeispiel GmbH,ART-001\nAndere Firma,ART-002\n\noder einfach eine Zeile pro Etikett"}
        value={rawInput}
        onChange={(e) => onRawInputChange(e.target.value)}
        className="font-mono text-xs"
      />
      <p className="text-sm text-muted-foreground">
        {data.rows.length === 0
          ? "Noch keine Daten erkannt."
          : `${data.rows.length} Zeile${data.rows.length === 1 ? "" : "n"} erkannt, ${
              data.columns.length
            } Spalte${data.columns.length === 1 ? "" : "n"}: ${data.columns.join(", ")}`}
      </p>
    </div>
  );
}
