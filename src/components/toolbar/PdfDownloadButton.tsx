"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import type { LabelTemplate, ParsedData } from "@/lib/label/types";

export function PdfDownloadButton({
  template,
  data,
}: {
  template: LabelTemplate;
  data: ParsedData;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, data }),
      });
      if (!res.ok) {
        // Eigene Fehlermeldung der App anzeigen; bei Proxy-Fehlern (z. B. 504 von nginx) kommt kein JSON.
        const message = await res
          .json()
          .then((j: { error?: string }) => j.error)
          .catch(() => undefined);
        throw new Error(message ?? `Der Server antwortet nicht (Status ${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "etiketten.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error && err.message ? err.message : "PDF konnte nicht erstellt werden");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" /> : <FileDown />}
      Als PDF herunterladen
    </Button>
  );
}
