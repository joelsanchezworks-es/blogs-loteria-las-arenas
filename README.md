# Generador de Contenido HTML · Lotería Las Arenas

Herramienta **local** para generar el HTML de los posts del blog de
[Lotería Las Arenas](https://www.loterialasarenas.com) (Administración Oficial
nº 336, C.C. Arenas de Barcelona), listos para pegar en GAdmin, siempre con el
mismo estilo y estructura de la plantilla de referencia.

Sueltas los temas (por texto o por archivo) y te devuelve el `post.html` montado.

---

## ⚠️ Restricción clave: nada de API de pago

El motor de generación es el **CLI de Claude Code** (`claude`) autenticado con tu
**cuenta Claude Max**. Todo el consumo va contra esa suscripción.

- **No** se usa el SDK `@anthropic-ai/sdk` ni ninguna llamada a `api.anthropic.com`.
- **No** se usa ni se pide `ANTHROPIC_API_KEY` en ninguna parte del proyecto.
- La app corre solo en `localhost` (no se despliega en Vercel ni en ningún
  servidor), porque el motor es el binario `claude` de tu máquina.
- Al arrancar, la app comprueba que `ANTHROPIC_API_KEY` **no** está en el entorno.
  Si la detecta, avisa y no genera nada hasta que la quites (para no facturar por
  API en lugar de usar la suscripción). *(Esta comprobación se activa en la Fase 2.)*

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

## Instalación

```bash
npm install
```

## Arranque

Opción rápida (arranca y abre el navegador):

```bash
npm run generar
```

O por separado:

```bash
npm run dev          # servidor en http://localhost:3000
```

La app abre en **http://localhost:3000**.

---

## La plantilla de referencia y las reglas de estilo

El estándar de diseño vive en `referencias/`:

- `referencias/plantilla-ejemplo.html` — un post real del blog que marca el estilo.
- `referencias/reglas-estilo.md` — las reglas extraídas de esa plantilla (paleta,
  tipografía, estructura, módulos, tono, reglas de contenido). **Este archivo es el
  corazón del sistema: se inyecta en el prompt de generación.**

### Actualizar la plantilla

1. Sustituye `referencias/plantilla-ejemplo.html` por el nuevo post de referencia.
2. Regenera `referencias/reglas-estilo.md` con el botón **«Regenerar reglas»** de la
   app. *(Disponible a partir de la Fase 2/3; mientras tanto, las reglas se
   mantienen a mano.)*

---

## Copia de seguridad del historial

Todo el historial vive dentro del repositorio, en `historial/`, y **se versiona en
Git** (es una ventaja: cada post generado queda registrado). Para respaldarlo:

- Con Git: `git add historial && git commit -m "backup historial" && git push`.
- O copia manual: duplica la carpeta `historial/` a otro disco o servicio.

Cada generación crea `historial/<fecha>-<slug>/` con `post.html`, `meta.json` y una
copia del archivo original (si lo hubo). El índice maestro es `historial/index.json`.

---

## Estructura del proyecto

```
referencias/     plantilla-ejemplo.html + reglas-estilo.md
historial/       "base de datos" = sistema de archivos + index.json (versionado)
src/app/         páginas (generador, historial) y rutas API
src/components/   componentes de interfaz
src/lib/         puente con el CLI, prompt, utilidades de historial, guardia API key
scripts/         generar.mjs (npm run generar)
```

---

## Estado

Construcción por fases:

- [x] **Fase 1** — Base del proyecto (Next.js 15 + TS + Tailwind, tema, shell).
- [ ] **Fase 2** — Puente con el CLI + guardia de `ANTHROPIC_API_KEY`.
- [ ] **Fase 3** — Generación desde texto.
- [ ] **Fase 4** — Generación desde archivos (Modo A / Modo B).
- [ ] **Fase 5** — Historial (tabla, buscador, filtros).
- [ ] **Fase 6** — Cola múltiple + descarga ZIP.
- [ ] **Fase 7** — Pulido visual.

---

## Aviso legal

Contenido para una administración de loterías oficial. Juego responsable, +18.
