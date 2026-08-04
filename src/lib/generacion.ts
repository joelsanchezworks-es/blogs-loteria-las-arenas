import { almacen } from "./almacen";
import { contarPalabras, detectarFaltantes, tituloDesdeHtml } from "./contenido";
import { generar, type Emisor } from "./motor";
import { parsearSalida } from "./parseo";
import { construirPrompt, leerReferencias, type Idioma } from "./prompt";
import { crearSlug, fechaCorta, primeraLinea, slugDesdeUrl } from "./slug";

export type EntradaGeneracion = {
  /** Texto del post (escrito por el usuario o extraído de un archivo). */
  texto: string;
  url: string | null;
  idioma: Idioma;
  modo?: "texto" | "archivo" | "mixto" | "tema";
};

function recortar(v: string, max: number): string {
  return v.length > max ? v.slice(0, max).trim() : v;
}

/**
 * Genera un post (motor API o CLI según el modo) y lo guarda en el almacén
 * activo (Postgres o archivos). Emite eventos de progreso; nunca lanza.
 */
export async function ejecutarTrabajo(
  entrada: EntradaGeneracion,
  { emitir, signal }: { emitir: Emisor; signal?: AbortSignal },
): Promise<void> {
  try {
    if (!entrada.texto.trim()) {
      emitir({ tipo: "fin", ok: false, error: "No hay contenido para generar." });
      return;
    }

    const refs = await leerReferencias();
    const { sistema, usuario } = construirPrompt(
      { texto: entrada.texto, url: entrada.url, idioma: entrada.idioma },
      refs,
    );

    const salida = await generar(sistema, usuario, { emitir, signal });
    const parsed = parsearSalida(salida);
    const html = parsed.html;
    if (!html) {
      emitir({ tipo: "fin", ok: false, error: "El modelo no devolvió un HTML válido." });
      return;
    }

    const palabras = contarPalabras(html);
    const faltantes = detectarFaltantes(html);
    const titulo = parsed.titulo || tituloDesdeHtml(html) || "Post";
    const metaTitle = recortar(parsed.metaTitle, 60);
    const metaDescription = recortar(parsed.metaDescription, 155);

    const slug =
      (entrada.url ? slugDesdeUrl(entrada.url) : null) || crearSlug(primeraLinea(entrada.texto));
    const idSugerido = `${fechaCorta()}-${slug}`;

    emitir({ tipo: "paso", texto: "Guardando…" });
    const resumen = await almacen.guardar(
      {
        titulo,
        html,
        metaTitle,
        metaDescription,
        tema: entrada.texto,
        urlDestino: entrada.url,
        idioma: entrada.idioma,
        palabras,
        tieneFaltantes: faltantes.length > 0,
      },
      idSugerido,
    );

    if (faltantes.length > 0) {
      emitir({
        tipo: "aviso",
        texto: `Ojo: quedan ${faltantes.length} hueco(s) por rellenar: ${faltantes.join(", ")}`,
      });
    }

    emitir({
      tipo: "fin",
      ok: true,
      id: resumen.id,
      html,
      meta: { id: resumen.id, titulo, metaTitle, metaDescription, palabras, faltantes },
    });
  } catch (e) {
    emitir({ tipo: "fin", ok: false, error: `Error: ${e instanceof Error ? e.message : String(e)}` });
  }
}
