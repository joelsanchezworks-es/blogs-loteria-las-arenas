/**
 * Banner de estado del entorno, mostrado en el arranque:
 * - API key detectada  → aviso rojo (bloqueante).
 * - CLI no disponible   → aviso ámbar.
 * - Todo correcto       → nota discreta de que se usa la suscripción.
 */
export type EstadoEntorno = {
  hayApiKey: boolean;
  mensajeApiKey: string | null;
  cliDisponible: boolean;
  cliVersion: string | null;
  cliError?: string;
};

export default function AvisoEntorno({
  hayApiKey,
  mensajeApiKey,
  cliDisponible,
  cliVersion,
  cliError,
}: EstadoEntorno) {
  if (hayApiKey) {
    return (
      <div
        role="alert"
        className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3"
      >
        <p className="text-sm font-bold text-red-300">
          ⚠ API key detectada en el entorno
        </p>
        <p className="mt-1 text-sm leading-relaxed text-red-200/90">
          {mensajeApiKey}
        </p>
      </div>
    );
  }

  if (!cliDisponible) {
    return (
      <div
        role="alert"
        className="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3"
      >
        <p className="text-sm font-bold text-amber-300">
          No se encuentra el CLI de Claude
        </p>
        <p className="mt-1 text-sm leading-relaxed text-amber-200/90">
          {cliError ??
            "Instala Claude Code y ejecuta `claude` una vez, logueado con tu cuenta Max."}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center gap-2 rounded-lg border border-borde bg-panel/60 px-4 py-2.5 text-xs text-tenue">
      <span
        className="inline-block h-2 w-2 rounded-full bg-emerald-400"
        aria-hidden
      />
      Motor: {cliVersion ? `Claude Code ${cliVersion}` : "CLI de Claude"} · usando
      tu suscripción (sin API key).
    </div>
  );
}
