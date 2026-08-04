import { generarSimple, type Emisor } from "./motor";
import { parsearTemas } from "./parseo";
import { construirPromptDeteccion } from "./prompt";

export type TemaDetectado = { titulo: string; datosClave: string };

/** Modo B: detecta y separa los temas de un texto (motor API o CLI). */
export async function detectarTemas(
  texto: string,
  { emitir, signal }: { emitir?: Emisor; signal?: AbortSignal } = {},
): Promise<TemaDetectado[]> {
  emitir?.({ tipo: "paso", texto: "Analizando el archivo…" });
  const salida = await generarSimple(construirPromptDeteccion(texto), { signal });
  const temas = parsearTemas(salida);
  if (temas.length === 0) {
    throw new Error("No se pudieron detectar temas en el archivo.");
  }
  return temas;
}
