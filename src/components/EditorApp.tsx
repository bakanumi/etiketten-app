"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataImportPanel } from "@/components/data-import/DataImportPanel";
import { LabelSizePanel } from "@/components/design/LabelSizePanel";
import { DesignCanvas } from "@/components/design/DesignCanvas";
import { ElementInspector } from "@/components/design/ElementInspector";
import { TemplatePanel } from "@/components/templates/TemplatePanel";
import { PrintRoot } from "@/components/preview/PrintRoot";
import { PrintButton } from "@/components/toolbar/PrintButton";
import { PdfDownloadButton } from "@/components/toolbar/PdfDownloadButton";
import { DEFAULT_PARSE_OPTIONS, parseInput, type ParseOptions } from "@/lib/parse/parseInput";
import {
  createQrElement,
  createTextElement,
  type ElementPatch,
  type LabelElement,
  type LabelTemplate,
  type ParsedData,
} from "@/lib/label/types";
import { ALL_COLUMNS_TOKEN, sampleRow } from "@/lib/label/template";
import { LabelPage } from "@/components/preview/LabelRenderer";
import { loadState, saveState } from "@/lib/storage/localStorage";
import { Plus, QrCode, Type } from "lucide-react";

interface PersistedShape {
  template: LabelTemplate;
  rawInput: string;
  options: ParseOptions;
}

const DEFAULT_TEMPLATE: LabelTemplate = {
  widthMm: 57,
  heightMm: 32,
  elements: [],
};

const DEFAULT_FORM: PersistedShape = {
  template: DEFAULT_TEMPLATE,
  rawInput: "",
  options: DEFAULT_PARSE_OPTIONS,
};

const THUMBNAIL_LIMIT = 12;

/** Standard-Textblock: alle Werte einer Datenzeile untereinander, zentriert über das ganze Etikett. */
function withDefaultTextBlock(template: LabelTemplate): LabelTemplate {
  const block = createTextElement({
    xMm: 1,
    yMm: 1,
    widthMm: Math.max(2, template.widthMm - 2),
    heightMm: Math.max(2, template.heightMm - 2),
    template: ALL_COLUMNS_TOKEN,
    fontSizePt: 12,
    align: "center",
    verticalAlign: "middle",
  });
  return { ...template, elements: [...template.elements, block] };
}

/** Ältere gespeicherte Stände (nur `hasHeader`) auf das aktuelle Format heben. */
function normalizePersisted(
  persisted: Partial<PersistedShape> & { hasHeader?: boolean }
): PersistedShape {
  return {
    template: persisted.template ?? DEFAULT_TEMPLATE,
    rawInput: persisted.rawInput ?? "",
    options: {
      ...DEFAULT_PARSE_OPTIONS,
      ...(persisted.options ?? {}),
      ...(persisted.options ? {} : { hasHeader: persisted.hasHeader ?? false }),
    },
  };
}

export function EditorApp() {
  const [form, setForm] = useState<PersistedShape>(DEFAULT_FORM);
  const { template, rawInput, options } = form;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    // Einmaliges Hydrieren aus localStorage nach dem Mount (SSR hat kein window,
    // ein Lazy-Initializer würde daher einen Hydration-Mismatch verursachen).
    const persisted = loadState<Partial<PersistedShape>>();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (persisted) setForm(normalizePersisted(persisted));
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const timeout = setTimeout(() => {
      saveState<PersistedShape>(form);
    }, 300);
    return () => clearTimeout(timeout);
  }, [form]);

  const setTemplate = useCallback(
    (updater: (t: LabelTemplate) => LabelTemplate) =>
      setForm((f) => ({ ...f, template: updater(f.template) })),
    []
  );
  const setRawInput = useCallback(
    (value: string) =>
      setForm((f) => {
        // Erste Dateneingabe bei noch leerem Etikett: automatisch einen Textblock mit allen Werten anlegen,
        // damit die Daten sofort auf dem Etikett erscheinen (statt einer leeren Ausgabe).
        const firstData = f.rawInput.trim() === "" && value.trim() !== "";
        const template =
          firstData && f.template.elements.length === 0
            ? withDefaultTextBlock(f.template)
            : f.template;
        return { ...f, rawInput: value, template };
      }),
    []
  );
  const setOptions = useCallback(
    (patch: Partial<ParseOptions>) => setForm((f) => ({ ...f, options: { ...f.options, ...patch } })),
    []
  );

  const data = useMemo<ParsedData>(() => parseInput(rawInput, options), [rawInput, options]);
  const previewRow = data.rows[0] ?? sampleRow(data.columns);
  const selectedElement = template.elements.find((e) => e.id === selectedId) ?? null;

  const updateElement = useCallback(
    (id: string, patch: ElementPatch) => {
      setTemplate((t) => ({
        ...t,
        elements: t.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as LabelElement) : el)),
      }));
    },
    [setTemplate]
  );

  const addTextElement = () => {
    const el = createTextElement({
      template: data.columns.length > 0 ? ALL_COLUMNS_TOKEN : "Neuer Text",
    });
    setTemplate((t) => ({ ...t, elements: [...t.elements, el] }));
    setSelectedId(el.id);
  };

  const addQrElement = () => {
    const el = createQrElement({ template: data.columns[0] ? `{{${data.columns[0]}}}` : "" });
    setTemplate((t) => ({ ...t, elements: [...t.elements, el] }));
    setSelectedId(el.id);
  };

  /** Ebenenreihenfolge = Reihenfolge im Array (später = weiter vorne, in Vorschau, Druck und PDF gleich). */
  const moveSelectedLayer = (direction: "front" | "back") => {
    if (!selectedId) return;
    setTemplate((t) => {
      const i = t.elements.findIndex((el) => el.id === selectedId);
      const j = direction === "front" ? i + 1 : i - 1;
      if (i < 0 || j < 0 || j >= t.elements.length) return t;
      const elements = [...t.elements];
      [elements[i], elements[j]] = [elements[j], elements[i]];
      return { ...t, elements };
    });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setTemplate((t) => ({ ...t, elements: t.elements.filter((el) => el.id !== selectedId) }));
    setSelectedId(null);
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 p-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Etiketten-Generator</h1>
          <p className="text-sm text-muted-foreground">Für Zebra-Thermodrucker · monochrom</p>
        </div>
        <div className="flex gap-2">
          <PrintButton rowCount={data.rows.length || 1} />
          <PdfDownloadButton template={template} data={data} />
        </div>
      </header>

      <Card className="p-4">
        <TemplatePanel
          template={template}
          options={options}
          onApply={(nextTemplate, nextOptions) => {
            setForm((f) => ({ ...f, template: nextTemplate, options: nextOptions }));
            setSelectedId(null);
          }}
        />
      </Card>

      <Tabs defaultValue="daten">
        <TabsList>
          <TabsTrigger value="daten">1. Daten</TabsTrigger>
          <TabsTrigger value="design">2. Design</TabsTrigger>
        </TabsList>

        <TabsContent value="daten">
          <div className="space-y-3">
            <Card className="p-4">
              <DataImportPanel
                rawInput={rawInput}
                options={options}
                data={data}
                onRawInputChange={setRawInput}
                onOptionsChange={setOptions}
              />
            </Card>

            {data.rows.length > 0 && (
              <Card className="space-y-3 p-4">
                <h2 className="text-sm font-medium">
                  Vorschau der Etiketten ({data.rows.length})
                </h2>
                {template.elements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Das Etikett hat noch keine Elemente – im Tab „2. Design“ Text oder QR-Code
                    hinzufügen, damit die Daten erscheinen.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {data.rows.slice(0, THUMBNAIL_LIMIT).map((row, i) => (
                      <div key={i} className="rounded-sm shadow-[0_0_0_1px_var(--border)]">
                        <LabelPage template={template} row={row} />
                      </div>
                    ))}
                  </div>
                )}
                {data.rows.length > THUMBNAIL_LIMIT && (
                  <p className="text-xs text-muted-foreground">
                    … und {data.rows.length - THUMBNAIL_LIMIT} weitere
                  </p>
                )}
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="design">
          <div className="space-y-3">
            <Card className="flex flex-wrap items-end justify-between gap-3 p-4">
              <LabelSizePanel
                widthMm={template.widthMm}
                heightMm={template.heightMm}
                onChange={(patch) => setTemplate((t) => ({ ...t, ...patch }))}
              />
            </Card>

            <div className="flex flex-col gap-3 lg:flex-row">
              <Card className="min-w-0 p-4 lg:flex-1">
                <div className="mb-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={addTextElement}>
                    <Type /> Text hinzufügen
                  </Button>
                  <Button variant="outline" size="sm" onClick={addQrElement}>
                    <QrCode /> QR-Code hinzufügen
                  </Button>
                </div>
                <DesignCanvas
                  template={template}
                  row={previewRow}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onChange={updateElement}
                />
                {template.elements.length === 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <Plus className="inline size-3.5" /> Füge oben ein Textelement oder einen
                    QR-Code hinzu, um mit der Gestaltung zu beginnen.
                  </p>
                )}
              </Card>
              <Card className="w-full shrink-0 lg:w-80">
                <ElementInspector
                  element={selectedElement}
                  columns={data.columns}
                  labelWidthMm={template.widthMm}
                  labelHeightMm={template.heightMm}
                  onChange={(patch) => selectedId && updateElement(selectedId, patch)}
                  onMoveLayer={moveSelectedLayer}
                  onDelete={deleteSelected}
                />
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <PrintRoot template={template} data={data} />
    </div>
  );
}
