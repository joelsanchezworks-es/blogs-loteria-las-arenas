import { extensionValida, extraerTextoDeBuffer } from "@/lib/archivos";
import { ejecutarTrabajo, type EntradaGeneracion } from "@/lib/generacion";
import { motorDisponible } from "@/lib/motor";
import type { Idioma } from "@/lib/prompt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Vercel Hobby (plan gratuito) limita las funciones a 60s. El prompt está
// ajustado para que un post (~600 palabras) se genere dentro de ese margen.
export const maxDuration = 60;

const IDIOMAS: Idioma[] = ["es", "ca", "en"];
function normIdioma(v: unknown): Idioma {
  return IDIOMAS.includes(v as Idioma) ? (v as Idioma) : "es";
}

type Descriptor =
  | { tipo: "texto" | "tema"; texto: string; etiqueta: string; modo: EntradaGeneracion["modo"] }
  | { tipo: "archivo"; file: File; etiqueta: string };

/**
 * Genera uno o varios posts. Acepta multipart/form-data:
 *   texto, url, idioma, temas (JSON de Modo B), archivos[].
 * Responde en streaming (NDJSON) con eventos por trabajo. Los trabajos se
 * procesan de uno en uno (cola secuencial natural).
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ tipo: "fin", ok: false, error: "Petición no válida." }) + "\n", {
      status: 400,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  }

  const texto = String(form.get("texto") ?? "").trim();
  const urlRaw = form.get("url");
  const url = typeof urlRaw === "string" && urlRaw.trim() ? urlRaw.trim() : null;
  const idioma = normIdioma(form.get("idioma"));
  const temasRaw = form.get("temas");
  const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File);

  const descriptores: Descriptor[] = [];
  if (typeof temasRaw === "string" && temasRaw.trim()) {
    try {
      const temas = JSON.parse(temasRaw) as { titulo?: string; datosClave?: string }[];
      if (Array.isArray(temas)) {
        for (const t of temas) {
          const titulo = String(t.titulo ?? "").trim();
          const datos = String(t.datosClave ?? "").trim();
          if (titulo) {
            descriptores.push({
              tipo: "tema",
              texto: `${titulo}\n${datos}`.trim(),
              etiqueta: titulo.slice(0, 48),
              modo: "tema",
            });
          }
        }
      }
    } catch {
      /* temas ilegibles */
    }
  } else {
    for (const f of archivos) descriptores.push({ tipo: "archivo", file: f, etiqueta: f.name });
    if (texto) descriptores.push({ tipo: "texto", texto, etiqueta: texto.slice(0, 48), modo: "texto" });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (o: Record<string, unknown>) => {
        try {
          controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        } catch {
          /* cerrado */
        }
      };

      const motor = await motorDisponible();
      if (!motor.ok) {
        send({ tipo: "fin", ok: false, error: motor.error });
        controller.close();
        return;
      }
      if (descriptores.length === 0) {
        send({ tipo: "fin", ok: false, error: "Escribe un tema o sube un archivo." });
        controller.close();
        return;
      }

      send({ tipo: "lote", total: descriptores.length, etiquetas: descriptores.map((d) => d.etiqueta) });

      for (let i = 0; i < descriptores.length; i++) {
        const d = descriptores[i];
        const emitir = (e: Record<string, unknown>) => send({ job: i, ...e });
        try {
          let textoJob: string;
          let modo: EntradaGeneracion["modo"];
          if (d.tipo === "archivo") {
            if (!extensionValida(d.file.name)) {
              emitir({ tipo: "fin", ok: false, error: "Formato no admitido." });
              continue;
            }
            emitir({ tipo: "paso", texto: `Leyendo ${d.file.name}…` });
            const buf = Buffer.from(await d.file.arrayBuffer());
            textoJob = (await extraerTextoDeBuffer(buf, d.file.name)).trim();
            modo = "archivo";
            if (!textoJob) {
              emitir({ tipo: "fin", ok: false, error: "No se pudo extraer texto del archivo." });
              continue;
            }
          } else {
            textoJob = d.texto;
            modo = d.modo;
          }
          await ejecutarTrabajo({ texto: textoJob, url, idioma, modo }, { emitir, signal: req.signal });
        } catch (e) {
          emitir({ tipo: "fin", ok: false, error: `Error inesperado: ${String(e)}` });
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
