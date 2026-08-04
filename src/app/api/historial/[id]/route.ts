import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lee un post (meta + html) para ver / vista previa / copiar / descargar. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await almacen.leer(id);
  if (!post) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  return NextResponse.json({
    ok: true,
    html: post.html,
    meta: {
      id: post.id,
      titulo: post.titulo,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      temaEntrada: post.tema,
      urlDestino: post.urlDestino,
      idioma: post.idioma,
      palabras: post.palabras,
    },
  });
}

/** Borra un post. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await almacen.borrar(id);
  if (!ok) return NextResponse.json({ ok: false, error: "No se pudo borrar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
