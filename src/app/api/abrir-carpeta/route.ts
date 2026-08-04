import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { MODO_LOCAL } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DIR_HISTORIAL = path.join(process.cwd(), "historial");

/** Abre la carpeta de un post en el explorador (solo modo local con archivos). */
export async function POST(req: Request) {
  if (!MODO_LOCAL) {
    return NextResponse.json(
      { ok: false, error: "Solo disponible en modo local (con almacén de archivos)." },
      { status: 400 },
    );
  }

  const cuerpo = (await req.json().catch(() => ({}))) as { id?: unknown };
  const id = typeof cuerpo.id === "string" ? cuerpo.id : "";
  if (!/^[\w.\-]+$/.test(id)) {
    return NextResponse.json({ ok: false, error: "Identificador no válido." }, { status: 400 });
  }

  const dir = path.join(DIR_HISTORIAL, id);
  try {
    const st = await fs.stat(dir);
    if (!st.isDirectory()) throw new Error("no es carpeta");
  } catch {
    return NextResponse.json({ ok: false, error: "La carpeta no existe." }, { status: 404 });
  }

  const plt = process.platform;
  const cmd = plt === "darwin" ? "open" : plt === "win32" ? "explorer" : "xdg-open";
  try {
    const hijo = spawn(cmd, [dir], { detached: true, stdio: "ignore" });
    hijo.on("error", () => {});
    hijo.unref();
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo abrir el explorador." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
