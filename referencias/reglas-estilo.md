# Reglas de estilo — Blog Lotería Las Arenas

> Extraídas de `plantilla-ejemplo.html`. Este archivo es el corazón del sistema:
> se inyecta literalmente en el prompt de generación. Si cambia la plantilla,
> se regenera este documento (botón "Regenerar reglas" en la app).
>
> **Fuente medida:** 1 `<h1>`, 10 `<h2>`, 1 `<h3>`, 83 `<p>`, 64 `<strong>`,
> 13 FAQ `<details>`, 3 `<img>`, 2 `<table>`, ~2.530 palabras visibles.
> **0 clases CSS, 0 ids, 0 `<style>`.**

---

## 0. REGLA DE ORO: todo en línea (inline)

- **Cada estilo va en el atributo `style="..."` de la propia etiqueta.** No se usa
  ni una sola clase (`class=`), ni `id=`, ni bloque `<style>`, ni CSS externo.
  Motivo: el HTML se pega en GAdmin y solo sobrevive el estilo inline.
- **No incluir `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`.** Solo el cuerpo del
  artículo: se empieza directamente por el `<div>` contenedor exterior.
- Nada de comentarios que el usuario no quiera; los `<!-- COMENTARIOS -->` de la
  plantilla son orientativos para el maquetador. En el HTML final **no** se
  incluyen bloques de código markdown (nada de ```html).

---

## 1. PALETA DE COLOR EXACTA (la del POST, no la de la app)

⚠️ **No confundir** con los colores de la interfaz de la herramienta. El post
usa esta paleta y solo esta:

| Uso | Valor |
|---|---|
| Fondo de página (wrapper exterior) | `#1b1d39` |
| Fondo de tarjetas / cajas oscuras | `#13152a` |
| Dorado (acento, todo) | `#caa669` |
| Texto claro fuerte / titulares | `#f2f2f2` |
| Texto dorado suave (aviso fecha) | `#e2c99a` |
| Texto de cuerpo | `rgba(242,242,242,0.7)` |
| Texto de cuerpo (intro/destacado) | `rgba(242,242,242,0.75)` |
| Texto secundario / notas | `rgba(242,242,242,0.6)` / `0.55` / `0.4` |
| Bordes dorados | `rgba(202,166,105,0.3)` (y `0.25` / `0.15` según fuerza) |
| Líneas separadoras de tabla | `rgba(255,255,255,0.06)` |
| Fondo tinte dorado (avisos) | `rgba(202,166,105,0.1)` / `0.06` |

`#caa669` = `rgb(202,166,105)`. Los degradados dorados se hacen con ese rgb a
distintas opacidades (ver componentes).

---

## 1B. CONSTANTES DE NEGOCIO (fijas y reutilizables en TODOS los posts)

Datos verificados de la administración. Se usan siempre, **sin pedir
confirmación**, y **no** se modifican salvo que el usuario lo indique explícitamente.

- **Nombre:** Lotería Las Arenas — Administración Oficial nº 336.
- **Dirección:** C.C. Arenas de Barcelona · Gran Via de les Corts Catalanes,
  373-385, L-S28, 08015 Barcelona.
- **Teléfono:** 934 247 349.
- **URL de compra (referencia canónica del sitio):**
  `https://www.loterialasarenas.com/comprar-loteria-de-navidad-online`
  → Los CTA de compra usan la `URL DE LA PÁGINA` (`urlDestino`) del post; si no se
  aporta, llevan `href="#"` (ver §10). Esta constante es solo la página de compra
  general, como referencia.
- **URL de comprobación:** `https://www.loterialasarenas.com/comprobar-loteria-nacional`
- **Voz recurrente / testimonio:** **Víctor**, el lotero de referencia de la
  administración. Se puede incluir su cita en todos los posts (ver §8.8), firmada
  como "Víctor — Lotería Las Arenas, Adm. nº 336 · Barcelona".
- **Historial de premios (prueba social) — constante fija:**
  - ★ 2023 — El Gordo y cuatro quintos premios de la Lotería de Navidad.
  - ★ 2024 — Tercer, cuarto y quinto premios de la Lotería de Navidad.
  - ★ 2025 — Segundo premio de la Lotería del Niño.
  Datos reales y verificables. Solo se actualizan cuando el usuario lo indique.

⚠️ El **resto** de datos (fechas de sorteo, precios del décimo, importes de premio,
plazos, condiciones) **NO son constantes**: salen del input de cada post. Si falta
uno, va a hueco `[[FALTA: …]]` (ver §14).

---

## 2. TIPOGRAFÍA

- Fuente única: `font-family:Arial,sans-serif;` declarada en el wrapper exterior
  (se hereda). Excepción: la comilla decorativa de la cita usa `Georgia,serif`.
- Tamaños (px): `h1` 26px · `h2` 20px (CTA final 21px) · `h3` 14px · cuerpo 14px ·
  intro 14.5px · FAQ 13.5px · notas 12–13px · antetítulos (kicker) 10px.
- `line-height`: **1.8** en párrafos de cuerpo; **1.3** en titulares; 1.5–1.75
  en textos cortos de tarjeta.
- Pesos: titulares y datos `font-weight:bold`; lead del hero y cita `font-weight:300`.
- Los antetítulos/kickers van en **MAYÚSCULAS**, 10px, dorado, `letter-spacing`
  ancho (`0.2em`–`0.25em`), `font-weight:bold`.

---

## 3. ESTRUCTURA DEL DOCUMENTO (envoltorio obligatorio)

Todo el artículo va dentro de dos `<div>` anidados. **Siempre empiezan así:**

```html
<div style="font-family:Arial,sans-serif;background:#1b1d39;color:#f2f2f2;padding:30px 0;width:100vw;position:relative;left:50%;right:50%;margin-left:-50vw;margin-right:-50vw;box-sizing:border-box;">
<div style="max-width:660px;margin:0 auto;padding:0 40px;box-sizing:border-box;">
  ... contenido ...
</div>
</div>
```

- El wrapper exterior es **full-bleed** (`100vw` + márgenes negativos) para que
  el fondo azul ocupe todo el ancho del área de contenido del CMS.
- El interior limita la lectura a **660px** centrados.

---

## 4. JERARQUÍA DE ENCABEZADOS

- **Un solo `<h1>`**, dentro del hero, 26px. Es el título del post.
- **`<h2>` por bloque temático**, 20px. Patrón fijo: parte del título en blanco
  + parte en dorado con `<span style="color:#caa669;">…</span>`.
  Ejemplo: `Cómo comprar tu <span style="color:#caa669;">décimo de Navidad</span>`.
- **Debajo de cada `<h2>` va SIEMPRE una barrita dorada** separadora:
  ```html
  <div style="width:26px;height:2px;background:#caa669;margin:0 0 1rem;">&nbsp;</div>
  ```
- `<h3>` (raro), 14px, todo en dorado, para subsecciones (p. ej. "Premios especiales").

---

## 5. PÁRRAFOS

Tres tipos:

1. **Cuerpo estándar:**
   ```html
   <p style="font-size:14px;color:rgba(242,242,242,0.7);line-height:1.8;margin-bottom:1rem;">…</p>
   ```
   (usar `margin-bottom:1.5rem;` al cerrar un bloque temático).

2. **Lead / intro con barra dorada** (primer párrafo del artículo tras el aviso):
   ```html
   <p style="font-size:14.5px;line-height:1.8;color:rgba(242,242,242,0.75);border-left:3px solid #caa669;padding-left:1.2rem;margin-bottom:1.5rem;">…</p>
   ```

3. **Nota en cursiva / pie** (aclaraciones bajo tablas):
   `font-size:13px;color:rgba(242,242,242,0.6);font-style:italic;`

**Longitud:** párrafos cortos, de **2 a 5 frases (~40–80 palabras)**. Nunca
párrafos-muro. Preferir varios párrafos cortos a uno largo.

---

## 6. NEGRITAS (`<strong>`) — uso muy frecuente y con color

Dos variantes, siempre con color inline:

- **Blanca** para nombres propios y términos clave:
  `<strong style="color:#f2f2f2;">Lotería Las Arenas</strong>`
- **Dorada** para **datos**: fechas, precios, importes, plazos, cifras:
  `<strong style="color:#caa669;">20 euros</strong>`,
  `<strong style="color:#caa669;">tres meses</strong>`.

Regla práctica: **todo dato numérico o de negocio relevante va en `<strong>`
dorado**. El resto de énfasis, en blanco.

---

## 7. "LISTAS" — no se usan `<ul>`/`<ol>`

La plantilla **no tiene ni una lista real**. Las enumeraciones se hacen con
párrafos con prefijo:

- **Flecha dorada** para opciones/pasos:
  ```html
  <p style="font-size:14px;color:rgba(242,242,242,0.7);line-height:1.8;margin-bottom:0.4rem;"><strong style="color:#caa669;">→ Custodia en caja fuerte:</strong> texto…</p>
  ```
  (el último ítem del grupo cierra con `margin-bottom:1rem;`).
- **Estrella dorada** `★` para hitos/años (prueba social).

Usar estas "listas" solo cuando aporten; si no, prosa.

---

## 8. COMPONENTES / MÓDULOS REUTILIZABLES

Se combinan según el tema y **los datos disponibles**. Copiar el CSS inline tal cual.

### 8.1 HERO (obligatorio, centrado)
Barrita dorada (36px) → antetítulo mayúsculas → `<h1>` → párrafo lead dorado
(14px, `font-weight:300`) → botón CTA sólido → imagen hero. Todo `text-align:center`,
con `border-bottom:1px solid rgba(255,255,255,0.1)` de cierre.

### 8.2 AVISO DE FECHA / DATOS CLAVE (recomendado tras el hero)
```html
<div style="background:rgba(202,166,105,0.1);border-left:4px solid #caa669;border-radius:4px;padding:0.85rem 1.2rem;font-size:13px;color:#e2c99a;margin-bottom:2rem;"><strong>Fecha del sorteo:</strong> … · <strong>Décimo:</strong> … · <strong>Administración Oficial nº 336</strong> de Barcelona.</div>
```

### 8.3 CAJA DESTACADA (callout degradado dorado)
```html
<div style="background:linear-gradient(135deg, rgba(202,166,105,0.15) 0%, rgba(202,166,105,0.05) 100%);border:1px solid rgba(202,166,105,0.3);border-radius:8px;padding:1rem 1.2rem;margin-bottom:1.5rem;">
<p style="font-size:14px;color:rgba(242,242,242,0.85);line-height:1.75;margin:0;">…</p>
</div>
```

### 8.4 TARJETA OSCURA (prueba social, superdécimo, cita)
```html
<div style="background:#13152a;border:1px solid rgba(202,166,105,0.25);border-radius:8px;padding:1.25rem 1.4rem;margin-bottom:2rem;"> … </div>
```
Suele abrir con un antetítulo mayúsculas dorado (10px).

### 8.5 BOTÓN CTA — SÓLIDO (acción principal)
```html
<a style="display:inline-block;background:#caa669;color:#1b1d39;font-size:11px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;padding:12px 28px;border-radius:3px;text-decoration:none;box-shadow:0 4px 12px rgba(202,166,105,0.3);" href="URL" target="_blank" rel="noopener">Texto del botón →</a>
```

### 8.6 BOTÓN CTA — CONTORNO (acción secundaria)
```html
<a style="display:inline-block;background:transparent;color:#caa669;font-size:11px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;padding:11px 26px;border:1px solid #caa669;border-radius:3px;text-decoration:none;" href="URL" target="_blank" rel="noopener">Texto →</a>
```
Los CTA centrados van en `<div style="text-align:center;margin:1.5rem 0 2rem;">…</div>`.

### 8.7 TABLA DE PREMIOS (solo si hay datos de importes)
Dos columnas: **"A la serie"** y **"Al décimo"** (esta última en dorado, es lo
que recibe el comprador). Cabecera en tabla aparte 10px mayúsculas dorado.
Importes con `white-space:nowrap` y `&nbsp;` antes del `€`. Cerrar con nota en
cursiva explicando serie vs décimo.

### 8.8 CITA / TESTIMONIO
Tarjeta oscura con comilla grande `Georgia,serif` dorada (28px), frase en cursiva
16px `font-weight:300`, y atribución 12px `rgba(242,242,242,0.4)`.
Atribución usada en la plantilla: **"Víctor — Lotería Las Arenas, Adm. nº 336 · Barcelona"**.

### 8.9 FAQ (acordeón `<details>`)
```html
<details style="background:#13152a;border:1px solid rgba(202,166,105,0.3);border-radius:8px;margin-bottom:1rem;overflow:hidden;">
<summary style="cursor:pointer;padding:1rem 1.3rem;font-size:14.5px;color:#f2f2f2;font-weight:bold;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
<span><span style="color:#caa669;margin-right:0.4rem;">❓</span>Pregunta</span>
<span style="color:#caa669;font-size:18px;font-weight:normal;">+</span>
</summary>
<div style="padding:0 1.3rem 1.3rem;border-top:1px solid rgba(202,166,105,0.15);">
<p style="font-size:13.5px;color:rgba(242,242,242,0.75);line-height:1.8;margin:1rem 0;">Respuesta.</p>
</div>
</details>
```

### 8.10 CTA FINAL (caja grande de cierre, obligatoria)
Caja con `background:linear-gradient(135deg,#13152a 0%,#1b1d39 100%)`, borde dorado,
`border-radius:10px`, centrada: barrita → antetítulo → `<h2>` 21px (puede llevar
`<br>`) → párrafo → botón sólido grande (`padding:14px 32px`) → letra pequeña con
garantías (`Décimo 20€ · Sin comisiones · … · Administración Oficial nº 336`).

### 8.11 FOOTER (obligatorio)
```html
<div style="text-align:center;padding-top:1.5rem;border-top:1px solid rgba(202,166,105,0.2);margin-top:1.5rem;">
<div style="width:26px;height:2px;background:#caa669;margin:0 auto 1rem;">&nbsp;</div>
<p style="font-size:11px;color:rgba(242,242,242,0.4);line-height:1.8;margin:0;"><strong style="color:rgba(202,166,105,0.7);">Lotería Las Arenas</strong> · Administración Oficial nº 336 · C.C. Arenas de Barcelona<br>Gran Via de les Corts Catalanes, 373-385, L-S28, 08015 Barcelona · <strong style="color:rgba(202,166,105,0.7);">934 247 349</strong></p>
</div>
```

### 8.12 COLETILLA LEGAL +18 (obligatoria — va SIEMPRE, justo DESPUÉS del footer)

Última línea del artículo, dentro del contenedor de 660px, después del `</div>`
del footer:
```html
<p style="text-align:center;font-size:11px;color:rgba(242,242,242,0.4);line-height:1.8;margin:0.75rem 0 0;">© Lotería Las Arenas · +18 · Juega con responsabilidad · <a style="color:rgba(202,166,105,0.7);text-decoration:none;" href="https://www.juegoseguro.es" target="_blank" rel="noopener">www.juegoseguro.es</a></p>
```

---

## 9. IMÁGENES → placeholder dorado punteado (NO se inventan URLs)

**Nunca** se inventa una URL de imagen ni se usa `[[FALTA]]` para imágenes. En cada
punto donde iría una imagen (hero, capturas, banners) se coloca un **bloque
placeholder de borde discontinuo dorado**. El equipo sustituye la imagen a mano en
GAdmin; el bloque solo marca visualmente dónde va y qué debe mostrar.

```html
<div style="border:2px dashed rgba(202,166,105,0.4);border-radius:8px;padding:2.5rem 1rem;text-align:center;background:rgba(202,166,105,0.04);margin-bottom:1.5rem;">
<div style="font-size:22px;margin-bottom:0.4rem;">🖼️</div>
<p style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(202,166,105,0.7);font-weight:bold;margin:0;">Imagen · breve descripción de lo que va aquí</p>
</div>
```

- La descripción interna es una pista corta de qué imagen colocar (p. ej. "Banner
  Lotería del Niño 2027"), derivada del tema; no es un dato de negocio inventado.
- Si el usuario **sí** aporta una URL real de imagen, se usa un `<img>` normal con
  `style="display:block;width:100%;height:auto;border-radius:8px;"` y `alt`
  descriptivo con marca (p. ej. `"Lotería del Niño 2027 · Lotería Las Arenas"`).

---

## 10. ENLACES Y CTA

- Todos los enlaces: `target="_blank" rel="noopener"`.
- URLs reales de la plantilla (usar salvo que se indique otra en el input):
  - Compra: `https://www.loterialasarenas.com/comprar-loteria-de-navidad-online`
  - Comprobar: `https://www.loterialasarenas.com/comprobar-loteria-nacional`
- Enlaces internos a `loterialasarenas.com` cuando encajen de forma natural.
- El artículo lleva **varios CTA** repartidos (hero, tras bloques clave) y **uno
  final grande**. Texto de botón en MAYÚSCULAS, a menudo cerrando con `→`.
- **Destino de los CTA de compra:** la `URL DE LA PÁGINA` (`urlDestino`) del post.
  Si el usuario **no** la aporta → `urlDestino` queda `null` en `meta.json` y **todos
  los CTA de compra llevan `href="#"`** (no se inventa URL). El CTA de "comprobar"
  sí usa siempre la URL de comprobación (constante).

---

## 11. FECHAS

- Formato largo en español: **"martes 22 de diciembre de 2026"** (día de la semana
  + día + "de" + mes en minúscula + "de" + año).
- Los datos de fecha clave van en `<strong>` dorado.

---

## 12. PRECIOS Y PREMIOS

- Céntimos/decenas pegados al símbolo en prosa: `20€`; o en palabras: `20 euros`.
- Miles con **punto** como separador: `2.700 millones`, `400.000€`, `4.000.000 €`.
- En tablas: `4.000.000&nbsp;€` (espacio duro antes del `€`, `white-space:nowrap`).
- Todo importe/premio relevante en `<strong>` dorado.
- La columna "Al décimo" es la que recibe el comprador → resáltala en dorado.

---

## 13. TONO DE VOZ

- Español natural de España, cercano, tratando al lector de **tú**.
- Cálido y tranquilizador: seguridad, oficialidad (SELAE, Administración nº 336),
  sin comisiones, décimo original, notificación de premios.
- Vende la **ilusión**, no la probabilidad ("vendemos las semanas de imaginar
  qué pasaría si toca").
- Nada de lenguaje corporativo vacío ni traducción literal.
- Frases directas, párrafos cortos.

---

## 14. REGLAS DE CONTENIDO (duras)

- **No inventar datos.** Fechas de sorteo, precios del décimo, importes de premio,
  plazos y condiciones **solo** salen del archivo/texto del usuario. Si falta un
  dato clave, dejar el hueco visible: `[[FALTA: precio del décimo]]`. Mejor un
  hueco que un premio inventado publicado.
- **Sin promesas de ganar** ni afirmaciones sobre probabilidades de acierto.
- **Juego responsable, +18.** Cada post cierra **siempre** con la coletilla legal
  (ver §8.12), justo después del footer de Las Arenas.
- Extensión objetivo: **HTML compacto, máx. ~6.000 caracteres** (post completo pero
  conciso, ~350–450 palabras de texto visible). La plantilla de ejemplo es una
  "pillar page" larga (~2.500 palabras) que sirve de referencia de **estilo y
  módulos**, NO de longitud: el post real es mucho más corto.
- **FAQs: exactamente 3** preguntas frecuentes por post (§8.9), no más.

---

## 15. META (van en `meta.json`, NO en el HTML)

- `meta title`: máx. **60** caracteres.
- `meta description`: máx. **155** caracteres.
- En español natural (o el idioma seleccionado: ES / CA / EN).

---

## 16. CHECKLIST FINAL ANTES DE ENTREGAR EL HTML

1. ¿Empieza por el `<div>` wrapper y termina cerrando los dos `<div>`? ¿Sin
   `<!DOCTYPE>/<html>/<head>/<body>` ni ```html?
2. ¿Todo el estilo es inline? ¿Cero `class`, `id`, `<style>`?
3. ¿Un único `<h1>`? ¿Cada `<h2>` con su barrita dorada debajo?
4. ¿Datos numéricos/negocio en `<strong>` dorado? ¿Fechas en formato largo?
5. ¿Hay al menos un CTA en el hero y el CTA final grande? ¿URLs con
   `target="_blank" rel="noopener"`?
6. ¿Footer con Administración nº 336, dirección y teléfono?
7. ¿Ningún dato inventado? ¿Los huecos marcados con `[[FALTA: …]]`?
8. ¿Sin promesas de ganar?
