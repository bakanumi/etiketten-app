"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataImportPanel } from "@/components/data-import/DataImportPanel";
import { LabelSizePanel } from "@/components/design/LabelSizePanel";
import { DesignCanvas } from "@/components/design/DesignCanvas";
import { ElementInspector } from "@/components/design/ElementInspector";
import { PrintRoot } from "@/components/preview/PrintRoot";
import { PrintButton } from "@/components/toolbar/PrintButton";
import { PdfDownloadButton } from "@/components/toolbar/PdfDownloadButton";
import { parseInput } from "@/lib/parse/parseInput";
import {
  createQrElement,
  createTextElement,
  type ElementPatch,
  type LabelElement,
  type LabelTemplate,
  type ParsedData,
} from "@/lib/label/types";
import { sampleRow } from "@/lib/label/template";
import { loadState, saveState } from "@/lib/storage/localStorage";
import { Plus, QrCode, Type } from "lucide-react";

interface PersistedShape {
  template: LabelTemplate;
  rawInput: string;
  hasHeader: boolean;
}

const DEFAULT_TEMPLATE: LabelTemplate = {
  widthMm: 57,
  heightMm: 32,
  elements: [],
};

const ZOOM_OPTIONS = [2, 3, 4, 6, 8];

const DEFAULT_FORM: PersistedShape = {
  template: DEFAULT_TEMPLATE,
  rawInput: "",
  hasHeader: true,
};

export function EditorApp() {
  const [form, setForm] = useState<PersistedShape>(DEFAULT_FORM);
  const { template, rawInput, hasHeader } = form;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(4);
  const hydrated = useRef(false);

  useEffect(() => {
    // Einmaliges Hydrieren aus localStorage nach dem Mount (SSR hat kein window,
    // ein Lazy-Initializer würde daher einen Hydration-Mismatch verursachen).
    const persisted = loadState<PersistedShape>();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (persisted) setForm(persisted);
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
    (rawInput: string) => setForm((f) => ({ ...f, rawInput })),
    []
  );
  const setHasHeader = useCallback(
    (hasHeader: boolean) => setForm((f) => ({ ...f, hasHeader })),
    []
  );

  const data = useMemo<ParsedData>(() => parseInput(rawInput, hasHeader), [rawInput, hasHeader]);
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
    const el = createTextElement();
    setTemplate((t) => ({ ...t, elements: [...t.elements, el] }));
    setSelectedId(el.id);
  };

  const addQrElement = () => {
    const el = createQrElement({ template: data.columns[0] ? `{{${data.columns[0]}}}` : "" });
    setTemplate((t) => ({ ...t, elements: [...t.elements, el] }));
    setSelectedId(el.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setTemplate((t) => ({ ...t, elements: t.elements.filter((el) => el.id !== selectedId) }));
    setSelectedId(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 pb-16">
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

      <Tabs defaultValue="daten">
        <TabsList>
          <TabsTrigger value="daten">1. Daten</TabsTrigger>
          <TabsTrigger value="design">2. Design</TabsTrigger>
        </TabsList>

        <TabsContent value="daten">
          <Card className="p-4">
            <DataImportPanel
              rawInput={rawInput}
              hasHeader={hasHeader}
              data={data}
              onRawInputChange={setRawInput}
              onHasHeaderChange={setHasHeader}
            />
          </Card>
        </TabsContent>

        <TabsContent value="design">
          <div className="space-y-3">
            <Card className="flex flex-wrap items-end justify-between gap-3 p-4">
              <LabelSizePanel
                widthMm={template.widthMm}
                heightMm={template.heightMm}
                onChange={(patch) => setTemplate((t) => ({ ...t, ...patch }))}
              />
              <div className="space-y-1.5">
                <span className="text-sm text-muted-foreground">Zoom</span>
                <Select value={String(zoom)} onValueChange={(v) => v && setZoom(Number(v))}>
                  <SelectTrigger className="w-20">
                    <SelectValue>{(v: string) => `${v}×`}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ZOOM_OPTIONS.map((z) => (
                      <SelectItem key={z} value={String(z)}>
                        {z}×
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <Card className="min-w-0 flex-1 p-4">
                <div className="mb-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={addTextElement}>
                    <Type /> Text hinzufügen
                  </Button>
                  <Button variant="outline" size="sm" onClick={addQrElement}>
                    <QrCode /> QR-Code hinzufügen
                  </Button>
                </div>
                <div className="overflow-auto rounded-md border bg-muted/30 p-6">
                  <DesignCanvas
                    template={template}
                    row={previewRow}
                    zoom={zoom}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onChange={updateElement}
                  />
                </div>
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
                  onChange={(patch) => selectedId && updateElement(selectedId, patch)}
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
