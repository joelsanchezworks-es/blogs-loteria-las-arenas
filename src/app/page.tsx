import Encabezado from "@/components/Encabezado";
import AvisoEntorno, { type EstadoEntorno } from "@/components/AvisoEntorno";
import Generador from "@/components/Generador";
import { MODELO_API, MODO_LOCAL } from "@/lib/config";
import { clienteDisponible } from "@/lib/anthropic";
import { cliDisponible } from "@/lib/claude";

export const dynamic = "force-dynamic";

export default async function Home() {
  let estado: EstadoEntorno;
  let bloqueado: boolean;

  if (MODO_LOCAL) {
    const cli = await cliDisponible();
    estado = {
      modoLocal: true,
      modelo: MODELO_API,
      hayApiKey: clienteDisponible(),
      cliDisponible: cli,
    };
    bloqueado = !cli;
  } else {
    const hayApiKey = clienteDisponible();
    const hayPostgres = Boolean(process.env.POSTGRES_URL && process.env.POSTGRES_URL.trim());
    estado = { modoLocal: false, modelo: MODELO_API, hayApiKey, hayPostgres };
    // Sin API key no se puede generar; sin Postgres se genera pero no se guarda
    // (solo aviso, no bloqueo).
    bloqueado = !hayApiKey;
  }

  return (
    <div className="min-h-screen">
      <Encabezado activo="generador" />

      <main className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <AvisoEntorno {...estado} />
        <Generador bloqueado={bloqueado} modoLocal={estado.modoLocal} />
      </main>
    </div>
  );
}
