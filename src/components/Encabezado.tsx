import Link from "next/link";

/**
 * Cabecera común de la app. `activo` marca la pestaña actual.
 */
export default function Encabezado({
  activo,
}: {
  activo?: "generador" | "historial";
}) {
  return (
    <header className="border-b border-borde bg-panel/40 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          {/* Marca dorada */}
          <div className="mt-1 h-8 w-[3px] shrink-0 rounded bg-oro" aria-hidden />
          <div>
            <h1 className="text-[15px] font-bold leading-tight text-claro sm:text-lg">
              Generador de Contenido HTML
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-oro/75 sm:text-[11px]">
              Lotería Las Arenas · Adm. nº 336 · Barcelona
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 text-[13px]">
          <Link
            href="/"
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              activo === "generador"
                ? "bg-oro/15 text-oro"
                : "text-tenue hover:text-claro"
            }`}
          >
            Generador
          </Link>
          <Link
            href="/historial"
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              activo === "historial"
                ? "bg-oro/15 text-oro"
                : "text-tenue hover:text-claro"
            }`}
          >
            Historial
          </Link>
        </nav>
      </div>
    </header>
  );
}
