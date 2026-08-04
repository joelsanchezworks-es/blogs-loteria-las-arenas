/**
 * Banner de estado del entorno, según el modo activo:
 * - Modo API (Vercel): necesita ANTHROPIC_API_KEY y POSTGRES_URL.
 * - Modo local (CLI):  necesita el binario `claude` logueado con la cuenta Max.
 */
export type EstadoEntorno = {
  modoLocal: boolean;
  modelo: string;
  hayApiKey: boolean;
  cliDisponible?: boolean; // modo local
  hayPostgres?: boolean; // modo API
};

function Banner({
  tono,
  titulo,
  detalle,
}: {
  tono: "rojo" | "ambar" | "ok";
  titulo?: string;
  detalle: React.ReactNode;
}) {
  if (tono === "ok") {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-borde bg-panel/60 px-4 py-2.5 text-xs text-tenue">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
        {detalle}
      </div>
    );
  }
  const c =
    tono === "rojo"
      ? "border-red-500/50 bg-red-500/10 text-red-200/90"
      : "border-amber-500/50 bg-amber-500/10 text-amber-200/90";
  const t = tono === "rojo" ? "text-red-300" : "text-amber-300";
  return (
    <div role="alert" className={`mb-6 rounded-lg border px-4 py-3 ${c}`}>
      {titulo && <p className={`text-sm font-bold ${t}`}>{titulo}</p>}
      <p className="mt-1 text-sm leading-relaxed">{detalle}</p>
    </div>
  );
}

export default function AvisoEntorno(estado: EstadoEntorno) {
  if (estado.modoLocal) {
    if (!estado.cliDisponible) {
      return (
        <Banner
          tono="ambar"
          titulo="No se encuentra el CLI de Claude"
          detalle="Modo local activo. Instala Claude Code y ejecuta `claude` una vez, logueado con tu cuenta Max."
        />
      );
    }
    return (
      <Banner
        tono="ok"
        detalle={
          <>
            Modo local · motor CLI (tu suscripción) · almacén de archivos.
            {estado.hayApiKey
              ? " Hay una ANTHROPIC_API_KEY en el entorno, pero en modo local se ignora (el CLI usa la suscripción)."
              : ""}
          </>
        }
      />
    );
  }

  // Modo API (Vercel)
  if (!estado.hayApiKey) {
    return (
      <Banner
        tono="rojo"
        titulo="Falta ANTHROPIC_API_KEY"
        detalle="Modo API. Configura ANTHROPIC_API_KEY para llamar a claude-sonnet-4-6. En Vercel: Settings → Environment Variables."
      />
    );
  }
  if (!estado.hayPostgres) {
    return (
      <Banner
        tono="ambar"
        titulo="Falta POSTGRES_URL"
        detalle="Modo API. Crea una base de datos Vercel Postgres y enlázala al proyecto; POSTGRES_URL se añade sola. Sin ella, los posts no se guardan."
      />
    );
  }
  return (
    <Banner
      tono="ok"
      detalle={<>Modo API · {estado.modelo} · Vercel Postgres.</>}
    />
  );
}
