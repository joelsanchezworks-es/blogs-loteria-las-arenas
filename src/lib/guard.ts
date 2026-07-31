/**
 * Guardia de API key.
 *
 * RESTRICCIÓN INNEGOCIABLE del proyecto: todo el consumo va contra la suscripción
 * Claude Max a través del CLI, NUNCA contra la API de pago. Si `ANTHROPIC_API_KEY`
 * está en el entorno, el CLI facturaría por API. La app avisa y no lanza nada hasta
 * que se elimine.
 */

export type EstadoApiKey = {
  hayApiKey: boolean;
  mensaje: string | null;
};

export function comprobarApiKey(): EstadoApiKey {
  const valor = process.env.ANTHROPIC_API_KEY;
  const hay = typeof valor === "string" && valor.trim().length > 0;
  return {
    hayApiKey: hay,
    mensaje: hay
      ? "Hay una API key en el entorno, el CLI facturaría por API en vez de usar la suscripción. Elimina ANTHROPIC_API_KEY del entorno y reinicia la app."
      : null,
  };
}
