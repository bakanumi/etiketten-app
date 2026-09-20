import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  authEnabled,
  checkPassword,
  clearFailures,
  createSessionToken,
  isRateLimited,
  recordFailure,
} from "@/lib/server/auth";

export const runtime = "nodejs";

/** Client-IP: nginx setzt X-Real-IP auf die echte Adresse (nicht vom Client fälschbar). */
function clientIp(req: Request): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unbekannt";
}

export async function POST(req: Request) {
  if (!authEnabled()) return NextResponse.json({ ok: true });

  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Zu viele Fehlversuche. Bitte in einigen Minuten erneut versuchen." },
      { status: 429 }
    );
  }

  let password = "";
  try {
    const body: unknown = await req.json();
    if (typeof body === "object" && body !== null && "password" in body) {
      password = String((body as { password: unknown }).password);
    }
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    recordFailure(ip);
    await new Promise((resolve) => setTimeout(resolve, 600)); // bremst automatisiertes Raten
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  clearFailures(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    // Hinter nginx kommt die Anfrage per http an; ob der Browser https nutzt, sagt X-Forwarded-Proto.
    secure: req.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  return response;
}

/** Abmelden: Cookie löschen. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return response;
}
