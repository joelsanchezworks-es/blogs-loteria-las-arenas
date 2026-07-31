import Encabezado from "@/components/Encabezado";
import AvisoEntorno from "@/components/AvisoEntorno";
import Generador from "@/components/Generador";
import { comprobarApiKey } from "@/lib/guard";
import { verificarCli } from "@/lib/claude";

export const dynamic = "force-dynamic";

export default async function Home() {
  const apiKey = comprobarApiKey();
  const cli = await verificarCli();
  const bloqueado = apiKey.hayApiKey || !cli.disponible;

  return (
    <div className="min-h-screen">
      <Encabezado activo="generador" />

      <main className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <AvisoEntorno
          hayApiKey={apiKey.hayApiKey}
          mensajeApiKey={apiKey.mensaje}
          cliDisponible={cli.disponible}
          cliVersion={cli.version}
          cliError={cli.error}
        />

        <Generador bloqueado={bloqueado} />
      </main>
    </div>
  );
}
