import { almacen } from "./almacen";
import { contarPalabras, detectarFaltantes, sanitizarEntrada } from "./contenido";
import { generar, type Emisor } from "./motor";
import { parsearContenido } from "./parseo";
import { ensamblarHtml } from "./plantilla-arenas";
import { construirPrompt, type Idioma } from "./prompt";
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
    // Limpia la entrada antes de nada: quita caracteres de control/invisibles,
    // normaliza saltos de línea y pasa comillas tipográficas a rectas. Así el
    // prompt (y el JSON del modelo) no se rompen con el calendario completo.
    const texto = sanitizarEntrada(entrada.texto);
    if (!texto.trim()) {
      emitir({ tipo: "fin", ok: false, error: "No hay contenido para generar." });
      return;
    }

    const { sistema, usuario } = construirPrompt({
      texto,
      url: entrada.url,
      idioma: entrada.idioma,
    });

    // El modelo devuelve SOLO el contenido en JSON (rápido, sin estilos).
    const salida = await generar(sistema, usuario, { emitir, signal });
    const datos = parsearContenido(salida);
    if (!datos) {
      emitir({ tipo: "fin", ok: false, error: "El modelo no devolvió un JSON de contenido válido." });
      return;
    }

    // La plantilla fija monta el HTML con el diseño (instantáneo, no depende del modelo).
    emitir({ tipo: "paso", texto: "Montando el HTML…" });
    const html = ensamblarHtml(datos, entrada.url);

    const palabras = contarPalabras(html);
    const faltantes = detectarFaltantes(html);
    const titulo = datos.titulo || "Post";
    const metaTitle = recortar(datos.metaTitle, 60);
    const metaDescription = recortar(datos.metaDescription, 155);

    const slug =
      (entrada.url ? slugDesdeUrl(entrada.url) : null) || crearSlug(primeraLinea(texto));
    // Sufijo de idioma para que los posts multi-idioma tengan ids distintos y
    // autodescriptivos (el español, idioma por defecto, se queda sin sufijo).
    const sufijoIdioma = entrada.idioma !== "es" ? `-${entrada.idioma}` : "";
    const idSugerido = `${fechaCorta()}-${slug}${sufijoIdioma}`;

    emitir({ tipo: "paso", texto: "Guardando…" });
    const resumen = await almacen.guardar(
      {
        titulo,
        html,
        metaTitle,
        metaDescription,
        tema: texto,
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
