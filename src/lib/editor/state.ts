import type { LabelTemplate } from "@/lib/label/types";
import type { ParseOptions } from "@/lib/parse/parseInput";

/** Alles, was der Editor speichert (localStorage) und wiederherstellt. */
export interface PersistedShape {
  template: LabelTemplate;
  rawInput: string;
  options: ParseOptions;
}

/**
 * Editor-Zustand mit Rückgängig/Wiederholen für das Etikettendesign (Größe + Elemente).
 * Eingaben im Daten-Tab und Einstellungen sind nicht Teil des Verlaufs.
 */
export interface EditorState {
  form: PersistedShape;
  past: LabelTemplate[];
  future: LabelTemplate[];
  /** Schlüssel der letzten Änderung, um aufeinanderfolgende Änderungen zu einem Schritt zusammenzufassen. */
  lastKey: string | null;
  lastAt: number;
}

export type EditorAction =
  | { type: "hydrate"; form: PersistedShape }
  | { type: "update"; updater: (form: PersistedShape) => PersistedShape; key?: string; at: number }
  | { type: "breakCoalesce" }
  | { type: "undo" }
  | { type: "redo" };

const MAX_HISTORY = 100;
/** Zeitfenster, in dem gleichartige Änderungen (z. B. Tippen, Pfeiltasten) ein Schritt bleiben. */
export const COALESCE_WINDOW_MS = 600;
/** Schlüssel mit diesem Präfix gelten bis zum nächsten "breakCoalesce" als ein Schritt (Maus-Ziehen). */
export const GESTURE_PREFIX = "gesture:";

export function createEditorState(form: PersistedShape): EditorState {
  return { form, past: [], future: [], lastKey: null, lastAt: 0 };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "hydrate":
      return createEditorState(action.form);

    case "update": {
      const next = action.updater(state.form);
      if (next === state.form) return state;
      // Nur Daten/Einstellungen geändert: kein Eintrag im Design-Verlauf.
      if (next.template === state.form.template) return { ...state, form: next };

      const merge =
        action.key !== undefined &&
        action.key === state.lastKey &&
        (action.key.startsWith(GESTURE_PREFIX) || action.at - state.lastAt < COALESCE_WINDOW_MS);

      return {
        form: next,
        past: merge ? state.past : [...state.past, state.form.template].slice(-MAX_HISTORY),
        future: [],
        lastKey: action.key ?? null,
        lastAt: action.at,
      };
    }

    case "breakCoalesce":
      return state.lastKey === null ? state : { ...state, lastKey: null };

    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        form: { ...state.form, template: previous },
        past: state.past.slice(0, -1),
        future: [state.form.template, ...state.future],
        lastKey: null,
        lastAt: 0,
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        form: { ...state.form, template: next },
        past: [...state.past, state.form.template],
        future: rest,
        lastKey: null,
        lastAt: 0,
      };
    }
  }
}

/** Verschiebt ein Element um dx/dy (mm) und hält es innerhalb des Etiketts. */
export function nudgeElement(
  template: LabelTemplate,
  id: string,
  dxMm: number,
  dyMm: number
): LabelTemplate {
  let changed = false;
  const elements = template.elements.map((el) => {
    if (el.id !== id) return el;
    const xMm = round(Math.min(Math.max(el.xMm + dxMm, 0), Math.max(0, template.widthMm - el.widthMm)));
    const yMm = round(Math.min(Math.max(el.yMm + dyMm, 0), Math.max(0, template.heightMm - el.heightMm)));
    if (xMm === el.xMm && yMm === el.yMm) return el;
    changed = true;
    return { ...el, xMm, yMm };
  });
  return changed ? { ...template, elements } : template;
}

function round(mm: number): number {
  return Math.round(mm * 1000) / 1000;
}
