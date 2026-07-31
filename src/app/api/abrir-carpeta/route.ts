import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { DIR_HISTORIAL } from "@/lib/historial";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Abre la carpeta de un post en el explorador de archivos del sistema (local). */
export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => ({}))) as { id?: unknown };
  const id = typeof cuerpo.id === "string" ? cuerpo.id : "";

  // Validación estricta del id para evitar path traversal.
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
    return NextResponse.json(
      { ok: false, error: "No se pudo abrir el explorador en este sistema." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, ruta: dir });
}
