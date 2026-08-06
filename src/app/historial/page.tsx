"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Encabezado from "@/components/Encabezado";

type Entrada = {
  id: string;
  titulo: string;
  idioma: string;
  fecha: string;
  urlDestino: string | null;
  metaTitle: string;
  metaDescription: string;
  palabras: number;
  tieneFaltantes: boolean;
  archivoOrigen: string | null;
};

const IDIOMA_ETIQUETA: Record<string, string> = { es: "ES", ca: "CA", en: "EN" };

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function HistorialPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Entrada[]>([]);
  const [total, setTotal] = useState(0);
  const [mesActual, setMesActual] = useState(0);
  const [cargando, setCargando] = useState(true);

  const [q, setQ] = useState("");
  const [idioma, setIdioma] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [verId, setVerId] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [modoLocal, setModoLocal] = useState(false);

  useEffect(() => {
    fetch("/api/estado")
      .then((r) => r.json())
      .then((d) => setModoLocal(Boolean(d.modoLocal)))
      .catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (idioma) params.set("idioma", idioma);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    try {
      const resp = await fetch(`/api/historial?${params.toString()}`);
      const datos = await resp.json();
      setPosts(datos.posts ?? []);
      setTotal(datos.total ?? 0);
      setMesActual(datos.mesActual ?? 0);
    } catch {
      setPosts([]);
    } finally {
      setCargando(false);
    }
  }, [q, idioma, desde, hasta]);

  // Debounce sobre los filtros.
  useEffect(() => {
    const t = window.setTimeout(cargar, 250);
    return () => window.clearTimeout(t);
  }, [cargar]);

  const copiar = useCallback(async (id: string) => {
    const r = await fetch(`/api/historial/${id}`);
    const d = await r.json();
    if (d.ok) await navigator.clipboard.writeText(d.html).catch(() => {});
  }, []);

  const descargar = useCallback(async (id: string) => {
    const r = await fetch(`/api/historial/${id}`);
    const d = await r.json();
    if (!d.ok) return;
    const blob = new Blob([d.html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }, []);

  const duplicar = useCallback(
    async (id: string) => {
      const r = await fetch(`/api/historial/${id}`);
      const d = await r.json();
      if (!d.ok) return;
      sessionStorage.setItem(
        "duplicar-llarenas",
        JSON.stringify({
          texto: d.meta.temaEntrada ?? "",
          url: d.meta.urlDestino ?? "",
          idioma: d.meta.idioma ?? "es",
        }),
      );
      router.push("/");
    },
    [router],
  );

  const abrirCarpeta = useCallback(async (id: string) => {
    await fetch("/api/abrir-carpeta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  const borrar = useCallback(
    async (id: string) => {
      if (!window.confirm(`¿Borrar "${id}"? Esta acción no se puede deshacer.`)) return;
      await fetch(`/api/historial/${id}`, { method: "DELETE" }).catch(() => {});
      setSel((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      cargar();
    },
    [cargar],
  );

  const alternarSel = (id: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const todosVisibles = posts.length > 0 && posts.every((p) => sel.has(p.id));
  const alternarTodos = () =>
    setSel((prev) => {
      const n = new Set(prev);
      if (posts.every((p) => n.has(p.id))) posts.forEach((p) => n.delete(p.id));
      else posts.forEach((p) => n.add(p.id));
      return n;
    });

  const numSel = posts.filter((p) => sel.has(p.id)).length;

  const descargarZipSel = async () => {
    const ids = posts.filter((p) => sel.has(p.id)).map((p) => p.id);
    if (ids.length === 0) return;
    const resp = await fetch("/api/zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!resp.ok) return;
    const blob = await resp.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "posts-loteria-las-arenas.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen">
      <Encabezado activo="historial" />

      <main className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">Historial</p>
          <p className="text-xs text-tenue">
            <span className="text-claro">{mesActual}</span> este mes ·{" "}
            <span className="text-claro">{total}</span> en total
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título o contenido…"
            className="rounded-md border border-borde bg-panel px-3 py-2 text-sm text-claro placeholder:text-tenue/70 focus:border-oro/60 focus:outline-none"
          />
          <select
            value={idioma}
            onChange={(e) => setIdioma(e.target.value)}
            className="rounded-md border border-borde bg-panel px-3 py-2 text-sm text-claro focus:border-oro/60 focus:outline-none"
          >
            <option value="">Todos los idiomas</option>
            <option value="es">Español</option>
            <option value="ca">Català</option>
            <option value="en">English</option>
          </select>
          <label className="flex items-center gap-2 rounded-md border border-borde bg-panel px-3 py-2 text-xs text-tenue">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="flex-1 bg-transparent text-claro focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-md border border-borde bg-panel px-3 py-2 text-xs text-tenue">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="flex-1 bg-transparent text-claro focus:outline-none"
            />
          </label>
        </div>

        {/* Tabla */}
        {cargando ? (
          <p className="py-10 text-center text-sm text-tenue">Cargando…</p>
        ) : posts.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-borde bg-panel px-6 text-center">
            <div className="mb-3 h-[2px] w-9 rounded bg-oro/60" aria-hidden />
            <p className="max-w-sm text-sm leading-relaxed text-tenue">
              {total === 0
                ? "Aún no hay posts generados. Cuando generes el primero, aparecerá aquí."
                : "Ningún post coincide con los filtros."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs text-tenue">
                {numSel > 0 ? `${numSel} seleccionados` : "Selecciona posts para descargarlos juntos"}
              </p>
              <button
                type="button"
                onClick={descargarZipSel}
                disabled={numSel === 0}
                className="rounded-md border border-borde px-3 py-1.5 text-xs font-medium text-claro transition-colors hover:border-oro/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Descargar selección (ZIP)
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-borde">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-borde bg-panel text-left text-[10px] uppercase tracking-[0.15em] text-tenue">
                  <th className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={todosVisibles}
                      onChange={alternarTodos}
                      className="h-4 w-4 accent-[#C9A961]"
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Fecha</th>
                  <th className="px-3 py-2.5 font-semibold">Título</th>
                  <th className="px-3 py-2.5 font-semibold">Idioma</th>
                  <th className="px-3 py-2.5 font-semibold">Palabras</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-b border-borde/60 last:border-0 hover:bg-panel/50">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={sel.has(p.id)}
                        onChange={() => alternarSel(p.id)}
                        className="h-4 w-4 accent-[#C9A961]"
                        aria-label={`Seleccionar ${p.titulo}`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-tenue">{fmtFecha(p.fecha)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-claro">{p.titulo}</span>
                        {p.tieneFaltantes && (
                          <span
                            title="Tiene huecos [[FALTA]] por rellenar"
                            className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
                          >
                            faltan datos
                          </span>
                        )}
                        {p.archivoOrigen && (
                          <span className="rounded bg-oro/10 px-1.5 py-0.5 text-[10px] text-oro/80">archivo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-tenue">{IDIOMA_ETIQUETA[p.idioma] ?? p.idioma}</td>
                    <td className="px-3 py-2.5 text-tenue">{p.palabras}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap justify-end gap-1">
                        <AccionMini onClick={() => setVerId(p.id)}>Ver</AccionMini>
                        <AccionMini onClick={() => copiar(p.id)}>Copiar</AccionMini>
                        <AccionMini onClick={() => descargar(p.id)}>Descargar</AccionMini>
                        <AccionMini onClick={() => duplicar(p.id)}>Duplicar</AccionMini>
                        {modoLocal && (
                          <AccionMini onClick={() => abrirCarpeta(p.id)}>Carpeta</AccionMini>
                        )}
                        <AccionMini peligro onClick={() => borrar(p.id)}>
                          Borrar
                        </AccionMini>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </main>

      {verId && <ModalVer id={verId} onCerrar={() => setVerId(null)} onDescargar={() => descargar(verId)} onCopiar={() => copiar(verId)} />}
    </div>
  );
}

function AccionMini({
  onClick,
  children,
  peligro,
}: {
  onClick: () => void;
  children: React.ReactNode;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
        peligro
          ? "border-red-500/40 text-red-300 hover:bg-red-500/10"
          : "border-borde text-claro hover:border-oro/50"
      }`}
    >
      {children}
    </button>
  );
}

function ModalVer({
  id,
  onCerrar,
  onDescargar,
  onCopiar,
}: {
  id: string;
  onCerrar: () => void;
  onDescargar: () => void;
  onCopiar: () => void;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [pestana, setPestana] = useState<"vista" | "codigo">("vista");

  useEffect(() => {
    let vivo = true;
    fetch(`/api/historial/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (vivo && d.ok) setHtml(d.html);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCerrar}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-borde bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-borde px-4 py-3">
          <div className="flex gap-1 rounded-md border border-borde p-1">
            <button
              type="button"
              onClick={() => setPestana("vista")}
              className={`rounded px-3 py-1 text-xs font-medium ${pestana === "vista" ? "bg-oro/15 text-oro" : "text-tenue"}`}
            >
              Vista previa
            </button>
            <button
              type="button"
              onClick={() => setPestana("codigo")}
              className={`rounded px-3 py-1 text-xs font-medium ${pestana === "codigo" ? "bg-oro/15 text-oro" : "text-tenue"}`}
            >
              Código
            </button>
          </div>
          <div className="flex gap-1">
            <AccionMini onClick={onCopiar}>Copiar</AccionMini>
            <AccionMini onClick={onDescargar}>Descargar</AccionMini>
            <AccionMini onClick={onCerrar}>Cerrar ✕</AccionMini>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {html === null ? (
            <p className="py-10 text-center text-sm text-tenue">Cargando…</p>
          ) : pestana === "vista" ? (
            <iframe title="Vista previa" srcDoc={`<!doctype html><link rel="stylesheet" href="/arenas.css"><style>html,body{margin:0}</style>${html}`} className="h-[70vh] w-full rounded-lg border border-borde bg-noche" />
          ) : (
            <pre className="max-h-[70vh] overflow-auto rounded-lg border border-borde bg-noche p-3 text-xs leading-relaxed text-claro/90">
              <code>{html}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
