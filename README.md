# Generador de Contenido HTML · Lotería Las Arenas

Herramienta **local** para generar el HTML de los posts del blog de
[Lotería Las Arenas](https://www.loterialasarenas.com) (Administración Oficial
nº 336, C.C. Arenas de Barcelona), listos para pegar en GAdmin, siempre con el
mismo estilo y estructura de la plantilla de referencia.

Sueltas los temas (por texto o por archivo) y te devuelve el `post.html` montado,
más su `meta title` y `meta description`.

---

## ⚠️ Restricción clave: nada de API de pago

El motor de generación es el **CLI de Claude Code** (`claude`) autenticado con tu
**cuenta Claude Max**. Todo el consumo va contra esa suscripción.

- **No** se usa el SDK `@anthropic-ai/sdk` ni ninguna llamada a `api.anthropic.com`.
- **No** se usa ni se pide `ANTHROPIC_API_KEY` en ninguna parte del proyecto.
- La app corre solo en `localhost` (no se despliega en Vercel ni en ningún
  servidor), porque el motor es el binario `claude` de tu máquina.
- Al arrancar, la app comprueba que `ANTHROPIC_API_KEY` **no** está en el entorno.
  Si la detecta, muestra un aviso y bloquea la generación hasta que la quites (para
  no facturar por API en lugar de usar la suscripción).
- La generación lanza `claude -p` con `child_process.spawn` y **sin** `--bare`
  (ese modo salta la autenticación por suscripción).

---

## Requisitos previos

1. **Node.js 18.18+** (recomendado 20 o 22) y npm.
2. **CLI de Claude Code instalado y logueado con tu cuenta Max.** Antes de usar
   la app, ejecuta una vez:
   ```bash
   claude
   ```
   y comprueba con `/status` dentro de Claude que va **por suscripción** (no por API).
3. **Sin `ANTHROPIC_API_KEY` en el entorno.** Compruébalo:
   ```bash
   echo "$ANTHROPIC_API_KEY"      # macOS / Linux
   echo %ANTHROPIC_API_KEY%       # Windows (cmd)
   ```
   Si sale algo, quítala del perfil de tu shell (`~/.zshrc`, `~/.bashrc`, variables
   de entorno de Windows…) y abre una terminal nueva.

---

## Instalación y arranque

```bash
npm install
npm run generar      # arranca la app y abre el navegador en http://localhost:3000
```

O por separado:

```bash
npm run dev          # servidor en http://localhost:3000
```

---

## Cómo se usa

La interfaz tiene dos columnas (entrada / salida) y tres pestañas: **Generador**,
**Historial** y **Reglas**.

### Generar un post

1. **Por texto:** escribe el tema y los datos en el cuadro. Ejemplo:
   `Lotería del Niño 2027 — sorteo 6 de enero — décimo 20€ — El Gordo 200.000€ al décimo — se puede regalar`
2. **Por archivo:** arrastra uno o varios (PDF, DOCX, TXT, MD, HTML). Dos modos:
   - **Modo A — un archivo, un post** (por defecto): cada archivo genera un HTML.
   - **Modo B — un archivo, varios temas:** Claude lee el archivo, detecta y separa
     los temas y te muestra la lista para que confirmes, edites o descartes antes
     de generar. Luego genera un HTML por tema, en cola.
3. Rellena la **URL de la página** (opcional) y elige el **idioma** (Español /
   Català / English).
4. Pulsa **✦ Generar HTML**. Verás el progreso en tiempo real.
5. En la salida tienes pestañas **Vista previa / Código**, el bloque de **meta
   title / meta description** copiables, y los botones **Copiar HTML**,
   **Descargar .html**, **Regenerar** y **Abrir carpeta**. Con varios trabajos,
   una lista con el estado de cada uno y **Descargar todos (ZIP)**.

Las entradas por texto y por archivo se pueden usar por separado o combinadas.
Los trabajos se procesan **de uno en uno** (cola secuencial): si sueltas 6 PDFs,
no se lanzan 6 procesos `claude` a la vez.

### Historial (`/historial`)

Tabla por fecha con buscador (por título **y** por contenido), filtro por idioma
y por rango de fechas, y contador de posts del mes. Por cada entrada: ver (con
vista previa), copiar, descargar, duplicar (reabre el generador precargado),
abrir carpeta y borrar. Selección múltiple + **Descargar selección (ZIP)**.

### Reglas (`/reglas`)

Muestra `referencias/reglas-estilo.md` (las reglas que se inyectan en cada
generación) y permite **regenerarlas** desde la plantilla — ver abajo.

---

## La plantilla de referencia y las reglas de estilo

El estándar de diseño vive en `referencias/`:

- `referencias/plantilla-ejemplo.html` — un post real del blog que marca el estilo.
- `referencias/reglas-estilo.md` — las reglas extraídas de esa plantilla (paleta,
  tipografía, estructura, módulos, tono, reglas de contenido). **Es el corazón del
  sistema: se inyecta en el prompt de generación.**

### Actualizar la plantilla

1. Sustituye `referencias/plantilla-ejemplo.html` por el nuevo post de referencia.
2. Ve a la pestaña **Reglas** (`/reglas`) y pulsa **«Regenerar reglas»**. Se
   actualizan las reglas de **diseño** según la nueva plantilla y se **conservan**
   las decisiones de negocio (nº 336, constantes, coletilla +18, imágenes como
   placeholder, no inventar datos…). Como todo está versionado en Git, puedes
   revisar el cambio y revertirlo si hiciera falta.

---

## Persistencia y copia de seguridad

La "base de datos" es el **sistema de archivos** + `historial/index.json`. Cada
generación crea `historial/<fecha>-<slug>/` con:

- `post.html` — el cuerpo del artículo listo para pegar.
- `meta.json` — título, meta title/description, tema de entrada, URL destino,
  idioma, fecha, modo, archivo origen, nº de palabras y huecos `[[FALTA]]`.
- copia del archivo original (`origen.*`), si lo hubo.

Todo el historial **se versiona en Git** (es una ventaja: cada post queda
registrado). Para respaldarlo:

- Con Git: `git add historial && git commit -m "backup historial" && git push`.
- O copia manual de la carpeta `historial/` a otro disco.

---

## Reglas de la generación (resumen)

El prompt incluye `reglas-estilo.md` + la plantilla como referencia y estas normas:

- Devuelve **solo** el HTML del cuerpo (sin `<!DOCTYPE>/<html>/<head>/<body>`, sin
  vallas markdown ni comentarios). Todo con estilos **inline**.
- `meta title` (≤60) y `meta description` (≤155) van en `meta.json`, no en el HTML.
- 900–1.400 palabras salvo indicación contraria. Entradilla, `H2` por bloque, CTA final.
- Español natural de España (o el idioma elegido).
- **No inventa datos:** fechas, precios, importes y plazos solo salen del input; si
  falta un dato clave, deja el hueco visible `[[FALTA: …]]`.
- Imágenes como **placeholder dorado punteado** (sin URL inventada).
- Sin promesas de ganar. Juego responsable, +18 (coletilla al pie de cada post).

### Lectura de archivos

Se pasa la **ruta** del archivo al CLI, que lee PDF y DOCX de forma nativa sin
librerías extra. Como **respaldo** documentado, si el CLI no consigue leer un
archivo se extrae el texto con `unpdf` (PDF) / `mammoth` (DOCX) / lectura directa
(txt, md, html) y se reintenta.

---

## Estructura del proyecto

```
referencias/     plantilla-ejemplo.html + reglas-estilo.md
historial/       "base de datos" = sistema de archivos + index.json (versionado)
uploads-tmp/     archivos subidos en tránsito (gitignored)
src/app/         páginas (generador, historial, reglas) y rutas API
src/components/   Encabezado, AvisoEntorno, Generador
src/lib/         guard, claude (CLI), prompt, generacion, deteccion, historial,
                 cola, slug, subidas, archivos, reglas
scripts/         generar.mjs (npm run generar)
```

---

## Estado

Construido por fases, todas completadas:

- [x] **Fase 1** — Base (Next.js 15 + TS + Tailwind, tema, shell).
- [x] **Fase 2** — Puente con el CLI + guardia de `ANTHROPIC_API_KEY`.
- [x] **Fase 3** — Generación desde texto.
- [x] **Fase 4** — Generación desde archivos (Modo A / Modo B).
- [x] **Fase 5** — Historial (tabla, buscador, filtros).
- [x] **Fase 6** — Cola secuencial + descarga ZIP.
- [x] **Fase 7** — Pulido visual, botón Regenerar y regeneración de reglas.

---

## Aviso legal

Contenido para una administración de loterías oficial. Juego responsable, +18.
