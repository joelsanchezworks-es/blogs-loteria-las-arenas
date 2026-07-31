import { NextResponse } from "next/server";
import { extensionValida, guardarSubida } from "@/lib/subidas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Recibe archivos (multipart) y los guarda en tránsito; devuelve tokens. */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Subida no válida." }, { status: 400 });
  }

  const entradas = form.getAll("archivos").filter((f): f is File => f instanceof File);
  if (entradas.length === 0) {
    return NextResponse.json({ ok: false, error: "No se recibieron archivos." }, { status: 400 });
  }

  const archivos = [];
  for (const f of entradas) {
    if (!extensionValida(f.name)) {
      archivos.push({ ok: false, nombre: f.name, error: "Formato no admitido." });
      continue;
    }
    try {
      const buf = Buffer.from(await f.arrayBuffer());
      const info = await guardarSubida(f.name, buf);
      archivos.push({
        ok: true,
        token: info.token,
        nombre: info.nombre,
        tipo: info.tipo,
        tamano: info.tamano,
      });
    } catch (e) {
      archivos.push({ ok: false, nombre: f.name, error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, archivos });
}
