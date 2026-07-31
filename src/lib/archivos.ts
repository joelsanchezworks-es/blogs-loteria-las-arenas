import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Extracción de texto de RESPALDO.
 *
 * La vía principal es pasar la ruta del archivo al CLI, que lee PDF y DOCX de
 * forma nativa sin librerías extra. Esta función solo se usa como respaldo si el
 * CLI no consigue leer el archivo (ver lib/generacion.ts): PDF con `unpdf`,
 * DOCX con `mammoth`, y el resto (txt/md/html) por lectura directa.
 */
export async function extraerTexto(ruta: string): Promise<string> {
  const ext = path.extname(ruta).toLowerCase();

  if (ext === ".pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const buf = await fs.readFile(ruta);
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : String(text);
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ path: ruta });
    return value;
  }

  const bruto = await fs.readFile(ruta, "utf8");
  if (ext === ".html" || ext === ".htm") {
    return bruto
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return bruto;
}
