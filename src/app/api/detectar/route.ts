import { encolar } from "@/lib/cola";
import { detectarTemas } from "@/lib/deteccion";
import { comprobarApiKey } from "@/lib/guard";
import { resolverSubida } from "@/lib/subidas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Modo B: detecta y separa los temas de un archivo subido. Responde en streaming. */
export async function POST(req: Request) {
  const guard = comprobarApiKey();
  const cuerpo = (await req.json().catch(() => ({}))) as { token?: unknown };
  const info = typeof cuerpo.token === "string" ? resolverSubida(cuerpo.token) : null;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (o: Record<string, unknown>) => {
        try {
          controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        } catch {
          /* cerrado */
        }
      };

      if (guard.hayApiKey) {
        send({ tipo: "fin", ok: false, error: guard.mensaje });
        controller.close();
        return;
      }
      if (!info) {
        send({ tipo: "fin", ok: false, error: "Archivo no encontrado (vuelve a subirlo)." });
        controller.close();
        return;
      }

      try {
        const temas = await encolar(() =>
          detectarTemas(info.ruta, { emitir: send, signal: req.signal }),
        );
        send({ tipo: "fin", ok: true, temas, token: info.token, nombre: info.nombre });
      } catch (e) {
        send({
          tipo: "fin",
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
