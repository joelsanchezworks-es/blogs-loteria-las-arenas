import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

/**
 * Motor CLI (solo modo local, USE_LOCAL_STORAGE=true).
 *
 * Usa el binario `claude` autenticado con la suscripción Max. La generación
 * ahora DEVUELVE el texto (no escribe archivos): `claude -p --output-format json`
 * y leemos el campo `result`. Sin herramientas, sin --bare (para preservar la
 * autenticación por suscripción), y con el entorno hijo SIN ANTHROPIC_API_KEY.
 */

function entornoSinApiKey(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  return env;
}

/** Comprueba que el binario `claude` está disponible. */
export function cliDisponible(): Promise<boolean> {
  return new Promise((resolve) => {
    let hijo: ChildProcessWithoutNullStreams;
    try {
      hijo = spawn("claude", ["--version"], { env: process.env });
    } catch {
      resolve(false);
      return;
    }
    hijo.on("error", () => resolve(false));
    hijo.on("close", (code) => resolve(code === 0));
  });
}

/** Lanza `claude -p` con el prompt por stdin y devuelve el texto de la respuesta. */
export function generarTextoCli(
  prompt: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    let hijo: ChildProcessWithoutNullStreams;
    try {
      hijo = spawn("claude", ["-p", "--output-format", "json", "--max-turns", "1"], {
        env: entornoSinApiKey(),
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      reject(new Error(`No se pudo lanzar el CLI: ${String(e)}`));
      return;
    }

    const onAbort = () => {
      try {
        hijo.kill("SIGTERM");
      } catch {
        /* ya terminado */
      }
    };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    let out = "";
    let err = "";
    hijo.stdout.setEncoding("utf8");
    hijo.stdout.on("data", (d: string) => (out += d));
    hijo.stderr.setEncoding("utf8");
    hijo.stderr.on("data", (d: string) => (err += d));

    hijo.on("error", (e: NodeJS.ErrnoException) => {
      reject(
        new Error(
          e.code === "ENOENT"
            ? "No se encontró el binario `claude` en el PATH."
            : e.message,
        ),
      );
    });

    hijo.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (code !== 0) {
        reject(new Error(err.trim() || `El CLI terminó con código ${code}`));
        return;
      }
      try {
        const datos = JSON.parse(out) as { result?: unknown; is_error?: boolean };
        if (datos.is_error) {
          reject(new Error(typeof datos.result === "string" ? datos.result : "Error del CLI."));
          return;
        }
        resolve(typeof datos.result === "string" ? datos.result : "");
      } catch {
        // Si no vino como JSON, devolvemos el stdout en crudo.
        resolve(out);
      }
    });

    try {
      hijo.stdin.write(prompt);
      hijo.stdin.end();
    } catch (e) {
      reject(new Error(`No se pudo escribir el prompt en el CLI: ${String(e)}`));
    }
  });
}
