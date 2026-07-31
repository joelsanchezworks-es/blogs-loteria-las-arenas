import { NextResponse } from "next/server";
import { borrarPost, leerPost } from "@/lib/historial";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lee un post concreto (meta + html) para ver/vista previa/copiar/descargar. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = await leerPost(id);
  if (!datos) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, ...datos });
}

/** Borra un post. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await borrarPost(id);
  if (!ok) return NextResponse.json({ ok: false, error: "No se pudo borrar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
