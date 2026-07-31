import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ejecutarClaude } from "./claude";
import { construirPromptDeteccion } from "./prompt";
import { RAIZ, limpiarHtml } from "./historial";
import { DIR_SUBIDAS } from "./subidas";
import { describirEvento, type Emisor } from "./generacion";

export type TemaDetectado = { titulo: string; datosClave: string };

/**
 * Modo B: el CLI lee el archivo, separa los temas y escribe un JSON temporal
 * que aquí leemos y devolvemos para que el usuario confirme/edite/descarte.
 */
export async function detectarTemas(
  rutaArchivo: string,
  { emitir, signal }: { emitir?: Emisor; signal?: AbortSignal } = {},
): Promise<TemaDetectado[]> {
  await fs.mkdir(DIR_SUBIDAS, { recursive: true });
  const salida = path.join(DIR_SUBIDAS, `temas-${randomUUID()}.json`);

  const res = await ejecutarClaude(
    construirPromptDeteccion(rutaArchivo, salida),
    { cwd: RAIZ, allowedTools: ["Read", "Write"], maxTurns: 12, signal },
    {
      onEvento: (ev) => {
        const linea = describirEvento(ev);
        if (linea) emitir?.({ tipo: "paso", texto: linea });
      },
    },
  );

  let temas: TemaDetectado[] = [];
  try {
    const bruto = await fs.readFile(salida, "utf8");
    const parsed = JSON.parse(limpiarHtml(bruto));
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { temas?: unknown[] }).temas)
        ? (parsed as { temas: unknown[] }).temas
        : [];
    temas = arr
      .map((t) => {
        const o = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
        return {
          titulo: typeof o.titulo === "string" ? o.titulo.trim() : "",
          datosClave:
            typeof o.datosClave === "string"
              ? o.datosClave.trim()
              : typeof o.datos === "string"
                ? (o.datos as string).trim()
                : "",
        };
      })
      .filter((t) => t.titulo);
  } catch {
    /* sin temas legibles */
  } finally {
    fs.unlink(salida).catch(() => {});
  }

  if (temas.length === 0) {
    throw new Error(res.error || "No se pudieron detectar temas en el archivo.");
  }
  return temas;
}
