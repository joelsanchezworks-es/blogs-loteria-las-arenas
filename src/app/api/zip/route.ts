import { zipSync, strToU8 } from "fflate";
import { leerPost } from "@/lib/historial";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID_VALIDO = /^[\w.\-]+$/;

/** Empaqueta en un ZIP los posts indicados (post.html + meta.json por carpeta). */
export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => ({}))) as { ids?: unknown };
  const ids = Array.isArray(cuerpo.ids) ? cuerpo.ids : [];

  const archivos: Record<string, Uint8Array> = {};
  for (const raw of ids) {
    if (typeof raw !== "string" || !ID_VALIDO.test(raw)) continue;
    const p = await leerPost(raw);
    if (!p) continue;
    archivos[`${raw}/post.html`] = strToU8(p.html);
    archivos[`${raw}/meta.json`] = strToU8(JSON.stringify(p.meta, null, 2));
  }

  if (Object.keys(archivos).length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "No hay posts que empaquetar." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const zip = zipSync(archivos, { level: 6 });
  return new Response(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="posts-loteria-las-arenas.zip"',
      "Cache-Control": "no-store",
    },
  });
}
