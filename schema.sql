-- Esquema de la base de datos (Vercel Postgres / @vercel/postgres).
-- La app ejecuta este CREATE TABLE IF NOT EXISTS automáticamente en el primer
-- uso, así que normalmente no hace falta correrlo a mano. Se incluye como
-- referencia y por si quieres crear la tabla tú mismo.

CREATE TABLE IF NOT EXISTS posts (
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
);
