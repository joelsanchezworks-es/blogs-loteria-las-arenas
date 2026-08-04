import { MODO_LOCAL } from "../config";
import { almacenArchivos } from "./archivos";
import { almacenPostgres } from "./postgres";
import type { Almacen } from "./tipos";

/** Almacén activo según el modo (archivos en local, Postgres en Vercel). */
export const almacen: Almacen = MODO_LOCAL ? almacenArchivos : almacenPostgres;

export type { Almacen, Filtros, NuevoPost, PostCompleto, PostResumen } from "./tipos";
