import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import type { LabelTemplate } from "@/lib/label/types";
import type { ParseOptions } from "@/lib/parse/parseInput";
import type { SavedTemplate } from "@/lib/templates/types";

/** Speicherort der Vorlagen; per ETIKETTEN_DATA_DIR änderbar (Standard: ./data im Projektordner). */
export const DATA_DIR = process.env.ETIKETTEN_DATA_DIR ?? path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "templates.json");

// Schreibzugriffe nacheinander abarbeiten, damit gleichzeitige Requests sich nicht überschreiben.
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<SavedTemplate[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as SavedTemplate[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(items: SavedTemplate[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(items, null, 2), "utf8");
}

export function listTemplates(): Promise<SavedTemplate[]> {
  return serialize(async () =>
    (await readAll()).sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
  );
}

/**
 * Speichert eine Vorlage. Mit `id` wird genau diese Vorlage aktualisiert (auch Umbenennen);
 * ohne `id` überschreibt ein gleichnamiger Eintrag, sonst wird eine neue angelegt.
 */
export function saveTemplate(input: {
  id?: string;
  name: string;
  template: LabelTemplate;
  options: ParseOptions;
}): Promise<SavedTemplate> {
  return serialize(async () => {
    const items = await readAll();
    const byId = input.id ? items.findIndex((t) => t.id === input.id) : -1;
    const index =
      byId >= 0
        ? byId
        : items.findIndex((t) => t.name.toLowerCase() === input.name.toLowerCase());

    const saved: SavedTemplate = {
      id: index >= 0 ? items[index].id : randomUUID(),
      name: input.name,
      updatedAt: new Date().toISOString(),
      template: input.template,
      options: input.options,
    };
    if (index >= 0) items[index] = saved;
    else items.push(saved);
    await writeAll(items);
    return saved;
  });
}

export function deleteTemplate(id: string): Promise<boolean> {
  return serialize(async () => {
    const items = await readAll();
    const remaining = items.filter((t) => t.id !== id);
    if (remaining.length === items.length) return false;
    await writeAll(remaining);
    return true;
  });
}
