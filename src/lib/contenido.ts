/** Utilidades de contenido HTML (compartidas por motor y almacén). */

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
