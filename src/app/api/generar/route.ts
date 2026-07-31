import { encolar } from "@/lib/cola";
import { ejecutarTrabajo } from "@/lib/generacion";
import { comprobarApiKey } from "@/lib/guard";
import type { Idioma } from "@/lib/prompt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IDIOMAS: Idioma[] = ["es", "ca", "en"];

/**
 * Genera un post desde texto. Responde en streaming (NDJSON, un evento por línea)
 * para pintar el progreso en la interfaz. La generación pasa por la cola secuencial.
 */
export async function POST(req: Request) {
  const guard = comprobarApiKey();
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const texto = typeof cuerpo.texto === "string" ? cuerpo.texto.trim() : "";
  const url =
    typeof cuerpo.url === "string" && cuerpo.url.trim() ? cuerpo.url.trim() : null;
  const idioma: Idioma = IDIOMAS.includes(cuerpo.idioma as Idioma)
    ? (cuerpo.idioma as Idioma)
    : "es";

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const enviar = (o: Record<string, unknown>) => {
        try {
          controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        } catch {
          /* stream cerrado */
        }
      };

      if (guard.hayApiKey) {
        enviar({ tipo: "fin", ok: false, error: guard.mensaje });
        controller.close();
        return;
      }
      if (!texto) {
        enviar({ tipo: "fin", ok: false, error: "Escribe un tema o unas instrucciones." });
        controller.close();
        return;
      }

      try {
        await encolar(
          () =>
            ejecutarTrabajo(
              { texto, url, idioma, modo: "texto" },
              { emitir: enviar, signal: req.signal },
            ),
          (posicion) => enviar({ tipo: "estado", valor: "en-cola", posicion }),
        );
      } catch (e) {
        enviar({ tipo: "fin", ok: false, error: `Error inesperado: ${String(e)}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
