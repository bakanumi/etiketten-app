import { EditorApp } from "@/components/EditorApp";
import { authEnabled } from "@/lib/server/auth";

// Pro Anfrage rendern: ob der Passwortschutz aktiv ist, hängt von der Umgebung des laufenden Servers ab.
export const dynamic = "force-dynamic";

export default function Home() {
  return <EditorApp showLogout={authEnabled()} />;
}
