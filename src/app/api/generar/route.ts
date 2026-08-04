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
const ORDEN: Idioma[] = ["es", "ca", "en"];
const IDIOMA_UP: Record<Idioma, string> = { es: "ES", ca: "CA", en: "EN" };

function normIdioma(v: unknown): Idioma {
  return IDIOMAS.includes(v as Idioma) ? (v as Idioma) : "es";
}

/** Idiomas seleccionados: array JSON `idiomas`, o el campo único `idioma`. */
function leerIdiomas(form: FormData): Idioma[] {
  const raw = form.get("idiomas");
  if (typeof raw === "string" && raw.trim()) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const filt = arr.filter((x): x is Idioma => IDIOMAS.includes(x as Idioma));
        const unicos = ORDEN.filter((l) => filt.includes(l));
        if (unicos.length) return unicos;
      }
    } catch {
      /* ignora */
    }
  }
  const uno = form.get("idioma");
  if (typeof uno === "string" && uno.trim()) return [normIdioma(uno)];
  return ["es"];
}

type Fuente =
  | { tipo: "texto" | "tema"; texto: string; etiqueta: string; modo: EntradaGeneracion["modo"] }
  | { tipo: "archivo"; file: File; etiqueta: string };

type Trabajo = { fuente: Fuente; idioma: Idioma; etiqueta: string };

/**
 * Genera uno o varios posts. Acepta multipart/form-data:
 *   texto, url, idiomas (JSON de idiomas), temas (JSON de Modo B), archivos[].
 * Cada fuente (archivo/texto/tema) se multiplica por cada idioma seleccionado:
 * un post por idioma. Responde en streaming (NDJSON) con eventos por trabajo,
 * procesados de uno en uno (cola secuencial).
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
  const idiomas = leerIdiomas(form);
  const temasRaw = form.get("temas");
  const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File);

  const fuentes: Fuente[] = [];
  if (typeof temasRaw === "string" && temasRaw.trim()) {
    try {
      const temas = JSON.parse(temasRaw) as { titulo?: string; datosClave?: string }[];
      if (Array.isArray(temas)) {
        for (const t of temas) {
          const titulo = String(t.titulo ?? "").trim();
          const datos = String(t.datosClave ?? "").trim();
          if (titulo) {
            fuentes.push({
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
    for (const f of archivos) fuentes.push({ tipo: "archivo", file: f, etiqueta: f.name });
    if (texto) fuentes.push({ tipo: "texto", texto, etiqueta: texto.slice(0, 48), modo: "texto" });
  }

  // Producto fuentes × idiomas (agrupado por fuente). Si hay más de un idioma,
  // la etiqueta lleva el sufijo del idioma para distinguir los trabajos.
  const trabajos: Trabajo[] = [];
  for (const f of fuentes) {
    for (const idioma of idiomas) {
      const tag = idiomas.length > 1 ? ` · ${IDIOMA_UP[idioma]}` : "";
      trabajos.push({ fuente: f, idioma, etiqueta: f.etiqueta + tag });
    }
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
      if (trabajos.length === 0) {
        send({ tipo: "fin", ok: false, error: "Escribe un tema o sube un archivo." });
        controller.close();
        return;
      }

      send({ tipo: "lote", total: trabajos.length, etiquetas: trabajos.map((t) => t.etiqueta) });

      // Extracción memoizada: cada archivo se lee una sola vez aunque se genere
      // en varios idiomas.
      const cacheTexto = new Map<File, string>();
      const textoDeArchivo = async (
        file: File,
        emitir: (e: Record<string, unknown>) => void,
      ): Promise<string> => {
        const cacheado = cacheTexto.get(file);
        if (cacheado !== undefined) return cacheado;
        emitir({ tipo: "paso", texto: `Leyendo ${file.name}…` });
        const buf = Buffer.from(await file.arrayBuffer());
        const t = (await extraerTextoDeBuffer(buf, file.name)).trim();
        cacheTexto.set(file, t);
        return t;
      };

      for (let i = 0; i < trabajos.length; i++) {
        const { fuente, idioma } = trabajos[i];
        const emitir = (e: Record<string, unknown>) => send({ job: i, ...e });
        try {
          let textoJob: string;
          let modo: EntradaGeneracion["modo"];
          if (fuente.tipo === "archivo") {
            if (!extensionValida(fuente.file.name)) {
              emitir({ tipo: "fin", ok: false, error: "Formato no admitido." });
              continue;
            }
            textoJob = await textoDeArchivo(fuente.file, emitir);
            modo = "archivo";
            if (!textoJob) {
              emitir({ tipo: "fin", ok: false, error: "No se pudo extraer texto del archivo." });
              continue;
            }
          } else {
            textoJob = fuente.texto;
            modo = fuente.modo;
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
