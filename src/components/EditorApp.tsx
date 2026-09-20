"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  GESTURE_PREFIX,
  createEditorState,
  editorReducer,
  nudgeElement,
  type PersistedShape,
} from "@/lib/editor/state";
import { LogOut, Plus, QrCode, Redo2, Type, Undo2 } from "lucide-react";

/** Pfeiltasten-Schrittweite in mm (mit Shift größer). */
const NUDGE_MM = 0.5;
const NUDGE_SHIFT_MM = 2;

/** In Eingabefeldern und Auswahllisten behalten Strg+Z und Pfeiltasten ihre normale Bedeutung. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.closest(
      "input, textarea, select, [role=combobox], [role=listbox], [role=option], [role=tab], [role=slider]"
    ) !== null
  );
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

/** Kleine Toleranz, damit Rundungen (z. B. 22.00001 mm) nicht als "außerhalb" gelten. */
const OUTSIDE_TOLERANCE_MM = 0.05;

function isOutsideLabel(el: LabelElement, t: LabelTemplate): boolean {
  return (
    el.xMm < -OUTSIDE_TOLERANCE_MM ||
    el.yMm < -OUTSIDE_TOLERANCE_MM ||
    el.xMm + el.widthMm > t.widthMm + OUTSIDE_TOLERANCE_MM ||
    el.yMm + el.heightMm > t.heightMm + OUTSIDE_TOLERANCE_MM
  );
}

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

export function EditorApp({ showLogout = false }: { showLogout?: boolean }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(editorReducer, DEFAULT_FORM, createEditorState);
  const { form } = state;
  const { template, rawInput, options } = form;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("daten");
  const hydrated = useRef(false);

  useEffect(() => {
    // Einmaliges Hydrieren aus localStorage nach dem Mount (SSR hat kein window,
    // ein Lazy-Initializer würde daher einen Hydration-Mismatch verursachen).
    const persisted = loadState<Partial<PersistedShape>>();
    if (persisted) dispatch({ type: "hydrate", form: normalizePersisted(persisted) });
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const timeout = setTimeout(() => {
      saveState<PersistedShape>(form);
    }, 300);
    return () => clearTimeout(timeout);
  }, [form]);

  /**
   * Zentrale Änderung am Editor-Zustand. Ändert sich dabei das Design, entsteht ein Schritt im
   * Rückgängig-Verlauf; gleiche `key`-Werte kurz hintereinander (Tippen, Pfeiltasten) werden zusammengefasst.
   */
  const update = useCallback(
    (updater: (f: PersistedShape) => PersistedShape, key?: string) =>
      dispatch({ type: "update", updater, key, at: Date.now() }),
    []
  );
  const setTemplate = useCallback(
    (updater: (t: LabelTemplate) => LabelTemplate, key?: string) =>
      update((f) => {
        const next = updater(f.template);
        return next === f.template ? f : { ...f, template: next };
      }, key),
    [update]
  );
  const setRawInput = useCallback(
    (value: string) =>
      update((f) => {
        // Erste Dateneingabe bei noch leerem Etikett: automatisch einen Textblock mit allen Werten anlegen,
        // damit die Daten sofort auf dem Etikett erscheinen (statt einer leeren Ausgabe).
        const firstData = f.rawInput.trim() === "" && value.trim() !== "";
        const template =
          firstData && f.template.elements.length === 0
            ? withDefaultTextBlock(f.template)
            : f.template;
        return { ...f, rawInput: value, template };
      }),
    [update]
  );
  const setOptions = useCallback(
    (patch: Partial<ParseOptions>) =>
      update((f) => ({ ...f, options: { ...f.options, ...patch } })),
    [update]
  );

  const data = useMemo<ParsedData>(() => parseInput(rawInput, options), [rawInput, options]);
  const previewRow = data.rows[0] ?? sampleRow(data.columns);
  const selectedElement = template.elements.find((e) => e.id === selectedId) ?? null;

  const updateElement = useCallback(
    (id: string, patch: ElementPatch, key?: string) => {
      setTemplate(
        (t) => ({
          ...t,
          elements: t.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as LabelElement) : el)),
        }),
        // Gleiche Felder desselben Elements kurz hintereinander (z. B. Tippen) = ein Rückgängig-Schritt.
        key ?? `el:${id}:${Object.keys(patch).sort().join(",")}`
      );
    },
    [setTemplate]
  );

  /** Beginn einer Maus-Geste (Ziehen/Skalieren): ab jetzt ein eigener Rückgängig-Schritt. */
  const handleGestureStart = useCallback(() => {
    dispatch({ type: "breakCoalesce" });
    // Die Maus-Geste verhindert den Fokuswechsel; sonst bliebe der Fokus in einem Eingabefeld des
    // Inspectors und die Pfeiltasten würden dort statt am Element wirken.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, []);

  // Tastatur im Design-Tab: Strg+Z / Strg+Y (bzw. Strg+Umschalt+Z) und Pfeiltasten für das gewählte Element.
  useEffect(() => {
    if (tab !== "design") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.altKey && (key === "z" || key === "y")) {
        e.preventDefault();
        dispatch({ type: key === "y" || e.shiftKey ? "redo" : "undo" });
        return;
      }

      if (mod || e.altKey || !selectedId) return;
      const step = e.shiftKey ? NUDGE_SHIFT_MM : NUDGE_MM;
      const deltas: Partial<Record<string, [number, number]>> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = deltas[e.key];
      if (!delta) return;

      e.preventDefault(); // Seite soll dabei nicht scrollen
      update((f) => {
        const next = nudgeElement(f.template, selectedId, delta[0], delta[1]);
        return next === f.template ? f : { ...f, template: next };
      }, `nudge:${selectedId}`);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tab, selectedId, update]);

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

  /** Elemente, die (teilweise) über den Rand des Etiketts hinausragen, z. B. nach dem Verkleinern des Etiketts. */
  const outsideCount = template.elements.filter((el) => isOutsideLabel(el, template)).length;

  const pullElementsInside = () => {
    setTemplate((t) => ({
      ...t,
      elements: t.elements.map((el) => {
        const widthMm = Math.min(el.widthMm, t.widthMm);
        const heightMm = Math.min(el.heightMm, t.heightMm);
        return {
          ...el,
          widthMm,
          heightMm,
          xMm: Math.min(Math.max(el.xMm, 0), t.widthMm - widthMm),
          yMm: Math.min(Math.max(el.yMm, 0), t.heightMm - heightMm),
        };
      }),
    }));
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
          {showLogout && (
            <Button
              variant="ghost"
              onClick={async () => {
                await fetch("/api/login", { method: "DELETE" });
                router.replace("/login");
              }}
            >
              <LogOut /> Abmelden
            </Button>
          )}
        </div>
      </header>

      <Card className="p-4">
        <TemplatePanel
          template={template}
          options={options}
          onApply={(nextTemplate, nextOptions) => {
            // Als eigener Schritt im Verlauf: das Laden einer Vorlage lässt sich mit Strg+Z zurücknehmen.
            update((f) => ({ ...f, template: nextTemplate, options: nextOptions }));
            setSelectedId(null);
          }}
        />
      </Card>

      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
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
                onChange={(patch) => setTemplate((t) => ({ ...t, ...patch }), "size")}
              />
              {outsideCount > 0 && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-amber-400">
                  <span>
                    {outsideCount === 1
                      ? "1 Element ragt über den Rand des Etiketts hinaus."
                      : `${outsideCount} Elemente ragen über den Rand des Etiketts hinaus.`}
                  </span>
                  <Button variant="outline" size="sm" onClick={pullElementsInside}>
                    Ins Etikett zurückholen
                  </Button>
                </div>
              )}
            </Card>

            <div className="flex flex-col gap-3 lg:flex-row">
              <Card className="min-w-0 p-4 lg:flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={addTextElement}>
                    <Type /> Text hinzufügen
                  </Button>
                  <Button variant="outline" size="sm" onClick={addQrElement}>
                    <QrCode /> QR-Code hinzufügen
                  </Button>
                  <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    title="Rückgängig (Strg+Z)"
                    aria-label="Rückgängig"
                    disabled={state.past.length === 0}
                    onClick={() => dispatch({ type: "undo" })}
                  >
                    <Undo2 />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    title="Wiederholen (Strg+Y)"
                    aria-label="Wiederholen"
                    disabled={state.future.length === 0}
                    onClick={() => dispatch({ type: "redo" })}
                  >
                    <Redo2 />
                  </Button>
                </div>
                <DesignCanvas
                  template={template}
                  row={previewRow}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onGestureStart={handleGestureStart}
                  onChange={(id, patch) => updateElement(id, patch, `${GESTURE_PREFIX}${id}`)}
                />
                {template.elements.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <Plus className="inline size-3.5" /> Füge oben ein Textelement oder einen
                    QR-Code hinzu, um mit der Gestaltung zu beginnen.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Tipp: Element anklicken und mit den Pfeiltasten verschieben (Umschalt = 2 mm statt
                    0,5 mm). Strg+Z macht die letzte Änderung rückgängig, Strg+Y stellt sie wieder her.
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
