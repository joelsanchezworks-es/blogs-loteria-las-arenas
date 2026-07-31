import { NextResponse } from "next/server";
import { encolar } from "@/lib/cola";
import { comprobarApiKey } from "@/lib/guard";
import { leerReglas, regenerarReglas } from "@/lib/reglas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Devuelve el contenido actual de reglas-estilo.md. */
export async function GET() {
  const contenido = await leerReglas();
  return NextResponse.json({ ok: true, contenido });
}

/** Regenera reglas-estilo.md desde la plantilla. Responde en streaming. */
export async function POST(req: Request) {
  const guard = comprobarApiKey();
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
      try {
        await encolar(() => regenerarReglas({ emitir: send, signal: req.signal }));
      } catch (e) {
        send({ tipo: "fin", ok: false, error: `Error inesperado: ${String(e)}` });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
