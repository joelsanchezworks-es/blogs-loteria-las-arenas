import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * "Base de datos" = sistema de archivos + index.json.
 * Cada post vive en historial/<fecha>-<slug>/ con post.html + meta.json (+ origen).
 */

export const RAIZ = process.cwd();
export const DIR_HISTORIAL = path.join(RAIZ, "historial");
export const RUTA_INDEX = path.join(DIR_HISTORIAL, "index.json");
export const DIR_REFERENCIAS = path.join(RAIZ, "referencias");

export type Meta = {
  id: string;
  slug: string;
  titulo: string;
  metaTitle: string;
  metaDescription: string;
  temaEntrada: string;
  urlDestino: string | null;
  idioma: string;
  fecha: string;
  modo: string;
  archivoOrigen: string | null;
  palabras: number;
  faltantes: string[];
  version: number;
};

export type EntradaIndice = {
  id: string;
  titulo: string;
  idioma: string;
  fecha: string;
  urlDestino: string | null;
  metaTitle: string;
  metaDescription: string;
  palabras: number;
  tieneFaltantes: boolean;
  archivoOrigen: string | null;
};

export type Indice = { actualizado: string | null; posts: EntradaIndice[] };

export async function leerIndice(): Promise<Indice> {
  try {
    const bruto = await fs.readFile(RUTA_INDEX, "utf8");
    const datos = JSON.parse(bruto) as Partial<Indice>;
    return {
      actualizado: datos.actualizado ?? null,
      posts: Array.isArray(datos.posts) ? datos.posts : [],
    };
  } catch {
    return { actualizado: null, posts: [] };
  }
}

/** Crea una carpeta única historial/<fecha>-<slug>[-n] y devuelve su id y ruta. */
export async function crearCarpetaUnica(
  fecha: string,
  slug: string,
): Promise<{ id: string; dir: string }> {
  await fs.mkdir(DIR_HISTORIAL, { recursive: true });
  let id = `${fecha}-${slug}`;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const dir = path.join(DIR_HISTORIAL, id);
    try {
      await fs.mkdir(dir, { recursive: false });
      return { id, dir };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") {
        id = `${fecha}-${slug}-${n++}`;
        continue;
      }
      throw e;
    }
  }
}

/** Inserta o actualiza la entrada del índice a partir del meta. */
export async function upsertIndice(meta: Meta): Promise<void> {
  await fs.mkdir(DIR_HISTORIAL, { recursive: true });
  const idx = await leerIndice();
  const entrada: EntradaIndice = {
    id: meta.id,
    titulo: meta.titulo,
    idioma: meta.idioma,
    fecha: meta.fecha,
    urlDestino: meta.urlDestino,
    metaTitle: meta.metaTitle,
    metaDescription: meta.metaDescription,
    palabras: meta.palabras,
    tieneFaltantes: meta.faltantes.length > 0,
    archivoOrigen: meta.archivoOrigen,
  };
  const otros = idx.posts.filter((p) => p.id !== meta.id);
  const posts = [entrada, ...otros].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const salida: Indice = { actualizado: new Date().toISOString(), posts };
  await fs.writeFile(RUTA_INDEX, JSON.stringify(salida, null, 2) + "\n", "utf8");
}

/* ── Utilidades de contenido ── */

/** Recuento aproximado de palabras del cuerpo (sin etiquetas). */
export function contarPalabras(html: string): number {
  const txt = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ");
  return txt.trim().split(/\s+/).filter(Boolean).length;
}

/** Extrae las descripciones de los huecos [[FALTA: …]] presentes. */
export function detectarFaltantes(html: string): string[] {
  const out: string[] = [];
  const re = /\[\[FALTA:([^\]]*)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1].trim());
  return Array.from(new Set(out));
}

/** Quita posibles vallas markdown (```html … ```) que el modelo no debería poner. */
export function limpiarHtml(html: string): string {
  return html
    .trim()
    .replace(/^```(?:html)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

/** Título de reserva tomado del primer <h1> del HTML. */
export function tituloDesdeHtml(html: string): string | null {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim() || null;
}

/* ── Lectura, borrado y filtrado (historial) ── */

const ID_VALIDO = /^[\w.\-]+$/;

/** Lee meta.json + post.html de un post. */
export async function leerPost(id: string): Promise<{ meta: Meta; html: string } | null> {
  if (!ID_VALIDO.test(id)) return null;
  const dir = path.join(DIR_HISTORIAL, id);
  try {
    const meta = JSON.parse(await fs.readFile(path.join(dir, "meta.json"), "utf8")) as Meta;
    const html = await fs.readFile(path.join(dir, "post.html"), "utf8");
    return { meta, html };
  } catch {
    return null;
  }
}

/** Borra la carpeta de un post y lo quita del índice. */
export async function borrarPost(id: string): Promise<boolean> {
  if (!ID_VALIDO.test(id)) return false;
  const dir = path.join(DIR_HISTORIAL, id);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    return false;
  }
  const idx = await leerIndice();
  const posts = idx.posts.filter((p) => p.id !== id);
  await fs.writeFile(
    RUTA_INDEX,
    JSON.stringify({ actualizado: new Date().toISOString(), posts }, null, 2) + "\n",
    "utf8",
  );
  return true;
}

export type FiltrosHistorial = {
  q?: string;
  idioma?: string;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
};

/** Lista el índice aplicando filtros; la búsqueda `q` mira título Y contenido. */
export async function listarConFiltros(
  f: FiltrosHistorial,
): Promise<{ posts: EntradaIndice[]; total: number; mesActual: number }> {
  const idx = await leerIndice();
  const total = idx.posts.length;

  const ahora = new Date();
  const claveMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const mesActual = idx.posts.filter((p) => (p.fecha || "").slice(0, 7) === claveMes).length;

  let posts = idx.posts;
  if (f.idioma) posts = posts.filter((p) => p.idioma === f.idioma);
  if (f.desde) posts = posts.filter((p) => (p.fecha || "").slice(0, 10) >= f.desde!);
  if (f.hasta) posts = posts.filter((p) => (p.fecha || "").slice(0, 10) <= f.hasta!);

  const q = (f.q || "").trim().toLowerCase();
  if (q) {
    const filtrados: EntradaIndice[] = [];
    for (const p of posts) {
      const enMeta = `${p.titulo} ${p.metaTitle} ${p.metaDescription}`.toLowerCase().includes(q);
      if (enMeta) {
        filtrados.push(p);
        continue;
      }
      try {
        const html = await fs.readFile(path.join(DIR_HISTORIAL, p.id, "post.html"), "utf8");
        if (html.replace(/<[^>]+>/g, " ").toLowerCase().includes(q)) filtrados.push(p);
      } catch {
        /* sin contenido legible */
      }
    }
    posts = filtrados;
  }

  return { posts, total, mesActual };
}
