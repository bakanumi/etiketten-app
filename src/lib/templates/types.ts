import type { LabelTemplate } from "@/lib/label/types";
import type { ParseOptions } from "@/lib/parse/parseInput";

/** Gespeicherte Vorlage: Etikettendesign plus die Einstellungen, wie Daten darauf abgebildet werden. */
export interface SavedTemplate {
  id: string;
  name: string;
  updatedAt: string;
  template: LabelTemplate;
  options: ParseOptions;
}
