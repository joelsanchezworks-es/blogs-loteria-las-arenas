import { NextResponse } from "next/server";
import { listarConFiltros } from "@/lib/historial";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lista el historial con filtros (q, idioma, desde, hasta) + contador del mes. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const datos = await listarConFiltros({
    q: searchParams.get("q") ?? undefined,
    idioma: searchParams.get("idioma") ?? undefined,
    desde: searchParams.get("desde") ?? undefined,
    hasta: searchParams.get("hasta") ?? undefined,
  });
  return NextResponse.json(datos);
}
