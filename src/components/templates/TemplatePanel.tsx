"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LabelTemplate } from "@/lib/label/types";
import type { ParseOptions } from "@/lib/parse/parseInput";
import type { SavedTemplate } from "@/lib/templates/types";
import { Save, Trash2 } from "lucide-react";

const MAX_NAME_LENGTH = 80;

async function fetchTemplates(): Promise<SavedTemplate[]> {
  const res = await fetch("/api/templates", { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as SavedTemplate[];
}

export function TemplatePanel({
  template,
  options,
  onApply,
}: {
  template: LabelTemplate;
  options: ParseOptions;
  onApply: (template: LabelTemplate, options: ParseOptions) => void;
}) {
  const [items, setItems] = useState<SavedTemplate[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const reload = useCallback(async () => {
    try {
      setItems(await fetchTemplates());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTemplates()
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = items.find((t) => t.id === activeId) ?? null;

  /** Ungespeicherte Änderungen: Abweichung von der geladenen Vorlage bzw. überhaupt ein Design ohne Vorlage. */
  const isDirty = active
    ? JSON.stringify({ template: active.template, options: active.options }) !==
      JSON.stringify({ template, options })
    : template.elements.length > 0;

  const handleLoad = (id: string) => {
    if (id === activeId) return;
    const item = items.find((t) => t.id === id);
    if (!item) return;
    if (isDirty && !window.confirm("Das aktuelle Design ist nicht gespeichert und wird ersetzt. Fortfahren?")) {
      return;
    }
    onApply(item.template, item.options);
    setActiveId(item.id);
    setName(item.name);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Bitte einen Namen für die Vorlage eingeben");
      return;
    }

    // Gleicher Name wie die geladene Vorlage -> aktualisieren; sonst bei Namensgleichheit mit
    // einer anderen Vorlage nach Bestätigung überschreiben, ansonsten als neue Vorlage anlegen.
    const sameName = items.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (sameName && sameName.id !== activeId) {
      if (!window.confirm(`Vorlage „${sameName.name}“ existiert bereits. Überschreiben?`)) return;
    }
    const id = sameName?.id; // anderer Name als die geladene Vorlage -> neue Vorlage (Speichern unter)

    setBusy(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: trimmed, template, options }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error);
      const saved = (await res.json()) as SavedTemplate;
      await reload();
      setActiveId(saved.id);
      setName(saved.name);
      toast.success(`Vorlage „${saved.name}“ gespeichert`);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Vorlage konnte nicht gespeichert werden");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!active) return;
    if (!window.confirm(`Vorlage „${active.name}“ wirklich löschen?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/templates?id=${encodeURIComponent(active.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await reload();
      setActiveId(null);
      toast.success(`Vorlage „${active.name}“ gelöscht`);
    } catch {
      toast.error("Vorlage konnte nicht gelöscht werden");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label>Gespeicherte Vorlagen</Label>
        <Select value={activeId ?? ""} onValueChange={(v) => v && handleLoad(v)}>
          <SelectTrigger className="w-64" disabled={items.length === 0}>
            <SelectValue>
              {(v: string) =>
                items.find((t) => t.id === v)?.name ??
                (items.length === 0 ? "Noch keine Vorlagen" : "Vorlage laden …")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {items.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="template-name">Name</Label>
        <Input
          id="template-name"
          className="w-64"
          maxLength={MAX_NAME_LENGTH}
          placeholder="z. B. Regal-Etikett 57×32"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSave()}
        />
      </div>

      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={busy}
        title="Speichert Größe, Elemente und Daten-Einstellungen. Gleicher Name überschreibt die Vorlage."
      >
        <Save /> Speichern
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={() => void handleDelete()}
        disabled={busy || !active}
        title="Geladene Vorlage löschen"
      >
        <Trash2 /> Löschen
      </Button>

      {active && isDirty && (
        <span className="pb-1.5 text-sm text-muted-foreground">Ungespeicherte Änderungen</span>
      )}
      {loadFailed && (
        <span className="pb-1.5 text-sm text-destructive">
          Vorlagen konnten nicht vom Server geladen werden.
        </span>
      )}
    </div>
  );
}
