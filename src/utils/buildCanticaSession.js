/**
 * Session Maker — turn the current WorshipReady presentation into a portable
 * "cantica-service" JSON envelope that Cantica (lumen-presenter) imports directly
 * (its "Import service (JSON or ZIP)" reads exactly this shape).
 *
 * The two apps share the same 960×540 slide geometry, so a WorshipReady line
 * ({ text, x, y, fontSize, color, textAlign }) maps 1:1 onto a Cantica
 * ComposedLine, and each slide becomes a Cantica SlideContent with a `composed`
 * layout. Image/theme backgrounds are rendered to a self-contained data URL so
 * the JSON carries its own art and renders identically on the other side.
 */

import { STATIC_BACKGROUNDS } from "./staticBackgrounds";

const CANVAS_W = 960;
const CANVAS_H = 540;
const RENDER_SCALE = 2;
const DEFAULT_BG_COLOR = "#4b5c47";

// Cantica's DEFAULT_THEME (mirror of lumen-presenter src/shared/types.ts).
const CANTICA_THEME = {
  fontFamily: "'Anek Telugu', 'Inter', 'Helvetica Neue', Arial, sans-serif",
  textColor: "#ffffff",
  captionColor: "#ffd27f",
  fontScale: 1,
  textAlign: "center",
  shadow: true,
  uppercase: false,
  scrim: 0.35,
};

let _uid = 0;
const uid = () =>
  `wr-${Date.now().toString(36)}-${(++_uid).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── image loading + render caches ──────────────────────────────────────────
const _imgCache = new Map();
function loadImage(src) {
  if (_imgCache.has(src)) return _imgCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  _imgCache.set(src, p);
  return p;
}

/** Resolve a WorshipReady background theme (id string OR { category, name }) to a src. */
function themeSrc(theme) {
  if (!theme) return null;
  if (typeof theme === "string") {
    return STATIC_BACKGROUNDS.find((b) => b.id === theme)?.src ?? null;
  }
  const name = theme.name || theme.id;
  return STATIC_BACKGROUNDS.find((b) => b.label === name || b.id === name)?.src ?? null;
}

/** Render colour + optional image into a self-contained JPEG data URL (cover fit). */
async function renderBackgroundToDataUrl(color, imgSrc) {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W * RENDER_SCALE;
  canvas.height = CANVAS_H * RENDER_SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(RENDER_SCALE, RENDER_SCALE);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const img = await loadImage(imgSrc);
  const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.88);
}

const _bgCache = new Map();
/** Map a WorshipReady slide's background to a Cantica Background (deduped). */
async function backgroundFor(slide) {
  const color = slide.backgroundColor || DEFAULT_BG_COLOR;
  const imgSrc = themeSrc(slide.backgroundTheme) || slide.backgroundImage || null;
  if (!imgSrc) return { type: "color", value: color, fit: "cover" };
  const key = `${color}|${imgSrc}`;
  if (_bgCache.has(key)) return _bgCache.get(key);
  let bg;
  try {
    bg = { type: "image", value: await renderBackgroundToDataUrl(color, imgSrc), fit: "cover" };
  } catch {
    // e.g. a cross-origin image taints the canvas — fall back to the solid colour.
    bg = { type: "color", value: color, fit: "cover" };
  }
  _bgCache.set(key, bg);
  return bg;
}

/** Convert a same-origin image (e.g. the Offerings QR) to a portable data URL. */
async function toDataUrl(src) {
  if (typeof src === "string" && src.startsWith("data:")) return src;
  try {
    const img = await loadImage(src);
    const c = document.createElement("canvas");
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/png");
  } catch {
    return src; // keep the original reference if we can't inline it
  }
}

/** Infer a Cantica item kind from a slide label. */
function kindFor(label = "") {
  const l = label.toLowerCase();
  if (/psalm|reading|scripture|కీర్తన|వాక్య/.test(l)) return "scripture";
  if (/praise|worship|song|ఆరాధన|స్తుతి/.test(l)) return "song";
  return "text";
}

/** One WorshipReady slide → one Cantica SlideContent. */
async function toSlideContent(slide) {
  const lines = slide.lines || [];
  const textLines = lines.filter((l) => l && l.type !== "image" && l.text);
  const imageLines = lines.filter((l) => l && l.type === "image" && l.src);

  const composed = textLines.map((l) => ({
    id: l.id || uid(),
    text: l.text,
    x: l.x,
    y: l.y,
    fontSize: l.fontSize,
    color: l.color || undefined,
    align: l.textAlign || "center",
    stanzaId: l.stanzaId ?? null,
  }));

  const background = await backgroundFor(slide);
  // A QR / inline image (the Offerings donations QR) → Cantica's `qr` field.
  const qr = imageLines.length ? await toDataUrl(imageLines[0].src) : undefined;

  return {
    id: slide.id || uid(),
    kind: "text",
    ...(slide.label ? { label: slide.label } : {}),
    lines: textLines.map((l) => l.text), // fallback for consumers that ignore `composed`
    composed,
    background,
    ...(qr ? { qr } : {}),
  };
}

/**
 * Group the flat slide list into Cantica items (titled groups). Consecutive
 * slides sharing a non-empty label become one item; a run of unlabeled slides
 * (e.g. a song's slides) becomes one item titled by its first line.
 */
function groupIntoItems(slideContents, rawSlides) {
  const items = [];
  let cur = null;
  slideContents.forEach((sc, i) => {
    const label = rawSlides[i].label || "";
    const startNew = !cur || (label && label !== cur._label) || (!label && cur._label);
    if (startNew) {
      const title =
        label || sc.lines[0] || sc.composed[0]?.text || `Slides ${items.length + 1}`;
      cur = { id: uid(), title, kind: kindFor(label), slides: [], _label: label };
      items.push(cur);
    }
    cur.slides.push(sc);
  });
  // Strip the internal grouping key before returning.
  return items.map(({ _label, ...it }) => it);
}

/**
 * Build the portable Cantica service envelope from the current presentation.
 * Async because image/theme backgrounds are rendered to embedded data URLs.
 *
 * @param {string} presentationName
 * @param {Array}  slides  WorshipReady slides (the session's `slides`)
 * @returns {Promise<object>} a `cantica-service` v1 envelope
 */
export async function buildCanticaSession(presentationName, slides = []) {
  const slideContents = [];
  for (const slide of slides) slideContents.push(await toSlideContent(slide));
  const items = groupIntoItems(slideContents, slides);
  const firstBg = slideContents.find((sc) => sc.background)?.background;

  return {
    format: "cantica-service",
    version: 1,
    exportedAt: new Date().toISOString(),
    service: {
      name: presentationName || "Untitled Service",
      items,
      background: firstBg || { type: "color", value: DEFAULT_BG_COLOR, fit: "cover" },
      theme: CANTICA_THEME,
    },
  };
}
