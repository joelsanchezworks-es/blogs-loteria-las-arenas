import path from "node:path";

/**
 * Extracción de texto EN MEMORIA (sin escribir a disco).
 *
 * Los archivos subidos (PDF, DOCX, TXT, MD, HTML) se procesan directamente
 * desde su Buffer: PDF con `unpdf`, DOCX con `mammoth`, el resto por lectura
 * directa. No se guarda nada en disco (requisito para funcionar en Vercel).
 */

export const EXTENSIONES_OK = [".pdf", ".docx", ".txt", ".md", ".html", ".htm"];

export function extensionValida(nombre: string): boolean {
  return EXTENSIONES_OK.includes(path.extname(nombre).toLowerCase());
}

export async function extraerTextoDeBuffer(buffer: Buffer, nombre: string): Promise<string> {
  const ext = path.extname(nombre).toLowerCase();

  if (ext === ".pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : String(text);
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  const bruto = buffer.toString("utf8");
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
