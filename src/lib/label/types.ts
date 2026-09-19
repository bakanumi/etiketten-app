export type FontId =
  | "arial"
  | "fira-sans"
  | "ibm-plex-sans-condensed"
  | "ibm-plex-mono"
  | "barlow-condensed";

export type HorizontalAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "middle" | "bottom";
export type QrErrorCorrection = "L" | "M" | "Q" | "H";

interface BaseElement {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  /** Sicherheitsabstand zum Rand der Box, in mm. */
  paddingMm?: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  /** Mehrzeilig, kann "{{Spaltenname}}"-Platzhalter enthalten. */
  template: string;
  fontFamily: FontId;
  fontSizePt: number;
  bold?: boolean;
  /** Zeilenhöhe als Multiplikator. */
  lineHeight?: number;
  align: HorizontalAlign;
  verticalAlign: VerticalAlign;
}

export interface QrElement extends BaseElement {
  type: "qr";
  /** Fixer Wert oder "{{Spalte}}"-Platzhalter. */
  template: string;
  errorCorrectionLevel?: QrErrorCorrection;
}

export type LabelElement = TextElement | QrElement;

/**
 * Flaches, rein optionales Patch-Objekt für Element-Updates - deckt Felder aus
 * TextElement und QrElement gemeinsam ab. Der Merge mit dem bestehenden Element
 * erfolgt per Spread + `as LabelElement`-Assertion im aufrufenden State-Reducer,
 * da ein diskriminiertes Union sich nicht sauber generisch patchen lässt.
 */
export interface ElementPatch {
  template?: string;
  fontFamily?: FontId;
  fontSizePt?: number;
  bold?: boolean;
  lineHeight?: number;
  align?: HorizontalAlign;
  verticalAlign?: VerticalAlign;
  errorCorrectionLevel?: QrErrorCorrection;
  xMm?: number;
  yMm?: number;
  widthMm?: number;
  heightMm?: number;
  paddingMm?: number;
}

export interface LabelTemplate {
  widthMm: number;
  heightMm: number;
  elements: LabelElement[];
}

export interface ParsedData {
  columns: string[];
  rows: Record<string, string>[];
}

export const DEFAULT_PADDING_MM = 1;

export function createTextElement(partial?: Partial<TextElement>): TextElement {
  return {
    id: crypto.randomUUID(),
    type: "text",
    xMm: 2,
    yMm: 2,
    widthMm: 20,
    heightMm: 8,
    paddingMm: DEFAULT_PADDING_MM,
    template: "Neuer Text",
    fontFamily: "arial",
    fontSizePt: 10,
    bold: false,
    lineHeight: 1.15,
    align: "left",
    verticalAlign: "top",
    ...partial,
  };
}

export function createQrElement(partial?: Partial<QrElement>): QrElement {
  return {
    id: crypto.randomUUID(),
    type: "qr",
    xMm: 2,
    yMm: 2,
    widthMm: 15,
    heightMm: 15,
    paddingMm: 0,
    template: "{{Spalte 1}}",
    errorCorrectionLevel: "M",
    ...partial,
  };
}
