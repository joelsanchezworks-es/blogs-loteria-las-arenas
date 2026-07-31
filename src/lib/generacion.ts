import { promises as fs } from "node:fs";
import path from "node:path";
import { ejecutarClaude } from "./claude";
import { construirPrompt, type Idioma } from "./prompt";
import {
  DIR_REFERENCIAS,
  RAIZ,
  contarPalabras,
  crearCarpetaUnica,
  detectarFaltantes,
  limpiarHtml,
  tituloDesdeHtml,
  upsertIndice,
  type Meta,
} from "./historial";
import { crearSlug, fechaCorta, primeraLinea, slugDesdeUrl } from "./slug";

export type EntradaGeneracion = {
  texto: string;
  url: string | null;
  idioma: Idioma;
  modo?: "texto" | "archivo" | "mixto";
  /** Ruta temporal del archivo original a copiar en la carpeta (fases de archivo). */
  archivoOrigenTmp?: string | null;
  /** Nombre a usar para la copia del original. */
  archivoOrigenNombre?: string | null;
};

export type Emisor = (evento: Record<string, unknown>) => void;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function recortar(v: string, max: number): string {
  return v.length > max ? v.slice(0, max).trim() : v;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** Traduce un evento NDJSON del CLI a una línea de progreso amable (o null). */
export function describirEvento(ev: Record<string, unknown>): string | null {
  const tipo = ev.type;
  if (tipo === "system" && ev.subtype === "init") return "Motor iniciado.";
  if (tipo === "assistant") {
    const contenido = obj(ev.message).content;
    if (Array.isArray(contenido)) {
      for (const bloque of contenido) {
        const b = obj(bloque);
        if (b.type === "tool_use") {
          const nombre = str(b.name);
          const input = obj(b.input);
          const fp = str(input.file_path) || str(input.path);
          const base = fp ? path.basename(fp) : "";
          if (nombre === "Read") return `Leyendo ${base || "referencia"}…`;
          if (nombre === "Write") return `Escribiendo ${base || "archivo"}…`;
          if (nombre === "Glob") return "Buscando archivos…";
          return `Usando ${nombre || "herramienta"}…`;
        }
      }
    }
  }
  if (tipo === "result") {
    return ev.subtype === "success" ? "Redacción completada." : null;
  }
  return null;
}

/**
 * Ejecuta un trabajo de generación completo, emitiendo eventos de progreso.
 * No lanza: cualquier fallo se comunica con un evento { tipo:"fin", ok:false }.
 */
export async function ejecutarTrabajo(
  entrada: EntradaGeneracion,
  { emitir, signal }: { emitir: Emisor; signal?: AbortSignal },
): Promise<void> {
  try {
    emitir({ tipo: "estado", valor: "generando" });

    // 1) Carpeta única
    const fecha = fechaCorta();
    const slug =
      (entrada.url ? slugDesdeUrl(entrada.url) : null) ||
      crearSlug(primeraLinea(entrada.texto));
    const { id, dir } = await crearCarpetaUnica(fecha, slug);
    emitir({ tipo: "paso", texto: `Carpeta: historial/${id}` });

    // 2) Copia del archivo original, si lo hubo
    let archivoOrigen: string | null = null;
    if (entrada.archivoOrigenTmp) {
      const nombre = entrada.archivoOrigenNombre || path.basename(entrada.archivoOrigenTmp);
      const ext = path.extname(nombre) || "";
      const destino = path.join(dir, `origen${ext}`);
      try {
        await fs.copyFile(entrada.archivoOrigenTmp, destino);
        archivoOrigen = path.basename(destino);
      } catch {
        // si falla la copia, seguimos sin bloquear la generación
      }
    }

    // 3) Prompt + ejecución del CLI
    const rutas = {
      reglas: path.join(DIR_REFERENCIAS, "reglas-estilo.md"),
      plantilla: path.join(DIR_REFERENCIAS, "plantilla-ejemplo.html"),
      post: path.join(dir, "post.html"),
      meta: path.join(dir, "meta.json"),
    };
    const prompt = construirPrompt(
      { texto: entrada.texto, url: entrada.url, idioma: entrada.idioma },
      rutas,
    );

    emitir({ tipo: "paso", texto: "Lanzando el generador…" });
    const res = await ejecutarClaude(
      prompt,
      { cwd: RAIZ, signal },
      {
        onEvento: (ev) => {
          const linea = describirEvento(ev);
          if (linea) emitir({ tipo: "paso", texto: linea });
        },
      },
    );

    // 4) Los archivos son la fuente de verdad: aunque el CLI salga con código != 0
    //    (p. ej. tope de turnos), si post.html existe y es válido lo damos por bueno.
    let htmlBruto: string | null = null;
    try {
      htmlBruto = await fs.readFile(rutas.post, "utf8");
    } catch {
      htmlBruto = null;
    }
    const html = htmlBruto ? limpiarHtml(htmlBruto) : "";
    if (!html) {
      emitir({
        tipo: "fin",
        ok: false,
        error: res.error || "El generador no escribió un post.html válido.",
      });
      return;
    }
    if (!res.ok) {
      emitir({
        tipo: "aviso",
        texto:
          "El generador avisó de un problema (posible tope de turnos), pero el post se escribió correctamente.",
      });
    }

    // 5) Meta del modelo (tolerante a fallos) + normalización
    let metaModelo: Record<string, unknown> = {};
    try {
      metaModelo = obj(JSON.parse(await fs.readFile(rutas.meta, "utf8")));
    } catch {
      emitir({ tipo: "aviso", texto: "meta.json no era JSON válido; se reconstruye." });
    }

    const palabras = contarPalabras(html);
    const faltantes = detectarFaltantes(html);
    const meta: Meta = {
      id,
      slug,
      titulo: str(metaModelo.titulo) || tituloDesdeHtml(html) || slug,
      metaTitle: recortar(str(metaModelo.metaTitle), 60),
      metaDescription: recortar(str(metaModelo.metaDescription), 155),
      temaEntrada: entrada.texto,
      urlDestino: entrada.url,
      idioma: entrada.idioma,
      fecha: new Date().toISOString(),
      modo: entrada.modo ?? "texto",
      archivoOrigen,
      palabras,
      faltantes,
      version: 1,
    };

    // 6) Reescribir meta canónico + html limpio, y actualizar índice
    await fs.writeFile(rutas.meta, JSON.stringify(meta, null, 2) + "\n", "utf8");
    if (html !== htmlBruto) await fs.writeFile(rutas.post, html + "\n", "utf8");
    await upsertIndice(meta);

    if (faltantes.length > 0) {
      emitir({
        tipo: "aviso",
        texto: `Ojo: quedan ${faltantes.length} hueco(s) por rellenar: ${faltantes.join(", ")}`,
      });
    }

    emitir({ tipo: "fin", ok: true, id, carpeta: dir, meta, html });
  } catch (e) {
    emitir({ tipo: "fin", ok: false, error: `Error inesperado: ${String(e)}` });
  }
}
