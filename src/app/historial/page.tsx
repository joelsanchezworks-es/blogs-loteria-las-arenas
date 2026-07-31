import { promises as fs } from "node:fs";
import path from "node:path";
import Encabezado from "@/components/Encabezado";

export const dynamic = "force-dynamic";

async function contarPosts(): Promise<number> {
  try {
    const ruta = path.join(process.cwd(), "historial", "index.json");
    const bruto = await fs.readFile(ruta, "utf8");
    const datos = JSON.parse(bruto) as { posts?: unknown[] };
    return Array.isArray(datos.posts) ? datos.posts.length : 0;
  } catch {
    return 0;
  }
}

/**
 * FASE 1 — placeholder del historial. La tabla, el buscador y los filtros
 * llegan en la Fase 5. De momento refleja el estado real (posts en index.json).
 */
export default async function HistorialPage() {
  const total = await contarPosts();

  return (
    <div className="min-h-screen">
      <Encabezado activo="historial" />

      <main className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <div className="mb-5 flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">
            Historial
          </p>
          <p className="text-xs text-tenue">{total} posts generados</p>
        </div>

        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-borde bg-panel px-6 text-center">
          <div className="mb-3 h-[2px] w-9 rounded bg-oro/60" aria-hidden />
          <p className="max-w-sm text-sm leading-relaxed text-tenue">
            {total === 0
              ? "Aún no hay posts generados. Cuando generes el primero, aparecerá aquí."
              : "Aquí verás la tabla de posts con buscador y filtros."}
          </p>
        </div>
      </main>
    </div>
  );
}
