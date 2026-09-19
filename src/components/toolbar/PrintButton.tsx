"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton({ rowCount }: { rowCount: number }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer /> {rowCount > 1 ? `${rowCount} Etiketten drucken` : "Drucken"}
    </Button>
  );
}
