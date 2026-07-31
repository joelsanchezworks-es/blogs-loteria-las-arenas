/** Construcción del prompt de generación que se pasa al CLI por stdin. */

export type Idioma = "es" | "ca" | "en";

export type EntradaPrompt = {
  texto: string;
  url: string | null;
  idioma: Idioma;
};

export type RutasPrompt = {
  reglas: string; // ruta absoluta a reglas-estilo.md
  plantilla: string; // ruta absoluta a plantilla-ejemplo.html
  post: string; // ruta absoluta donde escribir post.html
  meta: string; // ruta absoluta donde escribir meta.json
};

const IDIOMA_LARGO: Record<Idioma, string> = {
  es: "español natural de España (cercano, de tú; nada de traducción literal)",
  ca: "catalán natural",
  en: "inglés natural",
};

export function construirPrompt(entrada: EntradaPrompt, rutas: RutasPrompt): string {
  const urlLinea = entrada.url
    ? entrada.url
    : 'No se ha indicado URL. Usa href="#" en los CTA de compra (no inventes ninguna URL de destino).';

  return `Eres el redactor del blog de Lotería Las Arenas (Administración Oficial nº 336, C.C. Arenas de Barcelona). Tu trabajo es generar el HTML del cuerpo de un post, listo para pegar en el CMS, con EXACTAMENTE el mismo estilo y estructura de la plantilla de referencia.

PASO 1 — Lee estos dos archivos para interiorizar el estándar (OBLIGATORIO antes de escribir):
- Reglas de estilo (síguelas al pie de la letra): ${rutas.reglas}
- Plantilla de ejemplo (referencia literal de diseño): ${rutas.plantilla}

Replica el sistema visual de la plantilla: TODO con estilos inline (cero clases, cero <style>), misma paleta (#1b1d39 / #13152a / #caa669 / #f2f2f2), mismos módulos (hero, aviso de fecha, cajas, tabla de premios si procede, cita de Víctor, FAQ, CTA final, footer) y mismas constantes de negocio (dirección, teléfono, nº 336, historial de premios 2023-2025).

DATOS DE ESTE POST (ÚNICA fuente de datos; no inventes nada):
"""
${entrada.texto}
"""

- Idioma de salida: ${IDIOMA_LARGO[entrada.idioma]}. Escribe TODO el contenido en este idioma.
- URL de la página (destino de los CTA de compra): ${urlLinea}

REGLAS DURAS:
- Devuelve SOLO el HTML del cuerpo: empieza por el <div> wrapper exterior y termina cerrando los dos <div> + la coletilla legal +18. NADA de <!DOCTYPE>, <html>, <head>, <body>, ni vallas markdown (nada de \`\`\`), ni comentarios extra.
- Extensión: 900–1400 palabras salvo que las instrucciones pidan otra cosa.
- Estructura: entradilla que enganche, un <h2> por bloque temático (cada uno con su barrita dorada debajo), párrafos cortos, listas con flechas "→" solo si aportan, y una caja de CTA final grande.
- NO INVENTES DATOS. Fechas de sorteo, precios del décimo, importes de premio, plazos y condiciones SOLO pueden salir del bloque de datos de arriba. Si falta un dato clave, deja el hueco visible como [[FALTA: descripción]] (p. ej. [[FALTA: precio del décimo]]). Prefiere el hueco a inventar un dato.
- Imágenes: NO inventes URLs. Usa el bloque placeholder dorado punteado (reglas §9) con una descripción corta de qué imagen va ahí.
- Constantes de negocio: úsalas siempre tal cual están en las reglas (§1B). La cita de Víctor puede incluirse como voz recurrente.
- Cierre OBLIGATORIO: footer de Las Arenas y, como última línea, la coletilla legal +18 (§8.12), en el idioma del post.
- Sin promesas de ganar ni afirmaciones sobre probabilidades de acierto. Juego responsable, +18.

MÉTODO (síguelo EXACTAMENTE, sin pasos de más):
1) Lee el archivo de reglas de estilo.
2) Lee la plantilla de ejemplo.
3) Escribe post.html.
4) Escribe meta.json.
5) TERMINA.
No uses la herramienta Bash. No vuelvas a leer ni a "verificar" los archivos que ya has escrito. No hagas comprobaciones adicionales. Los DOS archivos son obligatorios; meta.json es imprescindible.

SALIDA — escribe DOS archivos con tu herramienta Write (sobrescribe si existen):

1) ${rutas.post}
   → SOLO el HTML del cuerpo del artículo (como se ha descrito arriba).

2) ${rutas.meta}
   → JSON válido, exactamente con estas claves:
{
  "titulo": "título humano del post (aprox. el texto del <h1>)",
  "metaTitle": "meta title SEO, MÁX 60 caracteres",
  "metaDescription": "meta description SEO, MÁX 155 caracteres",
  "idioma": "${entrada.idioma}",
  "palabras": <número aproximado de palabras del cuerpo, entero>,
  "faltantes": [<las descripciones de los [[FALTA: …]] que hayas dejado, o [] si no hay>]
}

Escribe primero post.html y después meta.json, y entonces TERMINA de inmediato. Lo que cuenta son los dos archivos, no lo que imprimas por pantalla.`;
}
