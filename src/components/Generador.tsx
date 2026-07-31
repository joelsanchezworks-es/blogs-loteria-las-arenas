"use client";

import { useCallback, useRef, useState } from "react";

type Idioma = "es" | "ca" | "en";

type MetaCliente = {
  id: string;
  titulo: string;
  metaTitle: string;
  metaDescription: string;
  palabras: number;
  faltantes: string[];
};

type Resultado = { id: string; html: string; meta: MetaCliente };

type Estado = "idle" | "en-cola" | "generando" | "listo" | "error";

export default function Generador({ bloqueado }: { bloqueado: boolean }) {
  const [texto, setTexto] = useState("");
  const [url, setUrl] = useState("");
  const [idioma, setIdioma] = useState<Idioma>("es");

  const [estado, setEstado] = useState<Estado>("idle");
  const [posicionCola, setPosicionCola] = useState(0);
  const [pasos, setPasos] = useState<string[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pestana, setPestana] = useState<"codigo" | "vista">("vista");
  const [copiado, setCopiado] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const generando = estado === "generando" || estado === "en-cola";
  const puedeGenerar = !bloqueado && !generando && texto.trim().length > 0;

  const copiar = useCallback(async (valor: string, cual: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(cual);
      window.setTimeout(() => setCopiado(null), 1500);
    } catch {
      /* clipboard no disponible */
    }
  }, []);

  const generar = useCallback(async () => {
    if (!texto.trim() || bloqueado) return;
    setEstado("en-cola");
    setPasos([]);
    setAvisos([]);
    setError(null);
    setResultado(null);
    setPosicionCola(0);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch("/api/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, url: url.trim() || null, idioma }),
        signal: ctrl.signal,
      });
      if (!resp.body) throw new Error("No hay respuesta del servidor.");

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
          manejarEvento(ev);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setEstado("error");
        setError(`No se pudo completar la generación: ${String(e)}`);
      }
    } finally {
      abortRef.current = null;
    }

    function manejarEvento(ev: Record<string, unknown>) {
      const tipo = ev.tipo;
      if (tipo === "estado") {
        if (ev.valor === "en-cola") {
          setEstado("en-cola");
          setPosicionCola(Number(ev.posicion) || 0);
        } else if (ev.valor === "generando") {
          setEstado("generando");
        }
      } else if (tipo === "paso") {
        setEstado("generando");
        setPasos((prev) => [...prev, String(ev.texto)]);
      } else if (tipo === "aviso") {
        setAvisos((prev) => [...prev, String(ev.texto)]);
      } else if (tipo === "fin") {
        if (ev.ok) {
          setResultado({
            id: String(ev.id),
            html: String(ev.html),
            meta: ev.meta as MetaCliente,
          });
          setPestana("vista");
          setEstado("listo");
        } else {
          setEstado("error");
          setError(String(ev.error || "Error desconocido."));
        }
      }
    }
  }, [texto, url, idioma, bloqueado]);

  const descargar = useCallback(() => {
    if (!resultado) return;
    const blob = new Blob([resultado.html], { type: "text/html;charset=utf-8" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `${resultado.id}.html`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(enlace.href);
  }, [resultado]);

  const abrirCarpeta = useCallback(async () => {
    if (!resultado) return;
    try {
      await fetch("/api/abrir-carpeta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resultado.id }),
      });
    } catch {
      /* solo funciona en local */
    }
  }, [resultado]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── ENTRADA ── */}
      <section className="rounded-xl border border-borde bg-panel p-5 sm:p-6">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">
          Entrada
        </p>

        {/* Dropzone (subida de archivos: fase siguiente) */}
        <div
          aria-disabled
          className="mb-5 flex cursor-not-allowed select-none flex-col items-center justify-center rounded-lg border-2 border-dashed border-borde px-4 py-7 text-center opacity-60"
          title="La subida de archivos llega en la siguiente fase"
        >
          <div className="mb-1 text-xl text-oro/70" aria-hidden>
            ⇪
          </div>
          <p className="text-xs text-tenue">
            Subida de archivos (PDF · DOCX · TXT · MD · HTML) — próxima fase
          </p>
        </div>

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-oro/70">
          Tema e instrucciones
        </label>
        <textarea
          rows={6}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={generando}
          placeholder={
            "Ej.: Lotería del Niño 2027 — sorteo 6 de enero — décimo 20€ — El Gordo 200.000€ al décimo — destacar que se puede regalar"
          }
          className="w-full resize-y rounded-md border border-borde bg-noche px-3 py-2.5 text-sm text-claro placeholder:text-tenue/70 focus:border-oro/60 focus:outline-none disabled:opacity-60"
        />

        <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-oro/70">
          URL de la página
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={generando}
          placeholder="https://www.loterialasarenas.com/…  (opcional)"
          className="w-full rounded-md border border-borde bg-noche px-3 py-2.5 text-sm text-claro placeholder:text-tenue/70 focus:border-oro/60 focus:outline-none disabled:opacity-60"
        />

        <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-oro/70">
          Idioma
        </label>
        <select
          value={idioma}
          onChange={(e) => setIdioma(e.target.value as Idioma)}
          disabled={generando}
          className="w-full rounded-md border border-borde bg-noche px-3 py-2.5 text-sm text-claro focus:border-oro/60 focus:outline-none disabled:opacity-60"
        >
          <option value="es">Español</option>
          <option value="ca">Català</option>
          <option value="en">English</option>
        </select>

        <button
          type="button"
          onClick={generar}
          disabled={!puedeGenerar}
          className="mt-6 w-full rounded-md bg-oro px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-noche transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generando ? "Generando…" : "✦ Generar HTML"}
        </button>
        {bloqueado && (
          <p className="mt-2 text-center text-xs text-tenue">
            Generación desactivada hasta resolver el aviso de arriba.
          </p>
        )}
      </section>

      {/* ── SALIDA ── */}
      <section className="rounded-xl border border-borde bg-panel p-5 sm:p-6">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">
          Salida
        </p>

        {estado === "idle" && <EstadoVacio />}

        {generando && (
          <Progreso pasos={pasos} enCola={estado === "en-cola"} posicion={posicionCola} />
        )}

        {estado === "error" && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <p className="text-sm font-bold text-red-300">No se pudo generar</p>
            <p className="mt-1 text-sm text-red-200/90">{error}</p>
            <button
              type="button"
              onClick={generar}
              disabled={!puedeGenerar}
              className="mt-3 rounded-md border border-borde px-3 py-1.5 text-xs font-medium text-claro hover:border-oro/50 disabled:opacity-40"
            >
              Reintentar
            </button>
          </div>
        )}

        {estado === "listo" && resultado && (
          <Salida
            resultado={resultado}
            pestana={pestana}
            setPestana={setPestana}
            avisos={avisos}
            copiado={copiado}
            onCopiarHtml={() => copiar(resultado.html, "html")}
            onCopiarMetaTitle={() => copiar(resultado.meta.metaTitle, "mt")}
            onCopiarMetaDesc={() => copiar(resultado.meta.metaDescription, "md")}
            onDescargar={descargar}
            onRegenerar={generar}
            onAbrirCarpeta={abrirCarpeta}
            puedeRegenerar={puedeGenerar}
          />
        )}
      </section>
    </div>
  );
}

function EstadoVacio() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-borde px-6 text-center">
      <div className="mb-3 h-[2px] w-9 rounded bg-oro/60" aria-hidden />
      <p className="max-w-xs text-sm leading-relaxed text-tenue">
        Esperando tema. Sube un archivo o escribe el tema y pulsa Generar.
      </p>
    </div>
  );
}

function Progreso({
  pasos,
  enCola,
  posicion,
}: {
  pasos: string[];
  enCola: boolean;
  posicion: number;
}) {
  return (
    <div className="min-h-[360px] rounded-lg border border-borde bg-noche/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 animate-pulse rounded-full bg-oro" aria-hidden />
        <p className="text-sm font-medium text-claro">
          {enCola ? `En cola (posición ${posicion})…` : "Generando…"}
        </p>
      </div>
      <ul className="space-y-1.5">
        {pasos.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-tenue">
            <span className="mt-0.5 text-oro/60" aria-hidden>
              ·
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Salida({
  resultado,
  pestana,
  setPestana,
  avisos,
  copiado,
  onCopiarHtml,
  onCopiarMetaTitle,
  onCopiarMetaDesc,
  onDescargar,
  onRegenerar,
  onAbrirCarpeta,
  puedeRegenerar,
}: {
  resultado: Resultado;
  pestana: "codigo" | "vista";
  setPestana: (p: "codigo" | "vista") => void;
  avisos: string[];
  copiado: string | null;
  onCopiarHtml: () => void;
  onCopiarMetaTitle: () => void;
  onCopiarMetaDesc: () => void;
  onDescargar: () => void;
  onRegenerar: () => void;
  onAbrirCarpeta: () => void;
  puedeRegenerar: boolean;
}) {
  const { meta, html } = resultado;

  return (
    <div>
      {avisos.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          {avisos.map((a, i) => (
            <p key={i} className="text-xs leading-relaxed text-amber-200/90">
              {a}
            </p>
          ))}
        </div>
      )}

      {/* Pestañas */}
      <div className="mb-3 flex gap-1 rounded-md border border-borde p-1">
        <BotonPestana activo={pestana === "vista"} onClick={() => setPestana("vista")}>
          Vista previa
        </BotonPestana>
        <BotonPestana activo={pestana === "codigo"} onClick={() => setPestana("codigo")}>
          Código
        </BotonPestana>
      </div>

      {pestana === "vista" ? (
        <iframe
          title="Vista previa del post"
          srcDoc={html}
          className="h-[520px] w-full rounded-lg border border-borde bg-white"
        />
      ) : (
        <pre className="h-[520px] overflow-auto rounded-lg border border-borde bg-noche p-3 text-xs leading-relaxed text-claro/90">
          <code>{html}</code>
        </pre>
      )}

      {/* Meta copiables */}
      <div className="mt-4 rounded-lg border border-borde bg-noche/50 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">
          Meta para SEO
        </p>
        <CampoMeta
          etiqueta="Meta title"
          valor={meta.metaTitle}
          limite={60}
          copiado={copiado === "mt"}
          onCopiar={onCopiarMetaTitle}
        />
        <div className="h-3" />
        <CampoMeta
          etiqueta="Meta description"
          valor={meta.metaDescription}
          limite={155}
          copiado={copiado === "md"}
          onCopiar={onCopiarMetaDesc}
        />
      </div>

      {/* Botones */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Boton onClick={onCopiarHtml}>{copiado === "html" ? "¡Copiado!" : "Copiar HTML"}</Boton>
        <Boton onClick={onDescargar}>Descargar .html</Boton>
        <Boton onClick={onRegenerar} deshabilitado={!puedeRegenerar}>
          Regenerar
        </Boton>
        <Boton onClick={onAbrirCarpeta}>Abrir carpeta</Boton>
      </div>
      <p className="mt-2 text-xs text-tenue">
        {meta.palabras} palabras · guardado en historial/{meta.id}
      </p>
    </div>
  );
}

function BotonPestana({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
        activo ? "bg-oro/15 text-oro" : "text-tenue hover:text-claro"
      }`}
    >
      {children}
    </button>
  );
}

function Boton({
  onClick,
  children,
  deshabilitado,
}: {
  onClick: () => void;
  children: React.ReactNode;
  deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className="rounded-md border border-borde px-3 py-1.5 text-xs font-medium text-claro transition-colors hover:border-oro/50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function CampoMeta({
  etiqueta,
  valor,
  limite,
  copiado,
  onCopiar,
}: {
  etiqueta: string;
  valor: string;
  limite: number;
  copiado: boolean;
  onCopiar: () => void;
}) {
  const largo = valor.length;
  const excede = largo > limite;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-tenue">
          {etiqueta}
        </span>
        <span className={`text-[10px] ${excede ? "text-red-400" : "text-tenue"}`}>
          {largo}/{limite}
        </span>
      </div>
      <div className="flex items-start gap-2">
        <p className="flex-1 rounded border border-borde bg-noche px-2.5 py-2 text-xs text-claro/90">
          {valor || <span className="text-tenue">(vacío)</span>}
        </p>
        <button
          type="button"
          onClick={onCopiar}
          className="shrink-0 rounded-md border border-borde px-2.5 py-2 text-[11px] font-medium text-claro hover:border-oro/50"
        >
          {copiado ? "✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
