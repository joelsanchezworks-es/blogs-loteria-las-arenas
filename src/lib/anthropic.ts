import Anthropic from "@anthropic-ai/sdk";
import { MODELO_API } from "./config";

/** ¿Hay ANTHROPIC_API_KEY en el entorno? (necesaria en modo API). */
export function clienteDisponible(): boolean {
  const v = process.env.ANTHROPIC_API_KEY;
  return typeof v === "string" && v.trim().length > 0;
}

function cliente(): Anthropic {
  // Lee ANTHROPIC_API_KEY del entorno.
  return new Anthropic();
}

/**
 * Generación con la API (streaming). `sistema` es el bloque estable (reglas +
 * plantilla + formato), se marca con cache_control para reutilizar la caché de
 * prompt entre peticiones. Devuelve el texto completo de la respuesta.
 */
export async function generarTextoApi(
  sistema: string,
  usuario: string,
  { signal, onAvance }: { signal?: AbortSignal; onAvance?: (chars: number) => void } = {},
): Promise<string> {
  const stream = cliente().messages.stream(
    {
      model: MODELO_API,
      // Post largo (pillar page de 2.500+ palabras) con toda su estructura: hace
      // falta un tope alto para no truncarlo. AVISO: un post así tarda >60s y NO
      // cabe en Vercel Hobby (límite 60s); requiere plan Pro (subir maxDuration a
      // 300 en la ruta /api/generar) o generarlo en local (CLI, sin límite).
      max_tokens: 16000,
      system: [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: usuario }],
    },
    { signal },
  );

  let texto = "";
  stream.on("text", (delta) => {
    texto += delta;
    onAvance?.(texto.length);
  });

  const final = await stream.finalMessage();
  const completo = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return completo || texto;
}

/** Llamada simple (no streaming) para tareas cortas como la detección de temas. */
export async function generarSimpleApi(
  prompt: string,
  { signal, maxTokens = 4000 }: { signal?: AbortSignal; maxTokens?: number } = {},
): Promise<string> {
  const msg = await cliente().messages.create(
    {
      model: MODELO_API,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    },
    { signal },
  );
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
