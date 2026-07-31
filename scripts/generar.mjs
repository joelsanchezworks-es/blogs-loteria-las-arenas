#!/usr/bin/env node
// `npm run generar`: arranca el servidor de desarrollo y abre el navegador.
import { spawn } from "node:child_process";
import { platform } from "node:os";

const URL = process.env.URL_APP || "http://localhost:3000";
const esWindows = platform() === "win32";

// 1) Arranca Next en modo dev, heredando la salida en la terminal.
const dev = spawn("npm", ["run", "dev"], {
  stdio: "inherit",
  shell: esWindows,
});

// 2) Abre el navegador con el comando propio de cada sistema.
function abrirNavegador(url) {
  const cmd =
    platform() === "darwin" ? "open" : esWindows ? "cmd" : "xdg-open";
  const args = esWindows ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    console.log(`\nAbre manualmente: ${url}\n`);
  }
}

// 3) Espera a que el servidor responda (máx. ~30s) y entonces abre el navegador.
async function esperarYAbrir(url) {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(url);
      abrirNavegador(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  abrirNavegador(url);
}

esperarYAbrir(URL);

// 4) Propaga el cierre.
process.on("SIGINT", () => {
  dev.kill("SIGINT");
  process.exit(0);
});
dev.on("exit", (code) => process.exit(code ?? 0));
