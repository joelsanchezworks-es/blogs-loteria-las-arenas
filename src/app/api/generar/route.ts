import { encolar } from "@/lib/cola";
import { ejecutarTrabajo, type EntradaGeneracion } from "@/lib/generacion";
import { comprobarApiKey } from "@/lib/guard";
import { resolverSubida } from "@/lib/subidas";
import type { Idioma } from "@/lib/prompt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IDIOMAS: Idioma[] = ["es", "ca", "en"];

type TrabajoReq = Record<string, unknown>;

function normalizarIdioma(v: unknown): Idioma {
  return IDIOMAS.includes(v as Idioma) ? (v as Idioma) : "es";
}

/** Convierte un trabajo del cliente en una EntradaGeneracion resuelta (o error). */
function prepararTrabajo(t: TrabajoReq): {
  entrada?: EntradaGeneracion;
  etiqueta: string;
  error?: string;
} {
  const url = typeof t.url === "string" && t.url.trim() ? t.url.trim() : null;
  const idioma = normalizarIdioma(t.idioma);
  const fuente = (t.fuente ?? {}) as Record<string, unknown>;
  const textoDirecto = typeof t.texto === "string" ? t.texto.trim() : "";
  const tipo = typeof fuente.tipo === "string" ? fuente.tipo : textoDirecto ? "texto" : "";

  // Archivo original a copiar en la carpeta (Modo B: el archivo del que salió el tema).
  let origenTmp: string | null = null;
  let origenNombre: string | null = null;
  if (typeof t.origenToken === "string") {
    const o = resolverSubida(t.origenToken);
    if (o) {
      origenTmp = o.ruta;
      origenNombre = o.nombre;
    }
  }

  if (tipo === "archivo") {
    const token = typeof fuente.token === "string" ? fuente.token : "";
    const info = token ? resolverSubida(token) : null;
    if (!info) return { etiqueta: "archivo", error: "Archivo no encontrado (vuelve a subirlo)." };
    return {
      etiqueta: info.nombre,
      entrada: {
        fuente: { tipo: "archivo", ruta: info.ruta, nombre: info.nombre },
        url,
        idioma,
        modo: "archivo",
        archivoOrigenTmp: origenTmp ?? info.ruta,
        archivoOrigenNombre: origenNombre ?? info.nombre,
      },
    };
  }

  const texto = typeof fuente.texto === "string" ? fuente.texto.trim() : textoDirecto;
  if (!texto) return { etiqueta: "tema", error: "Falta el tema o las instrucciones." };
  return {
    etiqueta: texto.slice(0, 48),
    entrada: {
      fuente: { tipo: "texto", texto },
      url,
      idioma,
      modo: origenTmp ? "mixto" : "texto",
      archivoOrigenTmp: origenTmp,
      archivoOrigenNombre: origenNombre,
    },
  };
}

export async function POST(req: Request) {
  const guard = comprobarApiKey();
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const lista: TrabajoReq[] = Array.isArray(cuerpo.trabajos)
    ? (cuerpo.trabajos as TrabajoReq[])
    : [cuerpo];

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

      if (guard.hayApiKey) {
        send({ tipo: "fin", ok: false, error: guard.mensaje });
        controller.close();
        return;
      }

      const preparados = lista.map(prepararTrabajo);
      send({
        tipo: "lote",
        total: preparados.length,
        etiquetas: preparados.map((p) => p.etiqueta),
      });

      const promesas = preparados.map((p, i) => {
        if (!p.entrada) {
          send({ job: i, tipo: "fin", ok: false, error: p.error });
          return Promise.resolve();
        }
        return encolar(
          () =>
            ejecutarTrabajo(p.entrada as EntradaGeneracion, {
              emitir: (e) => send({ job: i, ...e }),
              signal: req.signal,
            }),
          (posicion) => send({ job: i, tipo: "estado", valor: "en-cola", posicion }),
        ).catch((e) => send({ job: i, tipo: "fin", ok: false, error: `Error inesperado: ${String(e)}` }));
      });

      await Promise.allSettled(promesas);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
