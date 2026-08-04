import { MODO_LOCAL } from "./config";
import { clienteDisponible, generarSimpleApi, generarTextoApi } from "./anthropic";
import { cliDisponible, generarTextoCli } from "./claude";

export type Emisor = (evento: Record<string, unknown>) => void;

/** Generación de un post: elige motor CLI (local) o API (Vercel). */
export async function generar(
  sistema: string,
  usuario: string,
  { emitir, signal }: { emitir?: Emisor; signal?: AbortSignal } = {},
): Promise<string> {
  if (MODO_LOCAL) {
    emitir?.({ tipo: "paso", texto: "Generando con el CLI de Claude (suscripción)…" });
    return generarTextoCli(`${sistema}\n\n${usuario}`, { signal });
  }
  emitir?.({ tipo: "paso", texto: "Generando con la API (claude-sonnet-4-6)…" });
  return generarTextoApi(sistema, usuario, {
    signal,
    onAvance: (chars) => {
      if (chars > 0 && chars % 2000 < 60) emitir?.({ tipo: "paso", texto: `Escribiendo… (${chars} caracteres)` });
    },
  });
}

/** Tarea corta (detección de temas, regeneración de reglas). */
export async function generarSimple(
  prompt: string,
  { signal, maxTokens }: { signal?: AbortSignal; maxTokens?: number } = {},
): Promise<string> {
  if (MODO_LOCAL) return generarTextoCli(prompt, { signal });
  return generarSimpleApi(prompt, { signal, maxTokens });
}

/** ¿Está el motor listo para generar? */
export async function motorDisponible(): Promise<{ ok: boolean; error?: string }> {
  if (MODO_LOCAL) {
    const ok = await cliDisponible();
    return ok
      ? { ok: true }
      : { ok: false, error: "No se encuentra el CLI de Claude. Instálalo y ejecútalo una vez logueado con tu cuenta Max." };
  }
  return clienteDisponible()
    ? { ok: true }
    : { ok: false, error: "Falta ANTHROPIC_API_KEY en el entorno (necesaria en modo API)." };
}
