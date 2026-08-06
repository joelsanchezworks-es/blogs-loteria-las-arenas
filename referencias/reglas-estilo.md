# Reglas de estilo — Blog Lotería Las Arenas

> El corazón del sistema: se inyecta literalmente en el prompt de generación.
> El diseño vive en `public/arenas.css` (se pega UNA vez en el CSS global de
> GAdmin). Los posts usan **clases**, nunca estilos inline: así el HTML es solo
> contenido (mucho más ligero) y el diseño lo pone el CSS.

---

## 0. REGLA DE ORO: clases, cero estilos inline

- **Cada elemento lleva su clase de `arenas.css`; NADA de `style="..."`, ni
  `<style>`, ni CSS inline.** El diseño ya está en el CSS global.
- Todo el post va dentro del envoltorio obligatorio:
  ```html
  <div class="arenas-post"><div class="arenas-inner">
    … contenido …
  </div></div>
  ```
- **No incluir** `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, ni vallas markdown
  (nada de ```html), ni comentarios. Solo el cuerpo del artículo.
- La barrita dorada bajo cada `<h2>`, el marcador `+`/`–` de las FAQ y la comilla
  de la cita los pinta el CSS solo: **no** los escribas a mano.

---

## 1. VOCABULARIO DE CLASES (las de `arenas.css`)

| Clase | Para qué | Etiqueta habitual |
|---|---|---|
| `arenas-post` + `arenas-inner` | envoltorio exterior + interior (obligatorio) | `<div>` |
| `hero` | bloque hero centrado | `<div>` |
| `rule` | barrita dorada suelta (hero, CTA final, footer) | `<div class="rule"></div>` |
| `kicker` | antetítulo en mayúsculas dorado | `<p>` |
| `lead` | frase lead del hero | `<p>` |
| `intro` | primer párrafo del cuerpo, con barra dorada | `<p>` |
| `aviso` | caja de datos clave (fecha, precio…) | `<div>` |
| `callout` | caja destacada degradada | `<div>` con `<p>` dentro |
| `card` | tarjeta oscura genérica | `<div>` |
| `arrow` | párrafo-ítem con flecha dorada `→` | `<p>` |
| `cta` / `cta-outline` | botón sólido / de contorno | `<a>` |
| `cta-wrap` | centra un botón | `<div>` |
| `quote` + `by` | cita/testimonio y su firma | `<div>` con dos `<p>` |
| `faq` + `a` | acordeón de pregunta (`<details>`) y su respuesta (`<div class="a">`) | `<details>` |
| `cta-final` + `fineprint` | caja grande de cierre y su letra pequeña | `<div>` |
| `footer` | pie con datos de la administración | `<div>` |
| `legal` | coletilla legal +18 (última línea) | `<p>` |
| `img-ph` (+ `ico`) | placeholder dorado de imagen | `<div>` |
| `g` | color dorado para DATOS (en `<span>` o `<strong>`) | `<span class="g">` |
| `nota` | nota en cursiva bajo tablas | `<p>` |
| `al-decimo` | columna "al décimo" de la tabla de premios (dorada) | `<td>` |

**Énfasis:** `<strong>` sin clase = blanco (nombres/términos). `<strong class="g">`
o `<span class="g">` = dorado (todo dato: fechas, precios, importes, cifras).
Los títulos `<h2>` combinan blanco + una parte dorada con `<span class="g">…</span>`.

---

## 1B. CONSTANTES DE NEGOCIO (fijas y reutilizables en TODOS los posts)

Datos verificados de la administración. Se usan siempre, **sin pedir
confirmación**, y **no** se modifican salvo que el usuario lo indique.

- **Nombre:** Lotería Las Arenas — Administración Oficial nº 336.
- **Dirección:** C.C. Arenas de Barcelona · Gran Via de les Corts Catalanes,
  373-385, L-S28, 08015 Barcelona.
- **Teléfono:** 934 247 349.
- **URL de compra (referencia):** `https://www.loterialasarenas.com/comprar-loteria-de-navidad-online`
  → Los CTA de compra usan la URL de la página (`urlDestino`) del post; si no se
  aporta, llevan `href="#"`.
- **URL de comprobación:** `https://www.loterialasarenas.com/comprobar-loteria-nacional`
- **Voz recurrente / testimonio:** **Víctor**, el lotero de referencia. Su cita
  se firma "Víctor — Lotería Las Arenas, Adm. nº 336 · Barcelona".
- **Historial de premios (prueba social) — constante fija:**
  - ★ 2023 — El Gordo y cuatro quintos premios de la Lotería de Navidad.
  - ★ 2024 — Tercer, cuarto y quinto premios de la Lotería de Navidad.
  - ★ 2025 — Segundo premio de la Lotería del Niño.
  Datos reales. Solo se actualizan cuando el usuario lo indique.

⚠️ El **resto** de datos (fechas de sorteo, precios del décimo, importes de premio,
plazos, condiciones) **NO son constantes**: salen del input de cada post. Si falta
uno, va a hueco `[[FALTA: …]]`.

---

## 2. ESTRUCTURA DEL POST (secciones obligatorias, en este orden)

1. **HERO** (`<div class="hero">`): `rule` → `kicker` → `<h1>` (con la keyword) →
   `<p class="lead">` → `<a class="cta">` → `img-ph`.
2. **INTRO**: `<p class="intro">` (con la keyword); si hay fecha/precio, añade una
   caja `aviso` con esos datos clave.
3. **VENTAJAS**: `<h2>` + 2–3 párrafos y/o `arrow` (por qué Las Arenas: oficialidad,
   sin comisiones, décimo original, historial §1B).
4. **CÓMO COMPRAR**: `<h2>` + pasos (online con el CTA a la URL, o en la
   administración). Puede cerrar con un `cta-wrap`.
5. **CITA DE VÍCTOR** (`<div class="quote">`): testimonio + `<p class="by">`.
6. **FAQs**: 4 preguntas `<details class="faq">` con su `<div class="a">`.
7. **CTA FINAL** (`<div class="cta-final">`): `rule` → `kicker` → `<h2>` → `<p>` →
   `<a class="cta">` → `<p class="fineprint">`.
8. **FOOTER** (`<div class="footer">`) + **coletilla legal +18** (`<p class="legal">`)
   como última línea.

Un único `<h1>` (en el hero). Un `<h2>` por sección temática.

---

## 3. CONTENIDO Y EXTENSIÓN

- **Extensión:** 1.800–2.500 palabras de texto visible (apunta a ~2.200). Artículo
  largo y desarrollado, con 3–4 párrafos por sección. Como el HTML ya no lleva
  estilos inline, el copy largo no penaliza el tiempo de generación.
- **No inventar datos.** Fechas, precios, importes, plazos y condiciones SOLO salen
  del input del post. Si falta un dato clave, deja el hueco visible `[[FALTA: …]]`.
- **Imágenes:** no inventes URLs; usa el bloque `img-ph` (placeholder). Si el
  usuario aporta una URL real, usa `<img src="…" alt="… · Lotería Las Arenas">`.
- **Sin promesas de ganar** ni afirmaciones sobre probabilidades de acierto.
- **Juego responsable, +18:** cada post cierra SIEMPRE con `<p class="legal">`
  (coletilla), justo después del footer, en el idioma del post.

---

## 4. FECHAS, PRECIOS Y TONO

- Fechas en formato largo: "martes 22 de diciembre de 2027". Los datos de fecha en
  `<span class="g">`.
- Precios/importes: `20€` o `20 euros`; miles con punto (`400.000€`); en tablas
  `400.000&nbsp;€`. Todo importe relevante en dorado (`g`).
- Tono: español natural de España (o el idioma pedido: ES / CA / EN), cercano, de
  **tú**. Vende la **ilusión**, no la probabilidad. Frases directas, párrafos cortos.

---

## 5. META (van aparte, NO en el HTML)

- `meta title`: máx. **60** caracteres. `meta description`: máx. **155**.
- En el idioma seleccionado (ES / CA / EN).

---

## 6. CHECKLIST ANTES DE ENTREGAR

1. ¿Empieza por `<div class="arenas-post"><div class="arenas-inner">` y cierra los
   dos `</div>`? ¿Sin `<!DOCTYPE>/<html>/<head>/<body>` ni ```html?
2. ¿CERO estilos inline? ¿Todo con clases de `arenas.css`?
3. ¿Un único `<h1>` con la keyword? ¿Un `<h2>` por sección?
4. ¿Las 8 secciones completas (hero, intro, ventajas, cómo comprar, cita, 4 FAQs,
   CTA final, footer + coletilla +18)?
5. ¿Datos numéricos en `<span class="g">`? ¿Fechas en formato largo?
6. ¿CTA de compra a la URL de la página (o `href="#"` si no hay)?
7. ¿Ningún dato inventado? ¿Huecos con `[[FALTA: …]]`? ¿Sin promesas de ganar?
