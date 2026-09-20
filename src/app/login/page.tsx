"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

/** Nur relative Ziele innerhalb der App erlauben (kein Redirect auf fremde Seiten). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Vollständiges Neuladen, damit der neue Cookie sofort für alle Anfragen gilt.
        window.location.assign(safeNext(new URLSearchParams(window.location.search).get("next")));
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? `Anmeldung fehlgeschlagen (Status ${res.status})`);
    } catch {
      setError("Der Server ist nicht erreichbar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Lock className="size-5" /> Etiketten-Generator
            </h1>
            <p className="text-sm text-muted-foreground">Bitte das Passwort eingeben.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy || password === ""}>
            Anmelden
          </Button>
        </form>
      </Card>
    </main>
  );
}
