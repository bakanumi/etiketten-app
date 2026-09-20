import { createHash, createHmac, timingSafeEqual } from "crypto";

/**
 * Einfacher Passwortschutz ohne Benutzernamen.
 *
 * Aktiv, sobald die Umgebungsvariable ETIKETTEN_PASSWORD gesetzt ist; ohne sie ist die App offen
 * (z. B. lokale Entwicklung). Nach dem Login wird ein signierter Cookie gesetzt. Der Signaturschlüssel
 * leitet sich vom Passwort ab - wer das Passwort ändert, meldet damit automatisch alle Geräte ab.
 */

export const SESSION_COOKIE = "etiketten_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 Tage

function configuredPassword(): string | undefined {
  const password = process.env.ETIKETTEN_PASSWORD;
  return password ? password : undefined;
}

export function authEnabled(): boolean {
  return configuredPassword() !== undefined;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function sign(payload: string, password: string): string {
  return createHmac("sha256", sha256(`etiketten-app:v1:${password}`)).update(payload).digest("hex");
}

/** Zeitkonstanter Passwortvergleich (über Hashes gleicher Länge). */
export function checkPassword(input: string): boolean {
  const password = configuredPassword();
  if (!password) return true;
  return timingSafeEqual(sha256(input), sha256(password));
}

export function createSessionToken(): string {
  const expires = String(Date.now() + SESSION_MAX_AGE_S * 1000);
  return `${expires}.${sign(expires, configuredPassword() ?? "")}`;
}

export function isValidSession(token: string | undefined): boolean {
  const password = configuredPassword();
  if (!password) return true;
  if (!token) return false;

  const [expires, signature] = token.split(".");
  if (!expires || !signature || !(Number(expires) > Date.now())) return false;

  const expected = Buffer.from(sign(expires, password));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// --- Schutz vor Passwort-Raten: wenige Fehlversuche pro IP und Zeitfenster -------------------

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(ip: string): boolean {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

export function recordFailure(ip: string): void {
  const now = Date.now();
  if (failures.size > 1000) {
    for (const [key, value] of failures) if (value.resetAt <= now) failures.delete(key);
  }
  const entry = failures.get(ip);
  if (!entry || entry.resetAt <= now) {
    failures.set(ip, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
  } else {
    entry.count++;
  }
}

export function clearFailures(ip: string): void {
  failures.delete(ip);
}
