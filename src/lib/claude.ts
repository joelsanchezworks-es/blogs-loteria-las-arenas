import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

/**
 * Puente con el CLI de Claude Code en modo headless.
 *
 * - Se usa `claude -p --output-format stream-json --verbose` para pintar el
 *   progreso en tiempo real (NDJSON, un evento JSON por línea).
 * - NO se usa `--bare`: ese modo salta OAuth/keychain y empujaría hacia la API de
 *   pago. Necesitamos la ruta normal para autenticar con la suscripción Max.
 * - El prompt se envía por stdin para no chocar con el límite de longitud de argv
 *   (las reglas + instrucciones pueden ser largas).
 * - El entorno hijo se hereda pero SIN `ANTHROPIC_API_KEY` (defensa extra; la
 *   guardia ya bloquea el arranque si existe).
 */

export const TOOLS_POR_DEFECTO = ["Read", "Write", "Glob"] as const;

export type OpcionesGeneracion = {
  /** Directorio de trabajo (raíz del repo). */
  cwd: string;
  /** Herramientas auto-aprobadas. Por defecto Read,Write,Glob. */
  allowedTools?: string[];
  /** Límite de turnos agénticos. Por defecto 8. */
  maxTurns?: number;
  /** Modelo (alias o nombre completo). Por defecto, el de la sesión logueada. */
  model?: string;
  /** Directorios extra a los que dar acceso de lectura/escritura. */
  addDirs?: string[];
  /** Para cancelar la generación. */
  signal?: AbortSignal;
};

export type ManejadoresClaude = {
  /** Cada línea NDJSON ya parseada a objeto. */
  onEvento?: (evento: Record<string, unknown>) => void;
  /** Cada línea cruda (por si se quiere reenviar tal cual). */
  onLineaCruda?: (linea: string) => void;
  /** Fragmentos de stderr. */
  onStderr?: (texto: string) => void;
};

export type ResultadoClaude = {
  ok: boolean;
  code: number | null;
  error?: string;
};

/** Construye los argumentos del CLI (flags verificados en la doc de headless). */
export function construirArgs(opts: OpcionesGeneracion): string[] {
  const args: string[] = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--allowedTools",
    (opts.allowedTools ?? [...TOOLS_POR_DEFECTO]).join(","),
    "--max-turns",
    String(opts.maxTurns ?? 8),
  ];
  if (opts.model) args.push("--model", opts.model);
  for (const dir of opts.addDirs ?? []) args.push("--add-dir", dir);
  return args;
}

/** Entorno para el proceso hijo: hereda todo menos la API key. */
function entornoSinApiKey(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  return env;
}

/**
 * Lanza el CLI con el prompt indicado y va entregando los eventos por callbacks.
 * Resuelve cuando el proceso termina.
 */
export function ejecutarClaude(
  prompt: string,
  opts: OpcionesGeneracion,
  manejadores: ManejadoresClaude = {},
): Promise<ResultadoClaude> {
  return new Promise((resolve) => {
    let hijo: ChildProcessWithoutNullStreams;
    try {
      hijo = spawn("claude", construirArgs(opts), {
        cwd: opts.cwd,
        env: entornoSinApiKey(),
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      resolve({ ok: false, code: null, error: `No se pudo lanzar el CLI: ${String(e)}` });
      return;
    }

    const onAbort = () => {
      try {
        hijo.kill("SIGTERM");
      } catch {
        /* proceso ya terminado */
      }
    };
    if (opts.signal) {
      if (opts.signal.aborted) onAbort();
      else opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    // stdout: NDJSON troceado por líneas.
    let buffer = "";
    hijo.stdout.setEncoding("utf8");
    hijo.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const linea = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!linea) continue;
        manejadores.onLineaCruda?.(linea);
        try {
          manejadores.onEvento?.(JSON.parse(linea) as Record<string, unknown>);
        } catch {
          /* línea no-JSON: se ignora */
        }
      }
    });

    let stderr = "";
    hijo.stderr.setEncoding("utf8");
    hijo.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      manejadores.onStderr?.(chunk);
    });

    hijo.on("error", (e: NodeJS.ErrnoException) => {
      const msg =
        e.code === "ENOENT"
          ? "No se encontró el binario `claude` en el PATH. Instala Claude Code y comprueba que `claude --version` funciona."
          : e.message;
      resolve({ ok: false, code: null, error: msg });
    });

    hijo.on("close", (code) => {
      opts.signal?.removeEventListener("abort", onAbort);
      const resto = buffer.trim();
      if (resto) {
        manejadores.onLineaCruda?.(resto);
        try {
          manejadores.onEvento?.(JSON.parse(resto) as Record<string, unknown>);
        } catch {
          /* resto no-JSON */
        }
      }
      resolve({
        ok: code === 0,
        code,
        error: code === 0 ? undefined : stderr.trim() || `El CLI terminó con código ${code}`,
      });
    });

    // Enviar el prompt por stdin y cerrar.
    try {
      hijo.stdin.write(prompt);
      hijo.stdin.end();
    } catch (e) {
      resolve({ ok: false, code: null, error: `No se pudo escribir el prompt en el CLI: ${String(e)}` });
    }
  });
}

export type EstadoCli = {
  disponible: boolean;
  version: string | null;
  error?: string;
};

/** Comprueba que el binario `claude` está disponible (`claude --version`). */
export function verificarCli(): Promise<EstadoCli> {
  return new Promise((resolve) => {
    let hijo: ChildProcessWithoutNullStreams;
    try {
      hijo = spawn("claude", ["--version"], { env: process.env });
    } catch (e) {
      resolve({ disponible: false, version: null, error: String(e) });
      return;
    }
    let out = "";
    let err = "";
    hijo.stdout.on("data", (d) => (out += d));
    hijo.stderr.on("data", (d) => (err += d));
    hijo.on("error", (e: NodeJS.ErrnoException) => {
      resolve({
        disponible: false,
        version: null,
        error:
          e.code === "ENOENT"
            ? "No se encontró el binario `claude` en el PATH."
            : e.message,
      });
    });
    hijo.on("close", (code) => {
      if (code === 0) resolve({ disponible: true, version: out.trim() });
      else resolve({ disponible: false, version: null, error: err.trim() || `exit ${code}` });
    });
  });
}
