import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lista el historial con filtros (q, idioma, desde, hasta) + contador del mes. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const datos = await almacen.listar({
      q: searchParams.get("q") ?? undefined,
      idioma: searchParams.get("idioma") ?? undefined,
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
    });
    return NextResponse.json(datos);
  } catch (e) {
    return NextResponse.json(
      { posts: [], total: 0, mesActual: 0, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
