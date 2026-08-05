"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Idioma = "es" | "ca" | "en";

type TemaUI = {
  titulo: string;
  datosClave: string;
  incluir: boolean;
  origenNombre: string | null;
};

/** Fuente de un trabajo del lote (lo que se reenvía al regenerar uno). */
type FuenteJob =
  | { clase: "archivo"; file: File }
  | { clase: "texto"; texto: string }
  | { clase: "tema"; titulo: string; datosClave: string };

type JobFuente = { fuente: FuenteJob; idioma: Idioma };

type ContextoLote = { url: string | null; idiomas: Idioma[] };

type MetaCliente = {
  id: string;
  titulo: string;
  metaTitle: string;
  metaDescription: string;
  palabras: number;
  faltantes: string[];
};

type Resultado = { id: string; html: string; meta: MetaCliente };

type EstadoJob = "pendiente" | "generando" | "listo" | "error";

type Job = {
  etiqueta: string;
  estado: EstadoJob;
  pasos: string[];
  avisos: string[];
  error?: string;
  resultado?: Resultado;
};

type Fase = "idle" | "detectando" | "confirmar" | "trabajando";

const EXT_OK = [".pdf", ".docx", ".txt", ".md", ".html", ".htm"];

// Siempre se generan los tres idiomas, un post por idioma. No hay selector.
const IDIOMAS_TODOS: Idioma[] = ["es", "ca", "en"];
const IDIOMA_COD: Record<Idioma, string> = { es: "ES", ca: "CA", en: "EN" };
const IDIOMA_LABEL: Record<Idioma, string> = { es: "Español", ca: "Català", en: "English" };

function formatoTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tipoDeNombre(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto >= 0 ? nombre.slice(punto + 1).toUpperCase() : "?";
}

function etiquetaFuente(f: FuenteJob): string {
  if (f.clase === "archivo") return f.file.name;
  if (f.clase === "tema") return f.titulo;
  return f.texto.slice(0, 60);
}

/** Estado agregado de un idioma a partir de los estados de sus trabajos. */
function estadoIdioma(indices: number[], trabajos: Job[]): EstadoJob {
  const estados = indices.map((i) => trabajos[i]?.estado).filter(Boolean) as EstadoJob[];
  if (estados.some((e) => e === "error")) return "error";
  if (estados.some((e) => e === "generando")) return "generando";
  if (estados.length > 0 && estados.every((e) => e === "listo")) return "listo";
  return "pendiente";
}

async function leerStream(resp: Response, onEvento: (ev: Record<string, unknown>) => void) {
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
      try {
        onEvento(JSON.parse(linea));
      } catch {
        /* línea no-JSON */
      }
    }
  }
}

export default function Generador({
  bloqueado,
  modoLocal,
}: {
  bloqueado: boolean;
  modoLocal: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [url, setUrl] = useState("");
  const [modo, setModo] = useState<"A" | "B">("A");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [idiomas, setIdiomas] = useState<Idioma[]>(["es"]); // por defecto solo ES

  const [fase, setFase] = useState<Fase>("idle");
  const [pasosDeteccion, setPasosDeteccion] = useState<string[]>([]);
  const [temas, setTemas] = useState<TemaUI[]>([]);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const [trabajos, setTrabajos] = useState<Job[]>([]);
  const [seleccion, setSeleccion] = useState(0);
  const [copiado, setCopiado] = useState<string | null>(null);

  const inputFile = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [fuentesLote, setFuentesLote] = useState<JobFuente[]>([]);
  const [contextoLote, setContextoLote] = useState<ContextoLote | null>(null);

  // Precarga desde "Duplicar" del historial.
  useEffect(() => {
    try {
      const bruto = sessionStorage.getItem("duplicar-llarenas");
      if (!bruto) return;
      sessionStorage.removeItem("duplicar-llarenas");
      const d = JSON.parse(bruto) as { texto?: string; url?: string; idioma?: string };
      if (d.texto) setTexto(d.texto);
      if (d.url) setUrl(d.url);
      if (d.idioma === "es" || d.idioma === "ca" || d.idioma === "en") setIdiomas([d.idioma]);
    } catch {
      /* nada */
    }
  }, []);

  const ocupado = fase === "detectando" || fase === "trabajando";
  const hayEntrada = archivos.length > 0 || texto.trim().length > 0;
  const puedeGenerar = !bloqueado && !ocupado && hayEntrada && idiomas.length > 0;

  const copiar = useCallback(async (valor: string, cual: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(cual);
      window.setTimeout(() => setCopiado(null), 1500);
    } catch {
      /* sin clipboard */
    }
  }, []);

  /* ── Añadir / quitar archivos (sin subida: se envían al generar) ── */
  const agregar = useCallback((lista: FileList | File[]) => {
    const files = Array.from(lista).filter((f) =>
      EXT_OK.some((e) => f.name.toLowerCase().endsWith(e)),
    );
    if (files.length === 0) {
      setErrorGlobal("Formato no admitido. Usa PDF, DOCX, TXT, MD o HTML.");
      return;
    }
    setErrorGlobal(null);
    setArchivos((prev) => [...prev, ...files]);
  }, []);

  const quitarArchivo = useCallback((idx: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  /** Aplica un evento del stream a un trabajo concreto (por índice global). */
  const aplicarEvento = useCallback((idx: number, ev: Record<string, unknown>) => {
    const tipo = ev.tipo;
    setTrabajos((prev) => {
      const copia = [...prev];
      const job = copia[idx];
      if (!job) return prev;
      if (tipo === "paso") {
        job.estado = "generando";
        job.pasos = [...job.pasos, String(ev.texto)];
      } else if (tipo === "aviso") {
        job.avisos = [...job.avisos, String(ev.texto)];
      } else if (tipo === "fin") {
        if (ev.ok) {
          job.estado = "listo";
          job.resultado = { id: String(ev.id), html: String(ev.html), meta: ev.meta as MetaCliente };
        } else {
          job.estado = "error";
          job.error = String(ev.error || "Error desconocido.");
        }
      }
      return copia;
    });
  }, []);

  /** Construye el FormData común (url + idiomas + fuentes). */
  const construirFormData = useCallback(
    (fuentes: FuenteJob[], urlLote: string | null, idiomas: Idioma[]) => {
      const fd = new FormData();
      fd.append("url", urlLote ?? "");
      fd.append("idiomas", JSON.stringify(idiomas));
      const temasFuente = fuentes.filter(
        (f): f is Extract<FuenteJob, { clase: "tema" }> => f.clase === "tema",
      );
      if (temasFuente.length > 0) {
        fd.append(
          "temas",
          JSON.stringify(temasFuente.map((t) => ({ titulo: t.titulo, datosClave: t.datosClave }))),
        );
      } else {
        for (const f of fuentes) {
          if (f.clase === "archivo") fd.append("archivos", f.file);
          else if (f.clase === "texto") fd.append("texto", f.texto);
        }
      }
      return fd;
    },
    [],
  );

  /* ── Ejecuta UN trabajo en su PROPIA petición. Clave para Vercel Hobby: cada
     post es una invocación serverless independiente, con sus 60s completos (si
     se generasen los 3 idiomas en una sola petición, sumarían >60s y caducaría).
     Mapea los eventos (job 0 del stream) al índice global i. ── */
  const ejecutarJob = useCallback(
    async (
      i: number,
      fuente: FuenteJob,
      idioma: Idioma,
      urlLote: string | null,
      signal: AbortSignal,
    ) => {
      const fd = construirFormData([fuente], urlLote, [idioma]);
      const resp = await fetch("/api/generar", { method: "POST", body: fd, signal });
      await leerStream(resp, (ev) => {
        if (ev.tipo === "lote") return; // cada petición trae su propio lote de 1
        aplicarEvento(i, ev);
      });
    },
    [construirFormData, aplicarEvento],
  );

  /* ── Lanzar un lote: fuentes × idiomas, CADA post en su propia petición
     (secuencial), para no agotar el límite de 60s con varias generaciones. ── */
  const generarLote = useCallback(
    async (fuentes: FuenteJob[], ctx: ContextoLote) => {
      const idiomasOrd = IDIOMAS_TODOS.filter((l) => ctx.idiomas.includes(l));
      if (fuentes.length === 0 || idiomasOrd.length === 0) return;
      setFase("trabajando");
      setSeleccion(0);
      setErrorGlobal(null);
      // Expandimos fuentes × idiomas (por fuente). Este orden fija el índice de
      // cada trabajo, que usamos para mostrarlo y para regenerarlo.
      const expandido: JobFuente[] = [];
      for (const f of fuentes) for (const idi of idiomasOrd) expandido.push({ fuente: f, idioma: idi });
      setFuentesLote(expandido);
      setContextoLote({ url: ctx.url, idiomas: idiomasOrd });
      setTrabajos(
        expandido.map(({ fuente, idioma }) => ({
          etiqueta:
            etiquetaFuente(fuente) + (idiomasOrd.length > 1 ? ` · ${IDIOMA_COD[idioma]}` : ""),
          estado: "pendiente",
          pasos: [],
          avisos: [],
        })),
      );
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        for (let i = 0; i < expandido.length; i++) {
          if (ctrl.signal.aborted) break;
          try {
            await ejecutarJob(i, expandido[i].fuente, expandido[i].idioma, ctx.url, ctrl.signal);
          } catch (e) {
            if ((e as Error).name === "AbortError") break;
            aplicarEvento(i, { tipo: "fin", ok: false, error: `No se pudo generar: ${String(e)}` });
          }
        }
      } finally {
        abortRef.current = null;
      }
    },
    [ejecutarJob, aplicarEvento],
  );

  /* ── Regenerar un solo trabajo EN SITIO (sin perder los demás idiomas). ── */
  const regenerarEnSitio = useCallback(
    async (i: number) => {
      const item = fuentesLote[i];
      const ctx = contextoLote;
      if (!item || !ctx) return;
      setSeleccion(i);
      setTrabajos((prev) => {
        const copia = [...prev];
        if (copia[i]) copia[i] = { ...copia[i], estado: "pendiente", pasos: [], avisos: [], error: undefined, resultado: undefined };
        return copia;
      });
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        await ejecutarJob(i, item.fuente, item.idioma, ctx.url, ctrl.signal);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setErrorGlobal(`No se pudo regenerar: ${String(e)}`);
      } finally {
        abortRef.current = null;
      }
    },
    [fuentesLote, contextoLote, ejecutarJob],
  );

  /* ── Modo B: detección de temas (todos los archivos en una petición) ── */
  const detectar = useCallback(async () => {
    setFase("detectando");
    setPasosDeteccion([]);
    setErrorGlobal(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const recopilados: TemaUI[] = [];
    try {
      const fd = new FormData();
      archivos.forEach((f) => fd.append("archivos", f));
      const resp = await fetch("/api/detectar", { method: "POST", body: fd, signal: ctrl.signal });
      await leerStream(resp, (ev) => {
        if (ev.tipo === "paso" || ev.tipo === "aviso") {
          setPasosDeteccion((p) => [...p, String(ev.texto)]);
        } else if (ev.tipo === "fin" && ev.ok) {
          const lista =
            (ev.temas as { titulo: string; datosClave: string; origenNombre?: string }[]) ?? [];
          lista.forEach((t) =>
            recopilados.push({
              titulo: t.titulo,
              datosClave: t.datosClave,
              incluir: true,
              origenNombre: t.origenNombre ?? null,
            }),
          );
        } else if (ev.tipo === "fin" && !ev.ok) {
          setErrorGlobal(String(ev.error));
        }
      });
      // Si además hay texto escrito, lo añadimos como tema editable.
      if (texto.trim()) {
        recopilados.push({
          titulo: texto.trim().slice(0, 60),
          datosClave: texto.trim(),
          incluir: true,
          origenNombre: null,
        });
      }
      if (recopilados.length === 0) {
        setErrorGlobal((prev) => prev ?? "No se detectaron temas en los archivos.");
        setFase("idle");
        return;
      }
      setTemas(recopilados);
      setFase("confirmar");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErrorGlobal(`Error en la detección: ${String(e)}`);
      setFase("idle");
    } finally {
      abortRef.current = null;
    }
  }, [archivos, texto]);

  const cancelar = useCallback(() => {
    abortRef.current?.abort();
    setFase("idle");
  }, []);

  // Selección de idioma ÚNICA: marcar uno deselecciona los demás (máx. 1 por
  // generación, para no encadenar generaciones y no superar el timeout).
  const elegirIdioma = useCallback((l: Idioma) => setIdiomas([l]), []);

  /* ── Botón principal ── */
  const onGenerar = useCallback(() => {
    if (!puedeGenerar) return;
    if (modo === "B" && archivos.length > 0) {
      detectar();
      return;
    }
    const fuentes: FuenteJob[] = archivos.map((f) => ({ clase: "archivo", file: f }));
    if (texto.trim()) fuentes.push({ clase: "texto", texto: texto.trim() });
    if (fuentes.length === 0) return;
    generarLote(fuentes, { url: url.trim() || null, idiomas });
  }, [puedeGenerar, modo, archivos, texto, url, idiomas, detectar, generarLote]);

  const confirmarTemas = useCallback(() => {
    const incluidos = temas.filter((t) => t.incluir && t.titulo.trim());
    if (incluidos.length === 0) return;
    const fuentes: FuenteJob[] = incluidos.map((t) => ({
      clase: "tema",
      titulo: t.titulo.trim(),
      datosClave: t.datosClave.trim(),
    }));
    generarLote(fuentes, { url: url.trim() || null, idiomas });
  }, [temas, url, idiomas, generarLote]);

  const abrirCarpeta = useCallback(async (id: string) => {
    try {
      await fetch("/api/abrir-carpeta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      /* solo local */
    }
  }, []);

  const descargar = useCallback((r: Resultado) => {
    const blob = new Blob([r.html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${r.id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }, []);

  const descargarZip = useCallback(async (ids: string[]) => {
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
  }, []);

  const idsListos = trabajos.filter((t) => t.resultado).map((t) => t.resultado!.id);
  const idiomasPresentes = IDIOMAS_TODOS.filter((idi) => fuentesLote.some((jf) => jf.idioma === idi));
  const indicesIdioma = (idi: Idioma) =>
    trabajos.map((_, i) => i).filter((i) => fuentesLote[i]?.idioma === idi);
  const idiomaActivo: Idioma = fuentesLote[seleccion]?.idioma ?? idiomasPresentes[0] ?? "es";
  const indicesActual = indicesIdioma(idiomaActivo);
  const jobSel = trabajos[seleccion];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── ENTRADA ── */}
      <section className="rounded-xl border border-borde bg-panel p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">Entrada</p>
          {archivos.length > 0 && (
            <div className="flex items-center gap-1 rounded-md border border-borde p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setModo("A")}
                className={`rounded px-2 py-1 font-medium ${modo === "A" ? "bg-oro/15 text-oro" : "text-tenue"}`}
                title="Cada archivo genera un post"
              >
                A · un archivo, un post
              </button>
              <button
                type="button"
                onClick={() => setModo("B")}
                className={`rounded px-2 py-1 font-medium ${modo === "B" ? "bg-oro/15 text-oro" : "text-tenue"}`}
                title="Un archivo con varios temas; los confirmas antes de generar"
              >
                B · varios temas
              </button>
            </div>
          )}
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            if (e.dataTransfer.files.length) agregar(e.dataTransfer.files);
          }}
          onClick={() => inputFile.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
            arrastrando ? "border-oro/70 bg-oro/5" : "border-borde hover:border-oro/40"
          }`}
        >
          <div className="mb-1 text-xl text-oro/70" aria-hidden>
            ⇪
          </div>
          <p className="text-sm text-claro">Arrastra archivos o haz clic</p>
          <p className="mt-1 text-xs text-tenue">PDF · DOCX · TXT · MD · HTML</p>
          <input
            ref={inputFile}
            type="file"
            multiple
            accept={EXT_OK.join(",")}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) agregar(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {archivos.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {archivos.map((a, i) => (
              <li
                key={`${a.name}-${a.size}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-borde bg-noche px-3 py-2 text-xs"
              >
                <span className="truncate text-claro">
                  <span className="text-oro/80">{tipoDeNombre(a.name)}</span> · {a.name}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-tenue">{formatoTamano(a.size)}</span>
                  <button
                    type="button"
                    onClick={() => quitarArchivo(i)}
                    className="text-tenue hover:text-red-300"
                    aria-label={`Quitar ${a.name}`}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-tenue">
          <span className="h-px flex-1 bg-borde" />
          y/o escribe el tema
          <span className="h-px flex-1 bg-borde" />
        </div>

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-oro/70">
          Tema e instrucciones
        </label>
        <textarea
          rows={5}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={ocupado}
          placeholder="Ej.: Lotería del Niño 2027 — sorteo 6 de enero — décimo 20€ — El Gordo 200.000€ al décimo — se puede regalar"
          className="w-full resize-y rounded-md border border-borde bg-noche px-3 py-2.5 text-sm text-claro placeholder:text-tenue/70 focus:border-oro/60 focus:outline-none disabled:opacity-60"
        />

        <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-oro/70">
          URL de la página
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={ocupado}
          placeholder="https://www.loterialasarenas.com/…  (opcional)"
          className="w-full rounded-md border border-borde bg-noche px-3 py-2.5 text-sm text-claro placeholder:text-tenue/70 focus:border-oro/60 focus:outline-none disabled:opacity-60"
        />

        {/* Selector de idioma ÚNICO (máx. 1 por generación): marcar uno
            deselecciona los demás. Cada generación es un post en su idioma. */}
        <label className="mb-1.5 mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-oro/70">
          Idioma
          <span className="ml-2 font-normal normal-case tracking-normal text-tenue">
            · un idioma por generación
          </span>
        </label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {IDIOMAS_TODOS.map((l) => {
            const activo = idiomas[0] === l;
            return (
              <label
                key={l}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                  activo ? "border-oro/60 bg-oro/10 text-claro" : "border-borde text-tenue hover:border-oro/40"
                } ${ocupado ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={activo}
                  disabled={ocupado}
                  onChange={() => elegirIdioma(l)}
                  className="h-4 w-4 accent-[#C9A961]"
                />
                {IDIOMA_LABEL[l]}
              </label>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onGenerar}
          disabled={!puedeGenerar}
          className="mt-6 w-full rounded-md bg-oro px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-noche transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ocupado
            ? "Trabajando…"
            : modo === "B" && archivos.length > 0
              ? "✦ Detectar temas"
              : `✦ Generar HTML${idiomas.length ? " · " + idiomas.map((l) => IDIOMA_COD[l]).join(" · ") : ""}`}
        </button>
        {ocupado && (
          <button
            type="button"
            onClick={cancelar}
            className="mt-2 w-full rounded-md border border-borde px-4 py-2 text-xs font-medium text-tenue transition-colors hover:border-red-400/50 hover:text-red-300"
          >
            Cancelar
          </button>
        )}
        {bloqueado && (
          <p className="mt-2 text-center text-xs text-tenue">
            Generación desactivada hasta resolver el aviso de arriba.
          </p>
        )}
        {errorGlobal && <p className="mt-2 text-center text-xs text-red-300">{errorGlobal}</p>}
      </section>

      {/* ── SALIDA ── */}
      <section className="rounded-xl border border-borde bg-panel p-5 sm:p-6">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">Salida</p>

        {fase === "idle" && <EstadoVacio />}

        {fase === "detectando" && <Progreso titulo="Analizando el archivo…" pasos={pasosDeteccion} />}

        {fase === "confirmar" && (
          <EditorTemas
            temas={temas}
            setTemas={setTemas}
            onConfirmar={confirmarTemas}
            onCancelar={() => setFase("idle")}
          />
        )}

        {fase === "trabajando" && trabajos.length > 0 && (
          <div>
            {trabajos.length > 1 && (
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs text-tenue">
                  {idsListos.length}/{trabajos.length} listos
                </p>
                <button
                  type="button"
                  onClick={() => descargarZip(idsListos)}
                  disabled={idsListos.length === 0}
                  className="rounded-md border border-borde px-3 py-1.5 text-xs font-medium text-claro transition-colors hover:border-oro/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Descargar todos (ZIP)
                </button>
              </div>
            )}

            {/* Pestañas por idioma: ES | CA | EN */}
            {idiomasPresentes.length > 1 && (
              <TabsIdioma
                idiomas={idiomasPresentes}
                activo={idiomaActivo}
                estadoDe={(idi) => estadoIdioma(indicesIdioma(idi), trabajos)}
                onSelect={(idi) => setSeleccion(indicesIdioma(idi)[0] ?? 0)}
              />
            )}

            {/* Si dentro del idioma hay varias fuentes, sub-lista para elegir. */}
            {indicesActual.length > 1 && (
              <ListaTrabajos
                items={indicesActual.map((i) => ({
                  index: i,
                  etiqueta: fuentesLote[i] ? etiquetaFuente(fuentesLote[i].fuente) : trabajos[i].etiqueta,
                  estado: trabajos[i].estado,
                }))}
                seleccion={seleccion}
                onSelect={setSeleccion}
              />
            )}

            {jobSel && (
              <VistaTrabajo
                job={jobSel}
                copiado={copiado}
                modoLocal={modoLocal}
                idioma={fuentesLote[seleccion]?.idioma}
                onCopiarHtml={() => jobSel.resultado && copiar(jobSel.resultado.html, "html")}
                onCopiarMt={() => jobSel.resultado && copiar(jobSel.resultado.meta.metaTitle, "mt")}
                onCopiarMd={() => jobSel.resultado && copiar(jobSel.resultado.meta.metaDescription, "md")}
                onDescargar={() => jobSel.resultado && descargar(jobSel.resultado)}
                onAbrirCarpeta={() => jobSel.resultado && abrirCarpeta(jobSel.resultado.id)}
                onRegenerar={() => regenerarEnSitio(seleccion)}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Sub-vistas ── */

function EstadoVacio() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-borde px-6 text-center">
      <div className="mb-3 h-[2px] w-9 rounded bg-oro/60" aria-hidden />
      <p className="max-w-xs text-sm leading-relaxed text-tenue">
        Esperando tema. Sube un archivo o escribe el tema y pulsa Generar; se crean los tres idiomas.
      </p>
    </div>
  );
}

function Progreso({ titulo, pasos }: { titulo: string; pasos: string[] }) {
  return (
    <div className="min-h-[200px] rounded-lg border border-borde bg-noche/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 animate-pulse rounded-full bg-oro" aria-hidden />
        <p className="text-sm font-medium text-claro">{titulo}</p>
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

function EditorTemas({
  temas,
  setTemas,
  onConfirmar,
  onCancelar,
}: {
  temas: TemaUI[];
  setTemas: React.Dispatch<React.SetStateAction<TemaUI[]>>;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const actualizar = (i: number, campo: "titulo" | "datosClave", valor: string) =>
    setTemas((prev) => prev.map((t, k) => (k === i ? { ...t, [campo]: valor } : t)));
  const alternar = (i: number) =>
    setTemas((prev) => prev.map((t, k) => (k === i ? { ...t, incluir: !t.incluir } : t)));
  const incluidos = temas.filter((t) => t.incluir).length;

  return (
    <div>
      <p className="mb-3 text-sm text-claro">
        Se han detectado <strong className="text-oro">{temas.length}</strong> temas. Revisa, edita o
        descarta y confirma para generar (cada tema, en los 3 idiomas).
      </p>
      <ul className="max-h-[380px] space-y-2 overflow-auto pr-1">
        {temas.map((t, i) => (
          <li
            key={i}
            className={`rounded-lg border p-3 ${t.incluir ? "border-borde bg-noche" : "border-borde/50 bg-noche/40 opacity-60"}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={t.incluir}
                onChange={() => alternar(i)}
                className="h-4 w-4 accent-[#C9A961]"
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-tenue">
                Tema {i + 1}
                {t.origenNombre ? ` · ${t.origenNombre}` : ""}
              </span>
            </div>
            <input
              value={t.titulo}
              onChange={(e) => actualizar(i, "titulo", e.target.value)}
              className="mb-1.5 w-full rounded border border-borde bg-panel px-2.5 py-1.5 text-sm font-medium text-claro focus:border-oro/60 focus:outline-none"
              placeholder="Título del tema"
            />
            <textarea
              value={t.datosClave}
              onChange={(e) => actualizar(i, "datosClave", e.target.value)}
              rows={2}
              className="w-full resize-y rounded border border-borde bg-panel px-2.5 py-1.5 text-xs text-claro/90 focus:border-oro/60 focus:outline-none"
              placeholder="Datos clave"
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onConfirmar}
          disabled={incluidos === 0}
          className="flex-1 rounded-md bg-oro px-4 py-2.5 text-sm font-bold uppercase tracking-[0.1em] text-noche hover:opacity-90 disabled:opacity-40"
        >
          Generar {incluidos} tema{incluidos === 1 ? "" : "s"} × 3 idiomas
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-md border border-borde px-4 py-2.5 text-sm font-medium text-claro hover:border-oro/50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

const COLOR_ESTADO: Record<EstadoJob, string> = {
  pendiente: "bg-tenue/40",
  generando: "bg-oro animate-pulse",
  listo: "bg-emerald-400",
  error: "bg-red-400",
};

function TabsIdioma({
  idiomas,
  activo,
  estadoDe,
  onSelect,
}: {
  idiomas: Idioma[];
  activo: Idioma;
  estadoDe: (idi: Idioma) => EstadoJob;
  onSelect: (idi: Idioma) => void;
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-md border border-borde p-1">
      {idiomas.map((idi) => {
        const on = idi === activo;
        return (
          <button
            key={idi}
            type="button"
            onClick={() => onSelect(idi)}
            title={IDIOMA_LABEL[idi]}
            className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              on ? "bg-oro/15 text-oro" : "text-tenue hover:text-claro"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${COLOR_ESTADO[estadoDe(idi)]}`} aria-hidden />
            {IDIOMA_COD[idi]}
          </button>
        );
      })}
    </div>
  );
}

function ListaTrabajos({
  items,
  seleccion,
  onSelect,
}: {
  items: { index: number; etiqueta: string; estado: EstadoJob }[];
  seleccion: number;
  onSelect: (i: number) => void;
}) {
  return (
    <ul className="mb-4 space-y-1.5">
      {items.map(({ index, etiqueta, estado }) => (
        <li key={index}>
          <button
            type="button"
            onClick={() => onSelect(index)}
            className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
              index === seleccion ? "border-oro/50 bg-oro/10" : "border-borde hover:border-oro/30"
            }`}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_ESTADO[estado]}`} aria-hidden />
            <span className="flex-1 truncate text-claro">{etiqueta}</span>
            <span className="shrink-0 text-tenue">{estado}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function VistaTrabajo({
  job,
  copiado,
  modoLocal,
  idioma,
  onCopiarHtml,
  onCopiarMt,
  onCopiarMd,
  onDescargar,
  onAbrirCarpeta,
  onRegenerar,
}: {
  job: Job;
  copiado: string | null;
  modoLocal: boolean;
  idioma?: Idioma;
  onCopiarHtml: () => void;
  onCopiarMt: () => void;
  onCopiarMd: () => void;
  onDescargar: () => void;
  onAbrirCarpeta: () => void;
  onRegenerar: () => void;
}) {
  const [pestana, setPestana] = useState<"vista" | "codigo">("vista");

  if (job.estado === "error") {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
        <p className="text-sm font-bold text-red-300">
          No se pudo generar{idioma ? ` · ${IDIOMA_COD[idioma]}` : ""}
        </p>
        <p className="mt-1 text-sm text-red-200/90">{job.error}</p>
        <button
          type="button"
          onClick={onRegenerar}
          className="mt-3 rounded-md border border-borde px-3 py-1.5 text-xs font-medium text-claro hover:border-oro/50"
        >
          Regenerar
        </button>
      </div>
    );
  }

  if (job.estado !== "listo" || !job.resultado) {
    return (
      <Progreso
        titulo={`Generando${idioma ? ` · ${IDIOMA_LABEL[idioma]}` : ""}…`}
        pasos={job.pasos}
      />
    );
  }

  const { html, meta } = job.resultado;
  return (
    <div>
      {job.avisos.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          {job.avisos.map((a, i) => (
            <p key={i} className="text-xs leading-relaxed text-amber-200/90">
              {a}
            </p>
          ))}
        </div>
      )}

      {idioma && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-oro/70">
          {IDIOMA_LABEL[idioma]}
        </p>
      )}

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
          className="h-[480px] w-full rounded-lg border border-borde bg-white"
        />
      ) : (
        <pre className="h-[480px] overflow-auto rounded-lg border border-borde bg-noche p-3 text-xs leading-relaxed text-claro/90">
          <code>{html}</code>
        </pre>
      )}

      <div className="mt-4 rounded-lg border border-borde bg-noche/50 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-oro/70">Meta para SEO</p>
        <CampoMeta etiqueta="Meta title" valor={meta.metaTitle} limite={60} copiado={copiado === "mt"} onCopiar={onCopiarMt} />
        <div className="h-3" />
        <CampoMeta etiqueta="Meta description" valor={meta.metaDescription} limite={155} copiado={copiado === "md"} onCopiar={onCopiarMd} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Boton onClick={onCopiarHtml}>{copiado === "html" ? "¡Copiado!" : "Copiar HTML"}</Boton>
        <Boton onClick={onDescargar}>Descargar .html</Boton>
        <Boton onClick={onRegenerar}>Regenerar</Boton>
        {modoLocal && <Boton onClick={onAbrirCarpeta}>Abrir carpeta</Boton>}
      </div>
      <p className="mt-2 text-xs text-tenue">
        {meta.palabras} palabras
        {idioma ? ` · ${IDIOMA_COD[idioma]}` : ""} ·{" "}
        {modoLocal ? `guardado en historial/${meta.id}` : "guardado en el historial"}
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

function Boton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-borde px-3 py-1.5 text-xs font-medium text-claro transition-colors hover:border-oro/50"
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
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-tenue">{etiqueta}</span>
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
