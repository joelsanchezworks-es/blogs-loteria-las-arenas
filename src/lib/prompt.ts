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
  const sistema = `Eres el redactor del blog de Lotería Las Arenas (Administración Oficial nº 336, C.C. Arenas de Barcelona). Generas el HTML del cuerpo de un post, listo para pegar en el CMS, con EXACTAMENTE el mismo estilo y estructura de la plantilla de referencia.

===== REGLAS DE ESTILO (síguelas al pie de la letra) =====
${refs.reglas}

===== PLANTILLA DE EJEMPLO (referencia literal de diseño) =====
${refs.plantilla}

===== NORMAS DURAS =====
- Todo el estilo va inline (cero clases, cero <style>). Misma paleta que la plantilla (#1b1d39 / #13152a / #caa669 / #f2f2f2) y mismos módulos.
- El HTML es SOLO el cuerpo del artículo: empieza por el <div> wrapper exterior y termina cerrando los dos <div> + la coletilla legal +18. NADA de <!DOCTYPE>, <html>, <head>, <body>, ni vallas markdown, ni comentarios extra.
- EXTENSIÓN (requisito OBLIGATORIO y prioritario): el post DEBE tener AL MENOS 2.500 palabras de texto visible. Es una guía larga y exhaustiva, escrita a propósito con mucho detalle. Un post corto se considera un ERROR; no cierres hasta superar las 2.500 palabras.
  · Desarrolla CADA sección con 3–5 párrafos sustanciales (no uno). Aporta contexto, explicaciones paso a paso, ejemplos, historia del sorteo, comparativas y matices útiles en cada bloque.
  · Da cuerpo con módulos y sub-bloques de las reglas: caja destacada (§8.3), tarjeta oscura (§8.4), tabla de premios (§8.7 si hay importes), sub-secciones con <h3> (§4). Sin inventar datos.
  · Las 5–6 FAQs, con respuestas completas de 2–4 frases.
  · Antes de cerrar, verifica que superas las 2.500 palabras; si te quedas corto, AMPLÍA las secciones con más desarrollo real y útil (nunca relleno repetido).
  · Estilos inline de la plantilla; puedes usar hex corto (cuerpo #b8b8b8, notas #8f8f8f, dorado #caa669, claro #f2f2f2, tarjeta #13152a). La prioridad es un texto extenso y de calidad.
- ESTRUCTURA FIJA — incluye TODAS estas secciones, en este orden, sin añadir otras:
  1) HERO (§8.1): barrita + antetítulo + <h1> + lead dorado + botón CTA + placeholder de imagen (§9).
  2) INTRO: un párrafo lead con barra dorada (§5.2); si hay fecha/precio, añade el aviso de datos clave (§8.2).
  3) VENTAJAS: <h2> con su barrita + 2–3 ventajas breves (por qué Las Arenas: oficialidad, sin comisiones, décimo original, historial §1B), con flechas → (§7) o caja destacada (§8.3).
  4) CÓMO COMPRAR: <h2> con su barrita + pasos concisos (online con el CTA a la URL, o en la administración).
  5) CITA DE VÍCTOR (§8.8): tarjeta oscura con su testimonio, firmada "Víctor — Lotería Las Arenas, Adm. nº 336 · Barcelona".
  6) FAQs: 5–6 preguntas frecuentes (§8.9, acordeón <details>), con respuestas desarrolladas de 2–3 frases cada una.
  7) CTA FINAL (§8.10): caja grande de cierre con botón sólido.
  8) FOOTER (§8.11) + coletilla legal +18 (§8.12) como última línea.
- Desarrolla TODAS las secciones por completo hasta alcanzar las 2.500+ palabras. Nunca elimines una sección ni dejes el HTML a medias.
- NO INVENTES DATOS. Fechas de sorteo, precios del décimo, importes de premio, plazos y condiciones SOLO salen de los datos del post. Si falta un dato clave, deja el hueco visible como [[FALTA: descripción]]. Prefiere el hueco a inventar.
- Imágenes: NO inventes URLs; usa el bloque placeholder dorado punteado de las reglas (§9).
- Constantes de negocio (§1B): úsalas siempre (dirección, teléfono, nº 336, historial de premios, voz de Víctor).
- Cierre obligatorio: footer de Las Arenas + coletilla legal +18 (§8.12) como última línea, en el idioma del post.
- CTA de compra hacia la URL de la página; si no hay URL, href="#".
- Sin promesas de ganar ni afirmaciones sobre probabilidades. Juego responsable, +18.

===== FORMATO DE SALIDA (OBLIGATORIO) =====
Devuelve EXACTAMENTE este formato y NADA más (sin texto antes ni después, sin vallas markdown):
===META===
{"titulo":"título humano del post","metaTitle":"meta title SEO, máx 60 caracteres","metaDescription":"meta description SEO, máx 155 caracteres","faltantes":["descripciones de los [[FALTA: …]] que hayas dejado, o vacío"]}
===HTML===
<div ...>…el cuerpo del artículo…</div>`;

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
