import { promises as fs } from "node:fs";
import path from "node:path";
import { ejecutarClaude } from "./claude";
import { DIR_REFERENCIAS, RAIZ } from "./historial";
import { describirEvento, type Emisor } from "./generacion";

const RUTA_REGLAS = path.join(DIR_REFERENCIAS, "reglas-estilo.md");
const RUTA_PLANTILLA = path.join(DIR_REFERENCIAS, "plantilla-ejemplo.html");

export async function leerReglas(): Promise<string> {
  try {
    return await fs.readFile(RUTA_REGLAS, "utf8");
  } catch {
    return "";
  }
}

function promptRegenerar(): string {
  return `Eres el analista de estilo del blog de Lotería Las Arenas. La plantilla de referencia puede haber cambiado y hay que actualizar el archivo de reglas de estilo.

Lee estos dos archivos:
- Plantilla actual: ${RUTA_PLANTILLA}
- Reglas actuales: ${RUTA_REGLAS}

Reescribe el archivo de reglas con tu herramienta Write, en esta ruta exacta:
${RUTA_REGLAS}

Cómo hacerlo:
- Actualiza las secciones de DISEÑO para que reflejen la plantilla ACTUAL: paleta de color, tipografía, estructura del documento, jerarquía de encabezados, párrafos, negritas, "listas", componentes/módulos (con su CSS inline), enlaces, fechas, precios y tono de voz.
- CONSERVA SIN CAMBIOS (cópialas literalmente del archivo de reglas actual) estas secciones de decisiones de negocio y contenido, porque no salen de la plantilla:
  · "§1B CONSTANTES DE NEGOCIO" (dirección, teléfono, nº 336, URLs, voz de Víctor, historial de premios 2023-2025)
  · "§8.12 COLETILLA LEGAL +18"
  · "§9 IMÁGENES" (placeholder dorado punteado, sin URL inventada ni [[FALTA]])
  · la regla de urlDestino / href="#" (§10)
  · "§14 REGLAS DE CONTENIDO" (no inventar datos, [[FALTA: …]], juego responsable +18)
  · "§15 META" y "§16 CHECKLIST"
- Mantén el mismo formato Markdown, los mismos títulos numerados y el tono del documento actual.

No uses la herramienta Bash. Escribe solo ese archivo y termina.`;
}

/** Regenera referencias/reglas-estilo.md a partir de la plantilla actual. */
export async function regenerarReglas({
  emitir,
  signal,
}: {
  emitir: Emisor;
  signal?: AbortSignal;
}): Promise<void> {
  emitir({ tipo: "paso", texto: "Analizando la plantilla…" });
  const res = await ejecutarClaude(
    promptRegenerar(),
    { cwd: RAIZ, allowedTools: ["Read", "Write"], maxTurns: 12, signal },
    {
      onEvento: (ev) => {
        const linea = describirEvento(ev);
        if (linea) emitir({ tipo: "paso", texto: linea });
      },
    },
  );

  const contenido = await leerReglas();
  if (!contenido.trim()) {
    emitir({ tipo: "fin", ok: false, error: res.error || "No se pudo regenerar reglas-estilo.md." });
    return;
  }
  emitir({ tipo: "fin", ok: true, contenido });
}
