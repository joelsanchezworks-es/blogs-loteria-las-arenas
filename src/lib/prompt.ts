import { promises as fs } from "node:fs";
import path from "node:path";

export type Idioma = "es" | "ca" | "en";

export type EntradaPrompt = {
  /** Datos del post: texto escrito o texto extraído de un archivo. */
  texto: string;
  url: string | null;
  idioma: Idioma;
};

const IDIOMA_LARGO: Record<Idioma, string> = {
  es: "español natural de España (cercano, de tú; nada de traducción literal)",
  ca: "catalán natural",
  en: "inglés natural",
};

const DIR_REFERENCIAS = path.join(process.cwd(), "referencias");

export type Referencias = { reglas: string; plantilla: string };

/** Lee reglas-estilo.md y plantilla-ejemplo.html para inyectarlas en el prompt. */
export async function leerReferencias(): Promise<Referencias> {
  const [reglas, plantilla] = await Promise.all([
    fs.readFile(path.join(DIR_REFERENCIAS, "reglas-estilo.md"), "utf8").catch(() => ""),
    fs.readFile(path.join(DIR_REFERENCIAS, "plantilla-ejemplo.html"), "utf8").catch(() => ""),
  ]);
  return { reglas, plantilla };
}

/**
 * Construye el prompt de generación. Devuelve una parte `sistema` (estable, con
 * las reglas + la plantilla + el formato de salida — se cachea) y una parte
 * `usuario` (los datos concretos del post).
 */
export function construirPrompt(
  entrada: EntradaPrompt,
  refs: Referencias,
): { sistema: string; usuario: string } {
  const sistema = `Eres el redactor del blog de Lotería Las Arenas (Administración Oficial nº 336, C.C. Arenas de Barcelona). Generas el HTML del cuerpo de un post usando las CLASES de arenas.css (el diseño ya está en ese CSS global de GAdmin): tú generas SOLO el contenido con clases, con la misma estructura de la plantilla de referencia.

===== REGLAS DE ESTILO (síguelas al pie de la letra) =====
${refs.reglas}

===== PLANTILLA DE EJEMPLO (referencia literal de diseño) =====
${refs.plantilla}

===== NORMAS DURAS =====
- CLASES, NO estilos inline. Usa las clases de arenas.css (ver reglas y plantilla): CERO atributos style, cero <style>, cero clases inventadas. El diseño ya está en el CSS global; el HTML es solo contenido con clases.
- El HTML es SOLO el cuerpo del artículo: empieza por <div class="arenas-post"><div class="arenas-inner"> y termina cerrando esos dos <div> tras la coletilla +18. NADA de <!DOCTYPE>, <html>, <head>, <body>, ni vallas markdown, ni comentarios.
- EXTENSIÓN (requisito OBLIGATORIO y prioritario): artículo LARGO y exhaustivo, objetivo 2.500 palabras de texto visible, MÍNIMO 2.000. Un post más corto se considera un ERROR grave: NO cierres el HTML hasta superar las 2.000 palabras. Desarrolla CADA sección con 3–5 párrafos sustanciales (contexto, historia del sorteo, pasos detallados, ejemplos, matices, consejos), sin relleno ni ideas repetidas. Antes de cerrar, VERIFICA mentalmente que superas las 2.000 palabras; si te quedas corto, AMPLÍA el desarrollo real de las secciones. Como el HTML ya no lleva estilos inline, el copy largo NO penaliza el tiempo de generación.
- ESTRUCTURA FIJA — TODAS estas secciones, en este orden (clase entre paréntesis):
  1) HERO (div.hero): div.rule + p.kicker + <h1> con la keyword + p.lead + a.cta + div.img-ph.
  2) INTRO: p.intro con la keyword; si hay fecha/precio, una caja div.aviso con esos datos.
  3) VENTAJAS: <h2> + 2–4 párrafos y/o p.arrow (oficialidad, sin comisiones, décimo original, historial §1B).
  4) CÓMO COMPRAR: <h2> + pasos (online con el CTA a la URL, o en la administración); cierra con div.cta-wrap.
  5) CITA DE VÍCTOR: div.quote con la cita + p.by "Víctor — Lotería Las Arenas, Adm. nº 336 · Barcelona".
  6) FAQs: 4 × <details class="faq"><summary>…</summary><div class="a"><p>…</p></div></details>.
  7) CTA FINAL (div.cta-final): div.rule + p.kicker + <h2> + <p> + a.cta + p.fineprint.
  8) FOOTER (div.footer) + coletilla +18 (p.legal) como última línea.
- La barrita bajo los <h2>, el marcador +/– de las FAQ y la comilla de la cita los pone el CSS solo: NO los escribas a mano.
- Datos (fechas, precios, importes) en dorado con <span class="g"> o <strong class="g">; nombres/términos en <strong> (blanco).
- NO INVENTES DATOS. Fechas, precios, importes, plazos y condiciones SOLO salen del input. Si falta un dato clave, hueco visible [[FALTA: descripción]]. Prefiere el hueco a inventar.
- Imágenes: no inventes URLs; usa div.img-ph. Constantes de negocio (§1B): úsalas siempre. CTA de compra a la URL de la página; si no hay, href="#". Sin promesas de ganar. Juego responsable, +18.

===== FORMATO DE SALIDA (OBLIGATORIO) =====
Devuelve EXACTAMENTE este formato y NADA más (sin texto antes ni después, sin vallas markdown):
===META===
{"titulo":"título humano del post","metaTitle":"meta title SEO, máx 60 caracteres","metaDescription":"meta description SEO, máx 155 caracteres","faltantes":["descripciones de los [[FALTA: …]] que hayas dejado, o vacío"]}
===HTML===
<div class="arenas-post"><div class="arenas-inner">…el cuerpo del artículo con clases…</div></div>`;

  const urlLinea = entrada.url
    ? entrada.url
    : 'No se ha indicado URL. Usa href="#" en los CTA de compra (no inventes ninguna URL).';

  const usuario = `DATOS DE ESTE POST (única fuente de datos; no inventes nada):
"""
${entrada.texto}
"""

Idioma de salida: ${IDIOMA_LARGO[entrada.idioma]}. Escribe TODO el contenido en este idioma.
URL de la página (destino de los CTA de compra): ${urlLinea}

Genera ahora el post siguiendo EXACTAMENTE el formato de salida (===META=== y ===HTML===).`;

  return { sistema, usuario };
}

/** Prompt de detección de temas (Modo B). Un solo texto. */
export function construirPromptDeteccion(texto: string): string {
  return `Eres el editor del blog de Lotería Las Arenas. El siguiente texto contiene VARIOS temas para el blog (por ejemplo un calendario editorial o varios sorteos). Detéctalos y sepáralos.

"""
${texto}
"""

Devuelve SOLO un JSON válido y NADA más: un array de objetos, uno por tema, con las claves:
[{"titulo":"título breve del tema","datosClave":"los datos esenciales en una o dos frases: fechas, precios, importes… tal como aparecen en el texto"}]

No inventes datos: usa solo lo que aparezca en el texto. No generes ningún post, solo la lista.`;
}
