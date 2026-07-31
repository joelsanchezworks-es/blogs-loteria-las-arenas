"use client";

import { useCallback, useEffect, useState } from "react";
import Encabezado from "@/components/Encabezado";

export default function ReglasPage() {
  const [contenido, setContenido] = useState("");
  const [cargando, setCargando] = useState(true);
  const [regenerando, setRegenerando] = useState(false);
  const [pasos, setPasos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await fetch("/api/reglas");
      const d = await r.json();
      setContenido(d.contenido ?? "");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const regenerar = useCallback(async () => {
    if (!window.confirm("Regenerar reglas-estilo.md desde la plantilla actual. Se conservarán las decisiones de negocio. ¿Continuar?")) return;
    setRegenerando(true);
    setPasos([]);
    setError(null);
    try {
      const resp = await fetch("/api/reglas", { method: "POST" });
      if (!resp.body) throw new Error("Sin respuesta.");
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const linea = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!linea) continue;
          let ev: Record<string, unknown>;
          try {
            ev = JSON.parse(linea);
          } catch {
            continue;
          }
          if (ev.tipo === "paso") setPasos((p) => [...p, String(ev.texto)]);
          else if (ev.tipo === "fin") {
            if (ev.ok) setContenido(String(ev.contenido));
            else setError(String(ev.error));
          }
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRegenerando(false);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <Encabezado activo="reglas" />

      <main className="mx-auto max-w-[900px] px-5 py-6 sm:px-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">
              Reglas de estilo
            </p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-tenue">
              El corazón del sistema: se inyecta en cada generación. Si cambias{" "}
              <code className="text-oro/80">referencias/plantilla-ejemplo.html</code>, regénralas
              para que reflejen el nuevo diseño (se conservan las decisiones de negocio: nº 336,
              constantes, +18, no inventar datos…).
            </p>
          </div>
          <button
            type="button"
            onClick={regenerar}
            disabled={regenerando}
            className="shrink-0 rounded-md bg-oro px-4 py-2.5 text-sm font-bold uppercase tracking-[0.1em] text-noche transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {regenerando ? "Regenerando…" : "Regenerar reglas"}
          </button>
        </div>

        {regenerando && (
          <div className="mb-4 rounded-lg border border-borde bg-panel p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-3 w-3 animate-pulse rounded-full bg-oro" aria-hidden />
              <p className="text-sm text-claro">Regenerando reglas…</p>
            </div>
            <ul className="space-y-1">
              {pasos.map((p, i) => (
                <li key={i} className="text-xs text-tenue">
                  · {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200/90">
            {error}
          </div>
        )}

        {cargando ? (
          <p className="py-10 text-center text-sm text-tenue">Cargando…</p>
        ) : (
          <pre className="max-h-[70vh] overflow-auto rounded-xl border border-borde bg-panel p-4 text-xs leading-relaxed text-claro/90 whitespace-pre-wrap">
            {contenido || "(reglas-estilo.md vacío)"}
          </pre>
        )}
      </main>
    </div>
  );
}
