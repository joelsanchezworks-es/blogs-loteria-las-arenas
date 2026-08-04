/**
 * Configuración dual-modo.
 *
 * Un único interruptor, USE_LOCAL_STORAGE, decide el perfil completo:
 *
 *   USE_LOCAL_STORAGE=true  → MODO LOCAL: motor = CLI de Claude (suscripción),
 *                            almacén = sistema de archivos (historial/).
 *   (sin definir / Vercel)  → MODO API:  motor = @anthropic-ai/sdk (ANTHROPIC_API_KEY),
 *                            almacén = Vercel Postgres.
 *
 * Así el mismo código funciona en local (gratis, contra la suscripción) y
 * desplegado en Vercel (API + Postgres) sin cambiar nada más que las variables.
 */

export const MODO_LOCAL = process.env.USE_LOCAL_STORAGE === "true";

/** Motor de generación activo. */
export const MOTOR: "cli" | "api" = MODO_LOCAL ? "cli" : "api";

/** Almacén activo. */
export const ALMACEN: "archivos" | "postgres" = MODO_LOCAL ? "archivos" : "postgres";

/** Modelo usado por el motor API (no aplica al CLI, que usa el de la sesión). */
export const MODELO_API = "claude-sonnet-4-6";
