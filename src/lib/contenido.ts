/** Utilidades de contenido HTML (compartidas por motor y almacén). */

/**
 * Sanitiza el texto de entrada del usuario antes de mandarlo al modelo:
 * normaliza saltos de línea, elimina caracteres de control/invisibles y pasa las
 * comillas tipográficas a rectas. NO toca la puntuación válida en español
 * (¿ ¡ tildes, €, —, ·): funciona igual con textos cortos y con el calendario largo.
 */
export function sanitizarEntrada(texto: string): string {
  if (!texto) return "";
  return texto
    .replace(/\uFEFF/g, "") // BOM
    .replace(/\r\n?/g, "\n") // CRLF / CR -> LF
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'") // comillas simples curvas -> '
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"') // comillas dobles curvas -> "
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // control (deja \n y \t)
    .replace(/[\u200B\u200C\u200D\u2060]/g, "") // caracteres de ancho cero
    .replace(/[ \t]+\n/g, "\n") // espacios al final de cada linea
    .replace(/\n{3,}/g, "\n\n") // 3+ saltos seguidos -> 2
    .replace(/"{3,}/g, '"') // evita chocar con el delimitador """ del prompt
    .trim();
}

export function contarPalabras(html: string): number {
  const txt = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ");
  return txt.trim().split(/\s+/).filter(Boolean).length;
}

export function detectarFaltantes(html: string): string[] {
  const out: string[] = [];
  const re = /\[\[FALTA:([^\]]*)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1].trim());
  return Array.from(new Set(out));
}

/** Quita vallas markdown (```html … ```) que el modelo no debería poner. */
export function limpiarHtml(html: string): string {
  return html
    .trim()
    .replace(/^```(?:html)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

export function tituloDesdeHtml(html: string): string | null {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim() || null;
}
