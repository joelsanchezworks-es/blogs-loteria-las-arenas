import Encabezado from "@/components/Encabezado";
import AvisoEntorno from "@/components/AvisoEntorno";
import { comprobarApiKey } from "@/lib/guard";
import { verificarCli } from "@/lib/claude";

export const dynamic = "force-dynamic";

/**
 * Shell del generador (dos columnas) + aviso de entorno en el arranque.
 * La interactividad (subida de archivos, lanzamiento del CLI, salida en vivo)
 * se conecta en fases posteriores.
 */
export default async function Home() {
  const apiKey = comprobarApiKey();
  const cli = await verificarCli();

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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── COLUMNA IZQUIERDA · ENTRADA ── */}
          <section className="rounded-xl border border-borde bg-panel p-5 sm:p-6">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">
              Entrada
            </p>

            {/* Dropzone */}
            <div className="flex cursor-not-allowed flex-col items-center justify-center rounded-lg border-2 border-dashed border-borde px-4 py-9 text-center transition-colors hover:border-oro/40">
              <div className="mb-2 text-2xl text-oro/70" aria-hidden>
                ⇪
              </div>
              <p className="text-sm text-claro">
                Arrastra aquí tus archivos
              </p>
              <p className="mt-1 text-xs text-tenue">
                PDF · DOCX · TXT · MD · HTML — o haz clic para elegir
              </p>
            </div>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-tenue">
              <span className="h-px flex-1 bg-borde" />
              o escribe el tema
              <span className="h-px flex-1 bg-borde" />
            </div>

            {/* Tema */}
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-oro/70">
              Tema e instrucciones
            </label>
            <textarea
              rows={5}
              disabled
              placeholder={
                "Ej.: Lotería del Niño 2027 — sorteo 6 de enero — décimo 20€ — El Gordo 200.000€ al décimo — destacar que se puede regalar"
              }
              className="w-full resize-y rounded-md border border-borde bg-noche px-3 py-2.5 text-sm text-claro placeholder:text-tenue/70 focus:border-oro/60 focus:outline-none disabled:opacity-70"
            />

            {/* URL */}
            <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-oro/70">
              URL de la página
            </label>
            <input
              type="url"
              disabled
              placeholder="https://www.loterialasarenas.com/…  (opcional)"
              className="w-full rounded-md border border-borde bg-noche px-3 py-2.5 text-sm text-claro placeholder:text-tenue/70 focus:border-oro/60 focus:outline-none disabled:opacity-70"
            />

            {/* Idioma */}
            <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-oro/70">
              Idioma
            </label>
            <select
              disabled
              defaultValue="es"
              className="w-full rounded-md border border-borde bg-noche px-3 py-2.5 text-sm text-claro focus:border-oro/60 focus:outline-none disabled:opacity-70"
            >
              <option value="es">Español</option>
              <option value="ca">Català</option>
              <option value="en">English</option>
            </select>

            {/* Botón */}
            <button
              type="button"
              disabled
              className="mt-6 w-full rounded-md bg-oro px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-noche transition-opacity disabled:opacity-60"
            >
              ✦ Generar HTML
            </button>
          </section>

          {/* ── COLUMNA DERECHA · SALIDA ── */}
          <section className="rounded-xl border border-borde bg-panel p-5 sm:p-6">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">
              Salida
            </p>

            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-borde px-6 text-center">
              <div className="mb-3 h-[2px] w-9 rounded bg-oro/60" aria-hidden />
              <p className="max-w-xs text-sm leading-relaxed text-tenue">
                Esperando tema. Sube un archivo o escribe el tema y pulsa
                Generar.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
