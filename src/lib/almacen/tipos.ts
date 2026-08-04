/** Interfaz común de almacén (implementada por Postgres y por archivos). */

export type PostResumen = {
  id: string;
  titulo: string;
  idioma: string;
  fecha: string; // ISO
  urlDestino: string | null;
  metaTitle: string;
  metaDescription: string;
  palabras: number;
  tieneFaltantes: boolean;
};

export type PostCompleto = PostResumen & {
  html: string;
  tema: string;
};

export type NuevoPost = {
  titulo: string;
  html: string;
  metaTitle: string;
  metaDescription: string;
  tema: string;
  urlDestino: string | null;
  idioma: string;
  palabras: number;
  tieneFaltantes: boolean;
};

export type Filtros = {
  q?: string;
  idioma?: string;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
};

export interface Almacen {
  guardar(post: NuevoPost, idSugerido: string): Promise<PostResumen>;
  listar(f: Filtros): Promise<{ posts: PostResumen[]; total: number; mesActual: number }>;
  leer(id: string): Promise<PostCompleto | null>;
  borrar(id: string): Promise<boolean>;
}
