import { promises as fs } from "node:fs";
import path from "node:path";
import { ejecutarClaude } from "./claude";
import { extraerTexto } from "./archivos";
import { construirPrompt, type FuentePrompt, type Idioma } from "./prompt";
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

export type FuenteGeneracion =
  | { tipo: "texto"; texto: string }
  | { tipo: "archivo"; ruta: string; nombre: string };

export type EntradaGeneracion = {
  fuente: FuenteGeneracion;
  url: string | null;
  idioma: Idioma;
  modo?: "texto" | "archivo" | "mixto";
  /** Ruta temporal del archivo original a copiar en la carpeta del post. */
  archivoOrigenTmp?: string | null;
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

/** Lanza el CLI con un prompt y devuelve el HTML válido escrito (o null) + el resultado. */
async function lanzar(
  prompt: string,
  rutaPost: string,
  emitir: Emisor,
  signal?: AbortSignal,
): Promise<{ html: string | null; error?: string; okCli: boolean }> {
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
  let bruto: string | null = null;
  try {
    bruto = await fs.readFile(rutaPost, "utf8");
  } catch {
    bruto = null;
  }
  const html = bruto ? limpiarHtml(bruto) : "";
  return { html: html || null, error: res.error, okCli: res.ok };
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

    // 1) Slug + carpeta única
    const fecha = fechaCorta();
    const slugBase =
      (entrada.url ? slugDesdeUrl(entrada.url) : null) ||
      (entrada.fuente.tipo === "texto"
        ? crearSlug(primeraLinea(entrada.fuente.texto))
        : crearSlug(path.parse(entrada.fuente.nombre).name));
    const { id, dir } = await crearCarpetaUnica(fecha, slugBase);
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
        /* si falla la copia, seguimos sin bloquear */
      }
    }

    // 3) Prompt + ejecución (con respaldo de extracción si es archivo)
    const rutas = {
      reglas: path.join(DIR_REFERENCIAS, "reglas-estilo.md"),
      plantilla: path.join(DIR_REFERENCIAS, "plantilla-ejemplo.html"),
      post: path.join(dir, "post.html"),
      meta: path.join(dir, "meta.json"),
    };

    const fuentePrompt: FuentePrompt =
      entrada.fuente.tipo === "archivo"
        ? { tipo: "archivo", ruta: entrada.fuente.ruta }
        : { tipo: "texto", texto: entrada.fuente.texto };

    emitir({ tipo: "paso", texto: "Lanzando el generador…" });
    let { html, error, okCli } = await lanzar(
      construirPrompt({ fuente: fuentePrompt, url: entrada.url, idioma: entrada.idioma }, rutas),
      rutas.post,
      emitir,
      signal,
    );

    // Respaldo: si era archivo y el CLI no consiguió escribir un post válido,
    // extraemos el texto con unpdf/mammoth y reintentamos como texto.
    if (!html && entrada.fuente.tipo === "archivo") {
      emitir({
        tipo: "aviso",
        texto: "El CLI no pudo leer el archivo directamente; usando el extractor de respaldo…",
      });
      try {
        const texto = (await extraerTexto(entrada.fuente.ruta)).trim();
        if (texto) {
          const r2 = await lanzar(
            construirPrompt(
              { fuente: { tipo: "texto", texto }, url: entrada.url, idioma: entrada.idioma },
              rutas,
            ),
            rutas.post,
            emitir,
            signal,
          );
          html = r2.html;
          error = r2.error;
          okCli = r2.okCli;
        }
      } catch (e) {
        emitir({ tipo: "aviso", texto: `El extractor de respaldo falló: ${String(e)}` });
      }
    }

    if (!html) {
      emitir({
        tipo: "fin",
        ok: false,
        error: error || "El generador no escribió un post.html válido.",
      });
      return;
    }
    if (!okCli) {
      emitir({
        tipo: "aviso",
        texto:
          "El generador avisó de un problema (posible tope de turnos), pero el post se escribió correctamente.",
      });
    }

    // 4) Meta del modelo (tolerante) + normalización canónica
    let metaModelo: Record<string, unknown> = {};
    try {
      metaModelo = obj(JSON.parse(await fs.readFile(rutas.meta, "utf8")));
    } catch {
      emitir({ tipo: "aviso", texto: "meta.json no era JSON válido; se reconstruye." });
    }

    const palabras = contarPalabras(html);
    const faltantes = detectarFaltantes(html);
    const temaEntrada =
      entrada.fuente.tipo === "texto"
        ? entrada.fuente.texto
        : `Archivo: ${entrada.fuente.nombre}`;

    const meta: Meta = {
      id,
      slug: slugBase,
      titulo: str(metaModelo.titulo) || tituloDesdeHtml(html) || slugBase,
      metaTitle: recortar(str(metaModelo.metaTitle), 60),
      metaDescription: recortar(str(metaModelo.metaDescription), 155),
      temaEntrada,
      urlDestino: entrada.url,
      idioma: entrada.idioma,
      fecha: new Date().toISOString(),
      modo: entrada.modo ?? (entrada.fuente.tipo === "archivo" ? "archivo" : "texto"),
      archivoOrigen,
      palabras,
      faltantes,
      version: 1,
    };

    await fs.writeFile(rutas.meta, JSON.stringify(meta, null, 2) + "\n", "utf8");
    const brutoActual = await fs.readFile(rutas.post, "utf8").catch(() => "");
    if (html !== brutoActual) await fs.writeFile(rutas.post, html + "\n", "utf8");
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
