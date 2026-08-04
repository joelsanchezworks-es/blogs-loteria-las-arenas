import { limpiarHtml } from "./contenido";

/** Salida esperada del modelo: bloque META (JSON) + bloque HTML, con marcadores. */
export type SalidaGeneracion = {
  html: string;
  titulo: string;
  metaTitle: string;
  metaDescription: string;
  faltantes: string[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function limpiarVallas(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

/** Parsea la salida delimitada `===META===` / `===HTML===`. Tolerante a fallos. */
export function parsearSalida(salida: string): SalidaGeneracion {
  const iMeta = salida.indexOf("===META===");
  const iHtml = salida.indexOf("===HTML===");

  let metaObj: Record<string, unknown> = {};
  let htmlBruto = salida;

  if (iHtml >= 0) {
    htmlBruto = salida.slice(iHtml + "===HTML===".length);
    if (iMeta >= 0 && iMeta < iHtml) {
      const metaRaw = salida.slice(iMeta + "===META===".length, iHtml);
      try {
        metaObj = JSON.parse(limpiarVallas(metaRaw));
      } catch {
        /* meta ilegible: se reconstruye aguas arriba */
      }
    }
  }

  return {
    html: limpiarHtml(htmlBruto),
    titulo: str(metaObj.titulo),
    metaTitle: str(metaObj.metaTitle),
    metaDescription: str(metaObj.metaDescription),
    faltantes: Array.isArray(metaObj.faltantes)
      ? metaObj.faltantes.map((x) => String(x).trim()).filter(Boolean)
      : [],
  };
}

/** Parsea la lista de temas (Modo B): un array JSON de { titulo, datosClave }. */
export function parsearTemas(salida: string): { titulo: string; datosClave: string }[] {
  const limpio = limpiarVallas(salida);
  // Intenta el array completo; si viene envuelto, busca el primer corchete.
  let datos: unknown;
  try {
    datos = JSON.parse(limpio);
  } catch {
    const i = limpio.indexOf("[");
    const j = limpio.lastIndexOf("]");
    if (i >= 0 && j > i) {
      try {
        datos = JSON.parse(limpio.slice(i, j + 1));
      } catch {
        datos = null;
      }
    }
  }
  const arr = Array.isArray(datos)
    ? datos
    : Array.isArray((datos as { temas?: unknown[] } | null)?.temas)
      ? (datos as { temas: unknown[] }).temas
      : [];
  return arr
    .map((t) => {
      const o = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
      return {
        titulo: str(o.titulo),
        datosClave: str(o.datosClave) || str(o.datos),
      };
    })
    .filter((t) => t.titulo);
}
