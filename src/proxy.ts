import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authEnabled, isValidSession } from "@/lib/server/auth";

/** Schützt alle Seiten und API-Routen per Passwort, sobald ETIKETTEN_PASSWORD gesetzt ist. */
export function proxy(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  if (isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  // Next.js verlangt hier eine absolute URL. Hinter nginx ist request.url aber http://127.0.0.1:3001/...,
  // daher Adresse aus den Proxy-Headern bauen (nginx setzt Host und X-Forwarded-Proto).
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    request.nextUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ??
    request.headers.get("host") ??
    request.nextUrl.host;

  const loginUrl = new URL(`/login?next=${encodeURIComponent(pathname + search)}`, `${proto}://${host}`);
  const response = NextResponse.redirect(loginUrl);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  // Statische Next.js-Dateien müssen für die Login-Seite selbst erreichbar bleiben.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
