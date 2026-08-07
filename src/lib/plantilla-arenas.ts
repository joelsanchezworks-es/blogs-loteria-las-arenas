/**
 * Plantilla fija de Las Arenas: ensambla el HTML del post a partir del CONTENIDO
 * estructurado que devuelve el modelo (JSON). El modelo NO genera HTML ni estilos;
 * solo texto. Aquí montamos el diseño (inline, autocontenido) de forma
 * determinista e instantánea, así la generación no depende del tamaño del HTML.
 *
 * Marcado ligero en el texto: **texto** → dato en dorado (fechas, precios, cifras).
 */

export type ContenidoPost = {
  titulo: string;
  metaTitle: string;
  metaDescription: string;
  hero: { kicker: string; titulo: string; lead: string; imagen: string };
  intro: string;
  aviso: string; // "Sorteo: **…** · Décimo: **…** · …"  (o "" si no hay datos)
  ventajas: { titulo: string; parrafos: string[]; puntos: string[] };
  comoComprar: { titulo: string; parrafos: string[] };
  cita: string; // texto del testimonio de Víctor
  faqs: { q: string; a: string }[];
  ctaFinal: { kicker: string; titulo: string; texto: string; fineprint: string };
  faltantes?: string[];
};

/* ── Constantes de negocio (fijas; el modelo no las inventa) ── */
const FIRMA_VICTOR = "Víctor — Lotería Las Arenas, Adm. nº 336 · Barcelona";
const FOOTER_HTML =
  '<strong style="color:rgba(202,166,105,0.7);">Lotería Las Arenas</strong> · Administración Oficial nº 336 · C.C. Arenas de Barcelona<br>Gran Via de les Corts Catalanes, 373-385, L-S28, 08015 Barcelona · <strong style="color:rgba(202,166,105,0.7);">934 247 349</strong>';

/* ── Utilidades de texto ── */
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
/** Escapa y convierte **dato** en dorado. */
function fmt(s: string): string {
  return esc(s).replace(
    /\*\*([^*]+)\*\*/g,
    '<strong style="color:#caa669;">$1</strong>',
  );
}

/* ── Estilos inline reutilizables ── */
const P = 'style="font-size:14px;color:rgba(242,242,242,0.7);line-height:1.8;margin:0 0 1rem;"';
const RULE = '<div style="width:26px;height:2px;background:#caa669;margin:0 0 1rem;">&nbsp;</div>';

function h2(titulo: string): string {
  return (
    `<h2 style="font-size:20px;font-weight:bold;color:#f2f2f2;line-height:1.3;margin:2rem 0 0.4rem;">${fmt(titulo)}</h2>` +
    RULE
  );
}
function parrafos(ps: string[]): string {
  return (ps || []).filter(Boolean).map((p) => `<p ${P}>${fmt(p)}</p>`).join("");
}
function cta(url: string | null, texto: string): string {
  const href = url ? esc(url) : "#";
  return `<a style="display:inline-block;background:#caa669;color:#1b1d39;font-size:11px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;padding:12px 28px;border-radius:3px;text-decoration:none;box-shadow:0 4px 12px rgba(202,166,105,0.3);" href="${href}" target="_blank" rel="noopener">${esc(texto)} →</a>`;
}

/** Monta el HTML completo del post (cuerpo, autocontenido, listo para GAdmin). */
export function ensamblarHtml(c: ContenidoPost, url: string | null): string {
  const partes: string[] = [];

  partes.push(
    '<div style="font-family:Arial,sans-serif;background:#1b1d39;color:#f2f2f2;padding:32px 20px;box-sizing:border-box;">',
    '<div style="max-width:660px;margin:0 auto;">',
  );

  // 1) HERO
  partes.push('<div style="text-align:center;padding:1rem 0 2rem;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:1.5rem;">');
  partes.push('<div style="width:36px;height:2px;background:#caa669;margin:0 auto 1.25rem;">&nbsp;</div>');
  if (c.hero?.kicker)
    partes.push(`<p style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#caa669;font-weight:bold;margin:0 0 0.75rem;">${esc(c.hero.kicker)}</p>`);
  partes.push(`<h1 style="font-size:26px;font-weight:bold;color:#f2f2f2;line-height:1.3;margin:0 0 0.6rem;">${fmt(c.hero?.titulo || c.titulo)}</h1>`);
  if (c.hero?.lead)
    partes.push(`<p style="font-size:14.5px;color:rgba(242,242,242,0.85);line-height:1.8;font-weight:300;margin:0 0 1rem;">${fmt(c.hero.lead)}</p>`);
  partes.push(`<div style="margin-bottom:1.25rem;">${cta(url, "Comprar décimo")}</div>`);
  if (c.hero?.imagen)
    partes.push(`<div style="border:2px dashed rgba(202,166,105,0.4);border-radius:8px;padding:2.5rem 1rem;text-align:center;background:rgba(202,166,105,0.04);"><div style="font-size:22px;margin-bottom:0.4rem;">🖼️</div><p style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(202,166,105,0.7);font-weight:bold;margin:0;">Imagen · ${esc(c.hero.imagen)}</p></div>`);
  partes.push("</div>");

  // 2) INTRO + aviso
  if (c.intro)
    partes.push(`<p style="font-size:14.5px;color:rgba(242,242,242,0.75);line-height:1.8;border-left:3px solid #caa669;padding-left:1.2rem;margin:0 0 1.5rem;">${fmt(c.intro)}</p>`);
  if (c.aviso && c.aviso.trim())
    partes.push(`<div style="background:rgba(202,166,105,0.1);border-left:4px solid #caa669;border-radius:4px;padding:0.85rem 1.2rem;font-size:13px;color:#e2c99a;margin:0 0 2rem;">${fmt(c.aviso)}</div>`);

  // 3) VENTAJAS
  if (c.ventajas) {
    partes.push(h2(c.ventajas.titulo || "Por qué comprar en Las Arenas"));
    partes.push(parrafos(c.ventajas.parrafos));
    (c.ventajas.puntos || []).filter(Boolean).forEach((pt, i, arr) => {
      const mb = i === arr.length - 1 ? "1rem" : "0.4rem";
      partes.push(`<p style="font-size:14px;color:rgba(242,242,242,0.7);line-height:1.8;margin:0 0 ${mb};"><strong style="color:#caa669;">→ </strong>${fmt(pt)}</p>`);
    });
  }

  // 4) CÓMO COMPRAR
  if (c.comoComprar) {
    partes.push(h2(c.comoComprar.titulo || "Cómo comprar tu décimo"));
    partes.push(parrafos(c.comoComprar.parrafos));
    partes.push(`<div style="text-align:center;margin:1.5rem 0 2rem;">${cta(url, "Comprar mi décimo")}</div>`);
  }

  // 5) CITA DE VÍCTOR
  if (c.cita && c.cita.trim())
    partes.push(
      `<div style="background:#13152a;border:1px solid rgba(202,166,105,0.25);border-radius:8px;padding:1.25rem 1.5rem;margin:0 0 2rem;"><div style="color:#caa669;font-size:28px;line-height:1;margin-bottom:0.2rem;font-family:Georgia,serif;">&ldquo;</div><p style="font-size:16px;font-style:italic;color:#f2f2f2;font-weight:300;line-height:1.6;margin:0 0 0.4rem;">${esc(c.cita)}</p><p style="font-size:12px;color:rgba(242,242,242,0.4);margin:0;">${esc(FIRMA_VICTOR)}</p></div>`,
    );

  // 6) FAQs
  if (c.faqs && c.faqs.length) {
    partes.push(h2("Preguntas frecuentes"));
    for (const f of c.faqs) {
      if (!f || !f.q) continue;
      partes.push(
        `<details style="background:#13152a;border:1px solid rgba(202,166,105,0.3);border-radius:8px;margin:0 0 1rem;overflow:hidden;"><summary style="cursor:pointer;padding:1rem 1.3rem;font-size:14.5px;color:#f2f2f2;font-weight:bold;list-style:none;">${esc(f.q)}</summary><div style="padding:0 1.3rem 1.3rem;border-top:1px solid rgba(202,166,105,0.15);"><p style="font-size:13.5px;color:rgba(242,242,242,0.75);line-height:1.8;margin:1rem 0 0;">${fmt(f.a || "")}</p></div></details>`,
      );
    }
  }

  // 7) CTA FINAL
  if (c.ctaFinal) {
    partes.push('<div style="background:linear-gradient(135deg,#13152a,#1b1d39);border:1px solid rgba(202,166,105,0.3);border-radius:10px;padding:2.25rem 1.5rem;text-align:center;margin:2rem 0;">');
    partes.push('<div style="width:36px;height:2px;background:#caa669;margin:0 auto 0.8rem;">&nbsp;</div>');
    if (c.ctaFinal.kicker)
      partes.push(`<p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#caa669;font-weight:bold;margin:0 0 0.9rem;">${esc(c.ctaFinal.kicker)}</p>`);
    partes.push(`<h2 style="font-size:21px;font-weight:bold;color:#f2f2f2;line-height:1.3;margin:0 0 0.75rem;">${fmt(c.ctaFinal.titulo || "")}</h2>`);
    if (c.ctaFinal.texto)
      partes.push(`<p style="font-size:14px;color:rgba(242,242,242,0.85);line-height:1.8;margin:0 auto 1.5rem;max-width:480px;">${fmt(c.ctaFinal.texto)}</p>`);
    partes.push(cta(url, "Comprar mi décimo"));
    if (c.ctaFinal.fineprint)
      partes.push(`<p style="font-size:11.5px;color:rgba(202,166,105,0.5);margin:1.1rem 0 0;line-height:1.6;">${esc(c.ctaFinal.fineprint)}</p>`);
    partes.push("</div>");
  }

  // 8) FOOTER + coletilla legal +18
  partes.push(`<div style="text-align:center;padding-top:1.5rem;border-top:1px solid rgba(202,166,105,0.2);margin-top:1.5rem;"><div style="width:26px;height:2px;background:#caa669;margin:0 auto 1rem;">&nbsp;</div><p style="font-size:11px;color:rgba(242,242,242,0.4);line-height:1.8;margin:0;">${FOOTER_HTML}</p></div>`);
  partes.push('<p style="text-align:center;font-size:11px;color:rgba(242,242,242,0.4);line-height:1.8;margin:0.75rem 0 0;">© Lotería Las Arenas · +18 · Juega con responsabilidad · <a style="color:rgba(202,166,105,0.7);text-decoration:none;" href="https://www.juegoseguro.es" target="_blank" rel="noopener">www.juegoseguro.es</a></p>');

  partes.push("</div></div>");
  return partes.join("\n");
}
