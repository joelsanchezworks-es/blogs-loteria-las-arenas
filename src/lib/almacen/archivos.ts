import { promises as fs } from "node:fs";
import path from "node:path";
import type { Almacen, Filtros, NuevoPost, PostCompleto, PostResumen } from "./tipos";

/** Almacén en sistema de archivos (modo local): historial/<id>/ + index.json. */

const DIR = path.join(process.cwd(), "historial");
const RUTA_INDEX = path.join(DIR, "index.json");
const ID_VALIDO = /^[\w.\-]+$/;

type Meta = PostResumen & { tema: string };

async function leerIndice(): Promise<{ actualizado: string | null; posts: PostResumen[] }> {
  try {
    const datos = JSON.parse(await fs.readFile(RUTA_INDEX, "utf8"));
    return { actualizado: datos.actualizado ?? null, posts: Array.isArray(datos.posts) ? datos.posts : [] };
  } catch {
    return { actualizado: null, posts: [] };
  }
}

function aResumen(m: PostResumen): PostResumen {
  return {
    id: m.id,
    titulo: m.titulo,
    idioma: m.idioma,
    fecha: m.fecha,
    urlDestino: m.urlDestino,
    metaTitle: m.metaTitle,
    metaDescription: m.metaDescription,
    palabras: m.palabras,
    tieneFaltantes: m.tieneFaltantes,
  };
}

async function upsertIndice(resumen: PostResumen): Promise<void> {
  const idx = await leerIndice();
  const otros = idx.posts.filter((p) => p.id !== resumen.id);
  const posts = [resumen, ...otros].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  await fs.writeFile(
    RUTA_INDEX,
    JSON.stringify({ actualizado: new Date().toISOString(), posts }, null, 2) + "\n",
    "utf8",
  );
}

async function guardar(post: NuevoPost, idSugerido: string): Promise<PostResumen> {
  await fs.mkdir(DIR, { recursive: true });
  let id = idSugerido;
  let n = 2;
  let dir = "";
  for (;;) {
    dir = path.join(DIR, id);
    try {
      await fs.mkdir(dir, { recursive: false });
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") {
        id = `${idSugerido}-${n++}`;
        continue;
      }
      throw e;
    }
  }

  const meta: Meta = {
    id,
    titulo: post.titulo,
    idioma: post.idioma,
    fecha: new Date().toISOString(),
    urlDestino: post.urlDestino,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    palabras: post.palabras,
    tieneFaltantes: post.tieneFaltantes,
    tema: post.tema,
  };
  await fs.writeFile(path.join(dir, "post.html"), post.html + "\n", "utf8");
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");
  const resumen = aResumen(meta);
  await upsertIndice(resumen);
  return resumen;
}

async function listar(
  f: Filtros,
): Promise<{ posts: PostResumen[]; total: number; mesActual: number }> {
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
    const filtrados: PostResumen[] = [];
    for (const p of posts) {
      const enMeta = `${p.titulo} ${p.metaTitle} ${p.metaDescription}`.toLowerCase().includes(q);
      if (enMeta) {
        filtrados.push(p);
        continue;
      }
      try {
        const html = await fs.readFile(path.join(DIR, p.id, "post.html"), "utf8");
        if (html.replace(/<[^>]+>/g, " ").toLowerCase().includes(q)) filtrados.push(p);
      } catch {
        /* sin contenido */
      }
    }
    posts = filtrados;
  }
  return { posts, total, mesActual };
}

async function leer(id: string): Promise<PostCompleto | null> {
  if (!ID_VALIDO.test(id)) return null;
  const dir = path.join(DIR, id);
  try {
    const meta = JSON.parse(await fs.readFile(path.join(dir, "meta.json"), "utf8")) as Meta;
    const html = await fs.readFile(path.join(dir, "post.html"), "utf8");
    return { ...aResumen(meta), html, tema: meta.tema ?? "" };
  } catch {
    return null;
  }
}

async function borrar(id: string): Promise<boolean> {
  if (!ID_VALIDO.test(id)) return false;
  try {
    await fs.rm(path.join(DIR, id), { recursive: true, force: true });
  } catch {
    return false;
  }
  const idx = await leerIndice();
  await fs.writeFile(
    RUTA_INDEX,
    JSON.stringify(
      { actualizado: new Date().toISOString(), posts: idx.posts.filter((p) => p.id !== id) },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  return true;
}

export const almacenArchivos: Almacen = { guardar, listar, leer, borrar };
