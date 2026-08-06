import { promises as fs } from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import { almacen } from "@/lib/almacen";

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
    const p = await almacen.leer(raw);
    if (!p) continue;
    archivos[`${raw}/post.html`] = strToU8(p.html);
    archivos[`${raw}/meta.json`] = strToU8(
      JSON.stringify(
        {
          id: p.id,
          titulo: p.titulo,
          metaTitle: p.metaTitle,
          metaDescription: p.metaDescription,
          tema: p.tema,
          urlDestino: p.urlDestino,
          idioma: p.idioma,
          fecha: p.fecha,
          palabras: p.palabras,
          tieneFaltantes: p.tieneFaltantes,
        },
        null,
        2,
      ),
    );
  }

  if (Object.keys(archivos).length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "No hay posts que empaquetar." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Incluye el CSS global una vez (se pega en GAdmin), para que el ZIP sea autónomo.
  try {
    const css = await fs.readFile(path.join(process.cwd(), "public", "arenas.css"), "utf8");
    archivos["arenas.css"] = strToU8(css);
    archivos["LEEME.txt"] = strToU8(
      "Cada carpeta tiene el post.html (contenido con clases) y su meta.json.\n" +
        "Pega arenas.css UNA sola vez en los estilos globales de GAdmin; luego pega\n" +
        "el HTML de cada post en su entrada. El diseño lo aplica el CSS a las clases.\n",
    );
  } catch {
    /* sin CSS: seguimos con los posts */
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
