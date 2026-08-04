import { sql } from "@vercel/postgres";
import type { Almacen, Filtros, NuevoPost, PostCompleto, PostResumen } from "./tipos";

/** Almacén Vercel Postgres (modo API / Vercel). */

let tablaLista = false;

async function asegurarTabla(): Promise<void> {
  if (tablaLista) return;
  await sql`CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    titulo TEXT,
    html TEXT,
    meta_title TEXT,
    meta_description TEXT,
    tema TEXT,
    url_destino TEXT,
    idioma TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    palabras INTEGER,
    tiene_faltantes BOOLEAN DEFAULT FALSE
  )`;
  tablaLista = true;
}

type Fila = Record<string, unknown>;

function isoFecha(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toISOString();
  }
  return new Date().toISOString();
}

function aResumen(r: Fila): PostResumen {
  return {
    id: String(r.id),
    titulo: (r.titulo as string) ?? "",
    idioma: (r.idioma as string) ?? "es",
    fecha: isoFecha(r.fecha),
    urlDestino: (r.url_destino as string) ?? null,
    metaTitle: (r.meta_title as string) ?? "",
    metaDescription: (r.meta_description as string) ?? "",
    palabras: Number(r.palabras ?? 0),
    tieneFaltantes: Boolean(r.tiene_faltantes),
  };
}

async function guardar(post: NuevoPost, idSugerido: string): Promise<PostResumen> {
  await asegurarTabla();
  let id = idSugerido;
  let n = 2;
  for (;;) {
    const res = await sql.query(
      `INSERT INTO posts (id, titulo, html, meta_title, meta_description, tema, url_destino, idioma, palabras, tiene_faltantes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [
        id,
        post.titulo,
        post.html,
        post.metaTitle,
        post.metaDescription,
        post.tema,
        post.urlDestino,
        post.idioma,
        post.palabras,
        post.tieneFaltantes,
      ],
    );
    if (res.rowCount && res.rowCount > 0) break;
    id = `${idSugerido}-${n++}`;
  }
  const leido = await leer(id);
  return (
    leido ?? {
      id,
      titulo: post.titulo,
      idioma: post.idioma,
      fecha: new Date().toISOString(),
      urlDestino: post.urlDestino,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      palabras: post.palabras,
      tieneFaltantes: post.tieneFaltantes,
    }
  );
}

async function listar(
  f: Filtros,
): Promise<{ posts: PostResumen[]; total: number; mesActual: number }> {
  await asegurarTabla();
  const cond: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (f.idioma) {
    cond.push(`idioma = $${i++}`);
    params.push(f.idioma);
  }
  if (f.desde) {
    cond.push(`fecha >= $${i++}`);
    params.push(f.desde);
  }
  if (f.hasta) {
    cond.push(`fecha < ($${i++}::date + interval '1 day')`);
    params.push(f.hasta);
  }
  if (f.q) {
    cond.push(
      `(titulo ILIKE $${i} OR meta_title ILIKE $${i} OR meta_description ILIKE $${i} OR html ILIKE $${i})`,
    );
    params.push(`%${f.q}%`);
    i++;
  }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";

  const filas = await sql.query(
    `SELECT id, titulo, idioma, fecha, url_destino, meta_title, meta_description, palabras, tiene_faltantes
     FROM posts ${where} ORDER BY fecha DESC`,
    params,
  );
  const total = await sql.query(`SELECT COUNT(*)::int AS n FROM posts`);
  const mes = await sql.query(
    `SELECT COUNT(*)::int AS n FROM posts WHERE date_trunc('month', fecha) = date_trunc('month', NOW())`,
  );

  return {
    posts: filas.rows.map((r) => aResumen(r as Fila)),
    total: Number((total.rows[0] as Fila).n ?? 0),
    mesActual: Number((mes.rows[0] as Fila).n ?? 0),
  };
}

async function leer(id: string): Promise<PostCompleto | null> {
  await asegurarTabla();
  const res = await sql.query(`SELECT * FROM posts WHERE id = $1`, [id]);
  if (!res.rows.length) return null;
  const r = res.rows[0] as Fila;
  return { ...aResumen(r), html: (r.html as string) ?? "", tema: (r.tema as string) ?? "" };
}

async function borrar(id: string): Promise<boolean> {
  await asegurarTabla();
  const res = await sql.query(`DELETE FROM posts WHERE id = $1`, [id]);
  return Boolean(res.rowCount && res.rowCount > 0);
}

export const almacenPostgres: Almacen = { guardar, listar, leer, borrar };
