import { promises as fs } from "node:fs";
import path from "node:path";
import { MODO_LOCAL } from "./config";
import { generarSimple, type Emisor } from "./motor";

const DIR = path.join(process.cwd(), "referencias");
const RUTA_REGLAS = path.join(DIR, "reglas-estilo.md");
const RUTA_PLANTILLA = path.join(DIR, "plantilla-ejemplo.html");

export async function leerReglas(): Promise<string> {
  try {
    return await fs.readFile(RUTA_REGLAS, "utf8");
  } catch {
    return "";
  }
}

/**
 * Regenera referencias/reglas-estilo.md desde la plantilla. Solo en modo local
 * (en Vercel el sistema de archivos es de solo lectura, así que se desactiva).
 */
export async function regenerarReglas({
  emitir,
  signal,
}: {
  emitir: Emisor;
  signal?: AbortSignal;
}): Promise<void> {
  if (!MODO_LOCAL) {
    emitir({
      tipo: "fin",
      ok: false,
      error:
        "La regeneración de reglas solo funciona en modo local (escribe en referencias/, que en Vercel es de solo lectura). Edita la plantilla y regenera en tu máquina.",
    });
    return;
  }
  try {
    emitir({ tipo: "paso", texto: "Analizando la plantilla…" });
    const [reglas, plantilla] = await Promise.all([
      leerReglas(),
      fs.readFile(RUTA_PLANTILLA, "utf8").catch(() => ""),
    ]);

    const prompt = `Eres el analista de estilo del blog de Lotería Las Arenas. La plantilla de referencia puede haber cambiado; hay que actualizar el archivo de reglas de estilo.

Reescribe el documento de reglas de estilo (formato Markdown) de modo que:
- Las secciones de DISEÑO (paleta, tipografía, estructura, encabezados, párrafos, negritas, "listas", componentes/módulos, enlaces, fechas, precios, tono) reflejen la PLANTILLA ACTUAL.
- CONSERVA SIN CAMBIOS (cópialas literalmente de las REGLAS ACTUALES) las secciones de decisiones de negocio y contenido: §1B (constantes de negocio), §8.12 (coletilla +18), §9 (imágenes placeholder), la regla de urlDestino/href="#" (§10), §14 (reglas de contenido), §15 (meta) y §16 (checklist).
- Mantén los mismos títulos numerados y el mismo tono.

Devuelve SOLO el contenido Markdown completo del nuevo reglas-estilo.md, sin vallas de código ni texto adicional.

===== PLANTILLA ACTUAL =====
${plantilla}

===== REGLAS ACTUALES =====
${reglas}`;

    const salida = await generarSimple(prompt, { signal, maxTokens: 8000 });
    const contenido = salida
      .replace(/^```(?:markdown|md)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    if (!contenido) {
      emitir({ tipo: "fin", ok: false, error: "No se pudo regenerar reglas-estilo.md." });
      return;
    }
    await fs.writeFile(RUTA_REGLAS, contenido + "\n", "utf8");
    emitir({ tipo: "fin", ok: true, contenido });
  } catch (e) {
    emitir({ tipo: "fin", ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
