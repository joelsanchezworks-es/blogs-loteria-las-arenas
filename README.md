# Generador de Contenido HTML · Lotería Las Arenas

Herramienta para generar el HTML de los posts del blog de
[Lotería Las Arenas](https://www.loterialasarenas.com) (Administración Oficial
nº 336, C.C. Arenas de Barcelona), listos para pegar en GAdmin, siempre con el
mismo estilo y estructura de la plantilla de referencia.

Sueltas los temas (por texto o por archivo) y te devuelve el `post.html` montado,
más su `meta title` y `meta description`.

---

## Dos modos, un solo interruptor

El mismo código funciona desplegado en Vercel y en tu máquina. Lo decide una única
variable, `USE_LOCAL_STORAGE`:

| | **Modo API** (Vercel, por defecto) | **Modo local** (`USE_LOCAL_STORAGE=true`) |
|---|---|---|
| Motor de generación | `@anthropic-ai/sdk` → `claude-sonnet-4-6` | CLI `claude` (tu suscripción Max) |
| Almacén (historial) | Vercel Postgres | Sistema de archivos (`historial/`) |
| Variables necesarias | `ANTHROPIC_API_KEY`, `POSTGRES_URL` | ninguna (usa el CLI logueado) |
| Archivos subidos (PDF/DOCX) | se procesan **en memoria** (unpdf/mammoth), no se guardan en disco | ídem |

- **Vercel** (sin `USE_LOCAL_STORAGE`): factura por API y persiste en Postgres.
- **Local** (`USE_LOCAL_STORAGE=true` en `.env.local`): usa tu suscripción vía el
  CLI (sin coste de API) y guarda en `historial/`. Ideal para desarrollar y probar.

No hay que tocar código para pasar de uno a otro: solo la variable de entorno.

---

## Despliegue en Vercel

### 1. Sube el repositorio e impórtalo en Vercel

Conecta el repo de GitHub en [vercel.com/new](https://vercel.com/new). Vercel detecta
Next.js automáticamente (no hace falta configurar build ni output).

### 2. Crea la base de datos Postgres y enlázala

En el dashboard del proyecto → pestaña **Storage** → **Create Database** →
**Postgres** → crea y **Connect** al proyecto. Al enlazarla, Vercel inyecta sola la
variable **`POSTGRES_URL`** (entre otras) en el proyecto. No hace falta correr el
`schema.sql` a mano: la app ejecuta `CREATE TABLE IF NOT EXISTS` en el primer uso
(el archivo [`schema.sql`](./schema.sql) se incluye solo como referencia).

### 3. Configura las variables de entorno

Project → **Settings** → **Environment Variables**. Añade:

| Variable | Valor | ¿De dónde sale? |
|---|---|---|
| `ANTHROPIC_API_KEY` | tu clave `sk-ant-…` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `POSTGRES_URL` | *(automática)* | La pone Vercel al enlazar la base de datos del paso 2 |

`ANTHROPIC_API_KEY` la tienes que pegar tú. `POSTGRES_URL` normalmente ya está por
el paso 2; si no, cópiala desde **Storage → tu base de datos → `.env.local`**.

> **Importante:** **no** definas `USE_LOCAL_STORAGE` en Vercel (o ponla a algo
> distinto de `true`). En Vercel el sistema de archivos es de solo lectura y no hay
> binario `claude`; el modo local no funcionaría allí.

### 4. Plan Hobby (gratuito) — compatible

El modelo **solo genera el CONTENIDO en JSON** (texto, sin HTML ni estilos); una
**plantilla fija en TypeScript** (`src/lib/plantilla-arenas.ts`) monta después el
HTML con el diseño de Las Arenas, de forma instantánea. Así la respuesta del
modelo es pequeña (~2.500–3.500 tokens para 1.500–2.000 palabras) y **el timeout
es imposible**: genera en ~25–40 s, muy por debajo de los 60 s del plan gratuito
(`maxDuration = 60`), sin importar lo largo que sea el post. El HTML resultante es
**autocontenido** (estilos inline): se pega tal cual en GAdmin, una sola cosa por
post. El **selector de un idioma por generación** (por defecto Español) evita
encadenar generaciones.

### 5. Deploy

Con las variables puestas, **Deploy** (o vuelve a desplegar si ya lo habías hecho
sin ellas). Listo.

### Checklist de pasos manuales en Vercel

1. Importar el repo.
2. **Storage → Create Database → Postgres → Connect** (pone `POSTGRES_URL`).
3. **Settings → Environment Variables → añadir `ANTHROPIC_API_KEY`**.
4. El plan **gratuito (Hobby)** es suficiente: el HTML por clases mantiene la
   generación por debajo de 60 s (`maxDuration = 60`): el modelo solo produce
   JSON y una plantilla fija monta el HTML.
5. **Deploy.**

---

## Desarrollo local (modo CLI + archivos)

Requisitos:

1. **Node.js 20 o 22** y npm.
2. **CLI de Claude Code instalado y logueado con tu cuenta Max.** Ejecuta una vez
   `claude` y comprueba con `/status` que va **por suscripción**.

Pasos:

```bash
npm install

# Activa el modo local (CLI + archivos):
echo "USE_LOCAL_STORAGE=true" > .env.local

npm run generar     # arranca la app y abre http://localhost:3000
# o bien:
npm run dev
```

En modo local no hacen falta `ANTHROPIC_API_KEY` ni `POSTGRES_URL`: la generación va
contra tu suscripción a través del CLI y el historial se guarda en `historial/`.

El banner superior de la app te dice en todo momento en qué modo estás y si falta
algo (el CLI, la API key o la base de datos).

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
     de generar. Luego genera un HTML por tema.
3. Rellena la **URL de la página** (opcional) y elige el **idioma** (Español /
   Català / English; por defecto Español). Es **un idioma por generación** (marcar
   uno deselecciona los demás); cada generación se guarda en el historial con su
   idioma. Para otro idioma, cámbialo y vuelve a generar.
4. Pulsa **✦ Generar HTML**. Verás el progreso en tiempo real.
5. La salida agrupa los resultados en **pestañas por idioma** (ES · CA · EN). En cada una tienes
   pestañas **Vista previa / Código**, el bloque de **meta title / meta description**
   copiables, y los botones **Copiar HTML**, **Descargar .html** y **Regenerar** (más
   **Abrir carpeta** en modo local). Con varios posts, **Descargar todos (ZIP)**.
6. **En GAdmin:** pega el **HTML** del post en el cuerpo de la entrada. El HTML es
   **autocontenido** (lleva su propio diseño inline): no hay que pegar nada más.

Las entradas por texto y por archivo se pueden usar por separado o combinadas.
Los trabajos se procesan **de uno en uno** (secuencial): si sueltas 6 PDFs, no se
lanzan 6 generaciones a la vez.

### Historial (`/historial`)

Tabla por fecha con buscador (por título **y** por contenido), filtro por idioma
y por rango de fechas, y contador de posts del mes. Por cada entrada: ver (con
vista previa), copiar, descargar, duplicar (reabre el generador precargado),
borrar y —solo en modo local— abrir carpeta. Selección múltiple + **Descargar
selección (ZIP)**.

### Reglas (`/reglas`)

Muestra `referencias/reglas-estilo.md` (las reglas que se inyectan en cada
generación). El botón **«Regenerar reglas»** solo aparece en **modo local**
(regenerar reescribe el archivo, y en Vercel el sistema de archivos es de solo
lectura). En Vercel, edita el `.md` en el repo y vuelve a desplegar.

---

## La plantilla de referencia y las reglas de estilo

El estándar de diseño vive en `referencias/`:

- `referencias/plantilla-ejemplo.html` — un post real del blog que marca el estilo.
- `referencias/reglas-estilo.md` — las reglas extraídas de esa plantilla (paleta,
  tipografía, estructura, módulos, tono, reglas de contenido). **Es el corazón del
  sistema: se inyecta en el prompt de generación.**

Ambos archivos se leen en tiempo de ejecución. En Vercel se incluyen en el bundle
de las funciones serverless vía `outputFileTracingIncludes` (ver `next.config.ts`).

---

## Persistencia

- **Modo API (Vercel):** tabla `posts` en Vercel Postgres (ver `schema.sql`). Cada
  generación hace un `INSERT`. El historial se consulta y filtra por SQL.
- **Modo local:** cada generación crea `historial/<fecha>-<slug>/` con `post.html` +
  `meta.json`, e `index.json` como índice. Se puede versionar en Git como copia de
  seguridad.

En ninguno de los dos modos se guardan en disco los archivos subidos: se leen en
memoria (unpdf/mammoth) para extraer el texto y se descartan.

---

## Reglas de la generación (resumen)

El modelo devuelve **solo el contenido en JSON** (título, intro, ventajas, cómo
comprar, cita, 4 FAQs, CTA…); una plantilla fija (`src/lib/plantilla-arenas.ts`)
lo convierte en el HTML autocontenido (estilos inline) con el diseño de la casa.
Normas de contenido:

- Nada de HTML ni estilos en la respuesta del modelo: solo el JSON del texto.
- `meta title` (≤60) y `meta description` (≤155) van en el JSON, no en el HTML.
- Artículo de **~1.500–2.000 palabras** salvo indicación contraria. Entradilla, `H2` por bloque, CTA final.
- Los DATOS (fechas, precios, importes) se marcan con `**…**` en el texto y la plantilla los pinta en dorado.
- Español natural de España (o el idioma elegido).
- **No inventa datos:** fechas, precios, importes y plazos solo salen del input; si
  falta un dato clave, deja el hueco visible `[[FALTA: …]]`.
- Imágenes como **placeholder dorado punteado** (sin URL inventada).
- Sin promesas de ganar. Juego responsable, +18 (coletilla al pie de cada post).

El modelo devuelve la respuesta con un protocolo delimitado
(`===META===` / `===HTML===`) que el servidor separa en meta + HTML.

---

## Estructura del proyecto

```
referencias/     plantilla-ejemplo.html + reglas-estilo.md (se inyectan en el prompt)
schema.sql       tabla `posts` de Postgres (referencia; la app la crea sola)
.env.example     variables de entorno de ejemplo
historial/       almacén en modo local (post.html + meta.json + index.json)
src/app/         páginas (generador, historial, reglas) y rutas API
src/components/   Encabezado, AvisoEntorno, Generador
src/lib/
  config.ts          interruptor dual-modo (USE_LOCAL_STORAGE)
  motor.ts           elige motor CLI o API
  anthropic.ts       motor API (@anthropic-ai/sdk, claude-sonnet-4-6)
  claude.ts          motor CLI (solo local)
  almacen/           interfaz común + implementaciones postgres.ts / archivos.ts
  prompt.ts          construcción del prompt (sistema cacheable + usuario)
  parseo.ts          separa ===META=== / ===HTML=== y parsea temas
  contenido.ts       contar palabras, detectar [[FALTA]], limpiar HTML
  generacion.ts      orquesta un trabajo (prompt → motor → parseo → almacén)
  deteccion.ts       Modo B: detección de temas
  archivos.ts        extracción de texto en memoria (unpdf/mammoth)
  reglas.ts          lee / regenera reglas-estilo.md (regenerar solo en local)
scripts/         generar.mjs (npm run generar: dev + abre el navegador)
```

---

## Variables de entorno

Ver [`.env.example`](./.env.example). En resumen:

| Variable | Modo API (Vercel) | Modo local |
|---|---|---|
| `ANTHROPIC_API_KEY` | **requerida** | no se usa |
| `POSTGRES_URL` | **requerida** (la pone Vercel) | no se usa |
| `USE_LOCAL_STORAGE` | no definir | `true` |

---

## Aviso legal

Contenido para una administración de loterías oficial. Juego responsable, +18.
