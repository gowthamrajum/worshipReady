/**
 * Converts an ordered array of display lines into positioned slide line objects
 * for the 960×540 CanvasEditor.
 *
 * Mirrors CanvasEditor's exact layout:
 *   • Same font family    : 'Anek Telugu', sans-serif
 *   • Same font-fit algo  : binary-search width + vertical cap (fitStanzaFontSize)
 *   • Same size limits    : 25 – 70 px  (matches CanvasToolbar MIN/MAX_FONT_SIZE)
 *   • Same spacing        : lineSpacing = fontSize × 1.2  (min 20 px, matches CanvasToolbar)
 *   • Same y meaning      : vertical CENTRE of element
 *                           (CanvasEditor uses transform: translate(-50%,-50%))
 */

const SLIDE_WIDTH       = 960;
const SLIDE_HEIGHT      = 540;
const FONT_FAMILY       = "'Anek Telugu', sans-serif";
const MAX_TEXT_WIDTH    = 800;               // CanvasEditor hard-coded element width
const MAX_TEXT_HEIGHT   = SLIDE_HEIGHT * 0.9; // processDrop: clientHeight * 0.9
const MIN_FONT          = 25;                // matches CanvasToolbar MIN_FONT_SIZE
const MAX_FONT          = 70;                // matches CanvasToolbar MAX_FONT_SIZE
const LINE_HEIGHT_FACTOR = 1.2;             // matches fitStanzaFontSize default

// Reuse a single offscreen canvas (same pattern as CanvasEditor.getMeasureCtx).
let _measureCtx = null;
function getCtx() {
  if (!_measureCtx) {
    _measureCtx = document.createElement("canvas").getContext("2d");
  }
  return _measureCtx;
}

/**
 * Warm up the canvas context with the Anek Telugu font so the first measurement
 * call doesn't fall back to the system font. The browser caches the loaded font
 * in its internal font list; once the page has rendered CanvasEditor at least
 * once the font is guaranteed to be available.
 */
function primeFontCache() {
  try {
    const ctx = getCtx();
    ctx.font = `${MIN_FONT}px ${FONT_FAMILY}`;
    ctx.measureText("అ A"); // forces font resolution
  } catch {
    // non-browser environment — ignore
  }
}
primeFontCache();

/**
 * Binary-search the largest integer font size in [MIN_FONT, MAX_FONT] so that
 * `text` fits within `maxWidth`. Identical to CanvasEditor.fitLineToWidth.
 */
function fitLineToWidth(text, maxWidth) {
  const ctx = getCtx();
  let lo = MIN_FONT, hi = MAX_FONT, best = MIN_FONT;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    ctx.font = `${mid}px ${FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth) {
      best = mid;
      lo   = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

/**
 * Identical to CanvasEditor.fitStanzaFontSize.
 * Returns the largest font (clamped to [MIN_FONT, MAX_FONT]) where every line
 * fits horizontally AND the full block fits vertically (0.9 safety margin).
 */
function fitStanzaFontSize(lines) {
  const horizMin   = Math.min(...lines.map((t) => fitLineToWidth(t, MAX_TEXT_WIDTH)));
  const vertMax    = Math.floor((MAX_TEXT_HEIGHT * 0.9) / (lines.length * LINE_HEIGHT_FACTOR));
  // Clamp to user-specified limits
  return Math.min(horizMin, vertMax, MAX_FONT);
  // Note: fitLineToWidth already returns ≥ MIN_FONT, so no lower clamp needed.
}

let _uid = 0;
const uid = () =>
  `line-${Date.now()}-${(++_uid).toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

/**
 * @param {string[]} lines  All lines for this slide (telugu + english combined).
 *                          Empty / null entries are stripped automatically.
 * @returns {object[]}  Line objects ready for useSlides / CanvasEditor.
 *
 * Centering derivation
 * ────────────────────
 * CanvasEditor renders each line as:
 *   position: absolute; top: y; transform: translate(-50%,-50%); height: fontSize
 *
 * ∴ element top   = y − fontSize/2
 *   element bottom = y + fontSize/2
 *   block top     = y[0] − fontSize/2
 *   block bottom  = y[N-1] + fontSize/2  = y[0] + (N−1)·spacing + fontSize/2
 *   block height  = (N−1)·spacing + fontSize
 *
 * For the block centre to sit at SLIDE_HEIGHT/2 = 270:
 *   y[0] = 270 − (N−1)·spacing/2
 *        = (SLIDE_HEIGHT − blockH) / 2  + fontSize / 2
 */
export function buildSongSlideLines(lines = []) {
  const filtered = lines.filter((l) => l != null && l !== "");
  if (!filtered.length) return [];

  const fontSize = fitStanzaFontSize(filtered);
  const spacing  = Math.max(20, Math.round(fontSize * LINE_HEIGHT_FACTOR));

  const blockH  = (filtered.length - 1) * spacing + fontSize;
  const startY  = (SLIDE_HEIGHT - blockH) / 2 + fontSize / 2;

  const stanzaId = `stanza-${uid()}`;

  return filtered.map((text, i) => ({
    id:          uid(),
    text,
    x:           SLIDE_WIDTH / 2,
    y:           Math.round(startY + i * spacing),
    fontSize,
    lineSpacing: spacing,
    stanzaId,
    textAlign:   "center",
  }));
}
