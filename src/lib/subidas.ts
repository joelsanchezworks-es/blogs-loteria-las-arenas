import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { RAIZ } from "./historial";

/**
 * Archivos subidos en tránsito. Se guardan en uploads-tmp/ (gitignored) para
 * poder pasar su RUTA al CLI (que lee PDF/DOCX de forma nativa). El cliente
 * maneja tokens opacos, no rutas del sistema.
 */

export const DIR_SUBIDAS = path.join(RAIZ, "uploads-tmp");

export const EXTENSIONES_OK = [".pdf", ".docx", ".txt", ".md", ".html", ".htm"];

export type ArchivoSubido = {
  token: string;
  nombre: string;
  ruta: string;
  tipo: string;
  tamano: number;
};

const g = globalThis as unknown as { __subidasLLA?: Map<string, ArchivoSubido> };

function mapa(): Map<string, ArchivoSubido> {
  if (!g.__subidasLLA) g.__subidasLLA = new Map();
  return g.__subidasLLA;
}

export function extensionValida(nombre: string): boolean {
  return EXTENSIONES_OK.includes(path.extname(nombre).toLowerCase());
}

export async function guardarSubida(nombre: string, datos: Buffer): Promise<ArchivoSubido> {
  await fs.mkdir(DIR_SUBIDAS, { recursive: true });
  const ext = path.extname(nombre).toLowerCase();
  const token = randomUUID();
  const ruta = path.join(DIR_SUBIDAS, token + ext);
  await fs.writeFile(ruta, datos);
  const info: ArchivoSubido = {
    token,
    nombre,
    ruta,
    tipo: ext.replace(".", ""),
    tamano: datos.length,
  };
  mapa().set(token, info);
  return info;
}

export function resolverSubida(token: string): ArchivoSubido | null {
  return mapa().get(token) ?? null;
}
