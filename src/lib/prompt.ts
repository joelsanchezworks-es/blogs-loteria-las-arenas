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

/** Lee reglas-estilo.md (se muestra en la pestaña Reglas de la app). */
export async function leerReferencias(): Promise<Referencias> {
  const [reglas, plantilla] = await Promise.all([
    fs.readFile(path.join(DIR_REFERENCIAS, "reglas-estilo.md"), "utf8").catch(() => ""),
    fs.readFile(path.join(DIR_REFERENCIAS, "plantilla-ejemplo.html"), "utf8").catch(() => ""),
  ]);
  return { reglas, plantilla };
}

/**
 * Prompt de generación. El modelo devuelve SOLO el CONTENIDO en JSON (texto);
 * el HTML con el diseño lo monta después una plantilla fija (plantilla-arenas.ts).
 * Así la respuesta del modelo es pequeña (sin estilos) y rápida: sin timeout.
 */
export function construirPrompt(entrada: EntradaPrompt): { sistema: string; usuario: string } {
  const sistema = `Eres el redactor del blog de Lotería Las Arenas (Administración Oficial nº 336, C.C. Arenas de Barcelona). Escribes el CONTENIDO de un post (solo texto). Una plantilla fija convertirá tu texto en HTML con el diseño de la casa: TÚ NO generas HTML ni estilos, SOLO un objeto JSON con el texto.

DATOS DE NEGOCIO (fijos; úsalos, no los inventes ni cambies):
- Administración Oficial nº 336, C.C. Arenas de Barcelona · Gran Via de les Corts Catalanes 373-385, L-S28, 08015 Barcelona · Tel. 934 247 349.
- Historial de premios (prueba social, real): 2023 El Gordo y cuatro quintos de Navidad; 2024 tercer, cuarto y quinto de Navidad; 2025 segundo premio del Niño.
- Testimonio recurrente: Víctor, el lotero de referencia (su firma la añade la plantilla).

REGLAS DE CONTENIDO:
- Extensión: artículo completo de 1.500–2.000 palabras de texto visible, repartidas entre las secciones; desarrolla cada una con varios párrafos, sin relleno ni ideas repetidas.
- NO INVENTES DATOS. Fechas de sorteo, precios del décimo, importes y plazos SOLO salen de los datos del post. Si falta un dato clave, escríbelo como [[FALTA: descripción]] dentro del texto. Prefiere el hueco a inventar.
- Marca en dorado los DATOS envolviéndolos entre dobles asteriscos: **22 de diciembre**, **20€**, **400.000€**. Solo los datos concretos (fechas, precios, importes, cifras), no frases enteras.
- Español natural de España (o el idioma pedido), de tú, cercano. Vende la ilusión, no la probabilidad. Sin promesas de ganar. Juego responsable, +18 (la coletilla la pone la plantilla).
- Incluye la keyword principal en el título del hero y en la intro.

FORMATO DE SALIDA (OBLIGATORIO): devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto antes ni después, sin vallas markdown. Estructura exacta:
{
  "titulo": "título humano del post",
  "metaTitle": "meta title SEO, máx 60 caracteres",
  "metaDescription": "meta description SEO, máx 155 caracteres",
  "hero": {"kicker":"ANTETÍTULO breve en mayúsculas","titulo":"título H1 con la keyword","lead":"frase gancho de 1-2 líneas","imagen":"descripción corta de la imagen del hero"},
  "intro": "párrafo de entrada, con la keyword",
  "aviso": "línea de datos clave si los hay (p. ej. 'Sorteo: **…** · Décimo: **…** · Administración Oficial nº 336'), o cadena vacía si no hay datos concretos",
  "ventajas": {"titulo":"H2 (por qué Las Arenas)","parrafos":["…","…"],"puntos":["**Décimo original:** …","**Sin comisiones:** …","**Aviso de premios:** …"]},
  "comoComprar": {"titulo":"H2 (cómo comprar)","parrafos":["…","…"]},
  "cita": "testimonio de Víctor, 1-2 frases",
  "faqs": [{"q":"pregunta","a":"respuesta"}],
  "ctaFinal": {"kicker":"Lotería Las Arenas","titulo":"titular de cierre","texto":"1-2 frases","fineprint":"Décimo … · Sin comisiones · Administración Oficial nº 336"},
  "faltantes": ["descripciones de los [[FALTA: …]] que hayas dejado; vacío si no hay"]
}
En "faqs" pon EXACTAMENTE 4 preguntas. No añadas más claves ni HTML.`;

  const urlLinea = entrada.url ?? "no se ha indicado";
  const usuario = `DATOS DE ESTE POST (única fuente de datos; no inventes nada):
"""
${entrada.texto}
"""

Idioma de salida: ${IDIOMA_LARGO[entrada.idioma]}. Escribe TODO el contenido en ese idioma.
URL de la página (informativa; el CTA la usa la plantilla): ${urlLinea}

Devuelve ahora SOLO el objeto JSON.`;

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
