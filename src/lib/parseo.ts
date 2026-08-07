import { limpiarHtml } from "./contenido";
import type { ContenidoPost } from "./plantilla-arenas";

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

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

/**
 * Sustituye por espacios los caracteres de control crudos (saltos de línea o
 * tabuladores sin escapar dentro de las cadenas) que el modelo a veces mete y
 * que rompen JSON.parse. En JSON válido esos caracteres van escapados (\n, \t),
 * así que los crudos son siempre ilegales y pueden neutralizarse sin peligro.
 */
function quitarControl(s: string): string {
  return s.replace(/[\u0000-\u001F\u007F]/g, " ");
}

/** Extrae el primer objeto/array JSON {...} o [...] envuelto en otro texto. */
function extraerBloque(s: string, abre: "{" | "["): string | null {
  const cierra = abre === "{" ? "}" : "]";
  const i = s.indexOf(abre);
  const j = s.lastIndexOf(cierra);
  return i >= 0 && j > i ? s.slice(i, j + 1) : null;
}

/**
 * Intenta parsear JSON con varias reparaciones tolerantes (tal cual, sin
 * caracteres de control, y extrayendo el bloque envuelto). Devuelve el primer
 * resultado del tipo esperado (objeto o array) o null.
 */
function parsearJsonTolerante(salida: string, tipo: "objeto" | "array"): unknown {
  const abre = tipo === "objeto" ? "{" : "[";
  const limpio = limpiarVallas(salida);
  const candidatos = [limpio, quitarControl(limpio)];
  const bloque = extraerBloque(limpio, abre);
  if (bloque) candidatos.push(bloque, quitarControl(bloque));

  for (const c of candidatos) {
    try {
      const d = JSON.parse(c);
      const ok = tipo === "array" ? Array.isArray(d) : d && typeof d === "object";
      if (ok) return d;
    } catch {
      /* siguiente candidato */
    }
  }
  return null;
}

/** Parsea el CONTENIDO del post (objeto JSON del modelo) en ContenidoPost. */
export function parsearContenido(salida: string): ContenidoPost | null {
  const datos = parsearJsonTolerante(salida, "objeto");
  if (!datos || typeof datos !== "object") return null;
  const o = datos as Record<string, unknown>;
  const hero = obj(o.hero);
  const ventajas = obj(o.ventajas);
  const comoComprar = obj(o.comoComprar);
  const ctaFinal = obj(o.ctaFinal);
  const faqs = (Array.isArray(o.faqs) ? o.faqs : [])
    .map((f) => {
      const fo = obj(f);
      return { q: str(fo.q) || str(fo.pregunta), a: str(fo.a) || str(fo.respuesta) };
    })
    .filter((f) => f.q);
  const titulo = str(o.titulo) || str(hero.titulo);
  // Necesitamos, como mínimo, un título y algo de cuerpo.
  if (!titulo && !str(o.intro) && faqs.length === 0) return null;

  return {
    titulo: titulo || "Post",
    metaTitle: str(o.metaTitle),
    metaDescription: str(o.metaDescription),
    hero: {
      kicker: str(hero.kicker),
      titulo: str(hero.titulo) || titulo || "Post",
      lead: str(hero.lead),
      imagen: str(hero.imagen),
    },
    intro: str(o.intro),
    aviso: str(o.aviso),
    ventajas: {
      titulo: str(ventajas.titulo),
      parrafos: arr(ventajas.parrafos),
      puntos: arr(ventajas.puntos),
    },
    comoComprar: { titulo: str(comoComprar.titulo), parrafos: arr(comoComprar.parrafos) },
    cita: str(o.cita),
    faqs,
    ctaFinal: {
      kicker: str(ctaFinal.kicker),
      titulo: str(ctaFinal.titulo),
      texto: str(ctaFinal.texto),
      fineprint: str(ctaFinal.fineprint),
    },
    faltantes: arr(o.faltantes),
  };
}

/** Parsea la lista de temas (Modo B): un array JSON de { titulo, datosClave }. */
export function parsearTemas(salida: string): { titulo: string; datosClave: string }[] {
  // Puede venir como array suelto o envuelto en { temas: [...] }.
  const datos = parsearJsonTolerante(salida, "array") ?? parsearJsonTolerante(salida, "objeto");
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
