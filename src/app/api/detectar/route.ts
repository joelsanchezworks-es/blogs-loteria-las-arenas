import { extensionValida, extraerTextoDeBuffer } from "@/lib/archivos";
import { detectarTemas } from "@/lib/deteccion";
import { motorDisponible } from "@/lib/motor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Modo B: detecta los temas de los archivos subidos. Responde en streaming. */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ tipo: "fin", ok: false, error: "Petición no válida." }) + "\n", {
      status: 400,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  }
  const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File);

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

      const motor = await motorDisponible();
      if (!motor.ok) {
        send({ tipo: "fin", ok: false, error: motor.error });
        controller.close();
        return;
      }
      if (archivos.length === 0) {
        send({ tipo: "fin", ok: false, error: "No se recibió ningún archivo." });
        controller.close();
        return;
      }

      const temas: { titulo: string; datosClave: string; origenNombre: string }[] = [];
      try {
        for (const f of archivos) {
          if (!extensionValida(f.name)) {
            send({ tipo: "aviso", texto: `Formato no admitido: ${f.name}` });
            continue;
          }
          send({ tipo: "paso", texto: `Leyendo ${f.name}…` });
          const buf = Buffer.from(await f.arrayBuffer());
          const texto = (await extraerTextoDeBuffer(buf, f.name)).trim();
          if (!texto) {
            send({ tipo: "aviso", texto: `No se pudo extraer texto de ${f.name}` });
            continue;
          }
          const detectados = await detectarTemas(texto, { emitir: send, signal: req.signal });
          for (const t of detectados) temas.push({ ...t, origenNombre: f.name });
        }
        if (temas.length === 0) {
          send({ tipo: "fin", ok: false, error: "No se detectaron temas en los archivos." });
        } else {
          send({ tipo: "fin", ok: true, temas });
        }
      } catch (e) {
        send({ tipo: "fin", ok: false, error: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
