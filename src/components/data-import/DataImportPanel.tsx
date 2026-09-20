"use client";

import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ParsedData } from "@/lib/label/types";
import type { DelimiterSetting, LabelMode, ParseOptions } from "@/lib/parse/parseInput";
import { Upload } from "lucide-react";

const MODE_LABELS: Record<LabelMode, string> = {
  perRow: "Jede Zeile = ein Etikett",
  single: "Alles auf einem Etikett",
};

const DELIMITER_LABELS: Record<DelimiterSetting, string> = {
  auto: "Automatisch erkennen",
  ",": "Komma ( , )",
  ";": "Semikolon ( ; )",
  "\t": "Tabulator",
  none: "Keins (ganze Zeile)",
};

const PREVIEW_ROWS = 6;

export function DataImportPanel({
  rawInput,
  options,
  data,
  onRawInputChange,
  onOptionsChange,
}: {
  rawInput: string;
  options: ParseOptions;
  data: ParsedData;
  onRawInputChange: (value: string) => void;
  onOptionsChange: (patch: Partial<ParseOptions>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const single = options.mode === "single";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Etiketten erzeugen</Label>
          <Select
            value={options.mode}
            onValueChange={(v) => v && onOptionsChange({ mode: v as LabelMode })}
          >
            <SelectTrigger className="w-56">
              <SelectValue>{(v: string) => MODE_LABELS[v as LabelMode] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MODE_LABELS) as LabelMode[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {MODE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Werte in einer Zeile trennen mit</Label>
          <Select
            value={options.delimiter}
            onValueChange={(v) => v && onOptionsChange({ delimiter: v as DelimiterSetting })}
          >
            <SelectTrigger className="w-56">
              <SelectValue>
                {(v: string) => DELIMITER_LABELS[v as DelimiterSetting] ?? v}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DELIMITER_LABELS) as DelimiterSetting[]).map((d) => (
                <SelectItem key={d} value={d}>
                  {DELIMITER_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex h-8 items-center gap-2">
          <Checkbox
            id="has-header"
            checked={options.hasHeader && !single}
            disabled={single}
            onCheckedChange={(c) => onOptionsChange({ hasHeader: c === true })}
          />
          <Label htmlFor="has-header">Erste Zeile ist Überschrift</Label>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
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

      <div className="space-y-1.5">
        <Label htmlFor="raw-input">CSV oder Textliste einfügen</Label>
        <Textarea
          id="raw-input"
          rows={8}
          placeholder={
            "Filament PLA schwarz, Regal A1\nHarz grau, Regal B3\n\nJede Zeile ergibt ein Etikett, die Werte einer Zeile (mit Komma getrennt) erscheinen als eigene Zeilen auf dem Etikett."
          }
          value={rawInput}
          onChange={(e) => onRawInputChange(e.target.value)}
          className="font-mono text-[12px]" /* Textliste bewusst unverändert klein, unabhängig von der Oberflächengröße */
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {data.rows.length === 0
          ? "Noch keine Daten erkannt."
          : `${data.rows.length} Etikett${data.rows.length === 1 ? "" : "en"}, ${
              data.columns.length
            } Wert${data.columns.length === 1 ? "" : "e"} pro Etikett: ${data.columns.join(", ")}`}
      </p>

      {data.rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 py-1.5 font-medium text-muted-foreground">Etikett</th>
                {data.columns.map((c) => (
                  <th key={c} className="px-2 py-1.5 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                  {data.columns.map((c) => (
                    <td key={c} className="px-2 py-1">
                      {row[c]}
                    </td>
                  ))}
                </tr>
              ))}
              {data.rows.length > PREVIEW_ROWS && (
                <tr className="border-t">
                  <td
                    colSpan={data.columns.length + 1}
                    className="px-2 py-1 text-muted-foreground"
                  >
                    … und {data.rows.length - PREVIEW_ROWS} weitere
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
