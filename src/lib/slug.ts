/** Utilidades de slug y fecha para nombrar las carpetas del historial. */

export function crearSlug(texto: string): string {
  const base = (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base || "post";
}

/** Deriva un slug del último segmento de una URL, si es válida. */
export function slugDesdeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean).pop();
    return seg ? crearSlug(decodeURIComponent(seg)) : null;
  } catch {
    return null;
  }
}

/** Primera línea/frase útil de un texto (para el slug cuando no hay URL). */
export function primeraLinea(texto: string): string {
  const linea =
    (texto || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  // corta en el primer separador fuerte para quedarnos con el tema principal
  return linea.split(/[—:|]|\s-\s/)[0].trim() || linea;
}

/** Fecha corta local YYYY-MM-DD. */
export function fechaCorta(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
