/**
 * Presenter Sync — turn a picked set of songs and psalms into the portable
 * "cantica-service" JSON envelope that Cantica (lumen-presenter) imports via
 * Sessions ▸ Import service.
 *
 * Unlike buildCanticaSession (which exports the WorshipReady composer's
 * freely-positioned canvas as `composed` layouts), this builds PLAIN slides —
 * just `lines` — so Cantica auto-fits them with its own theme, exactly as if the
 * song had been added inside Cantica. The slide-splitting rules below are a
 * deliberate mirror of lumen-presenter's src/renderer/src/control/slides.ts; keep
 * the two in step or the same song will paginate differently in each app.
 */

let _uid = 0;
const uid = () =>
  `wr-${Date.now().toString(36)}-${(++_uid).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Any character from the Telugu Unicode block. */
const TELUGU_CHAR = /[ఀ-౿]/;
const isTelugu = (line) => TELUGU_CHAR.test(line);

/**
 * Tidy lyric spacing. Song-book text carries long ragged runs of spaces; collapse
 * any run of 2+ to a single pair and trim. `||…||` repeat markers are left as
 * authored. (Mirrors formatLyricLine.)
 */
export function formatLyricLine(line) {
  return String(line).replace(/[ \t]{2,}/g, "  ").replace(/^[ \t]+|[ \t]+$/g, "");
}

/**
 * Pick a section's lines in the chosen language. "both" lays each block out as up
 * to 2 Telugu lines followed by THEIR up to 2 English lines, cut on even index
 * boundaries — english[i] is the transliteration of telugu[i], so the pairing has
 * to survive into the slide split below.
 */
function pickLines(telugu = [], english = [], lang) {
  if (lang === "telugu") return telugu.filter((l) => l && l.trim());
  if (lang === "english") return english.filter((l) => l && l.trim());
  const out = [];
  const n = Math.max(telugu.length, english.length);
  const has = (l) => !!l && String(l).trim().length > 0;
  for (let i = 0; i < n; i += 2) {
    const te = [telugu[i], telugu[i + 1]].filter(has);
    const en = [english[i], english[i + 1]].filter(has);
    if (!te.length && !en.length) continue;
    out.push(...te, ...en);
  }
  return out;
}

/** A lyric line ending in a repeat count, e.g. `…Kaadayaa (2)`. */
const REPEAT_LINE = /\(\s*\d+\s*\)\s*(?:\|\|[^|]*\|\|)?\s*$/;

/** Single-language split: ~lpp lines/slide, repeats kept with their lead-in,
 *  never a one-line slide, hard cap 2·lpp. (Mirrors chunkLyricLines.) */
export function chunkLyricLines(lines, lpp, groupRepeats = true) {
  const cap = lpp * 2;
  const slides = [];
  let cur = [];
  for (const line of lines) {
    const keepWithAbove =
      groupRepeats && REPEAT_LINE.test(line) && cur.length > 0 && cur.length < cap;
    if (cur.length >= lpp && !keepWithAbove) {
      slides.push(cur);
      cur = [];
    }
    cur.push(line);
    if (cur.length >= cap) {
      slides.push(cur);
      cur = [];
    }
  }
  if (cur.length) slides.push(cur);
  const n = slides.length;
  if (n > 1 && slides[n - 1].length < 2) {
    const prev = slides[n - 2];
    if (prev.length > 2) slides[n - 1].unshift(prev.pop());
    else {
      prev.push(...slides[n - 1]);
      slides.pop();
    }
  }
  return slides;
}

/**
 * Bilingual split that NEVER separates a Telugu line from its transliteration.
 * Rebuilds the [Telugu run][English run] blocks the lines were laid out in and
 * only ever cuts on a pair boundary; surplus lines with no counterpart get their
 * own single-language slides. (Mirrors chunkBilingualLines.)
 */
export function chunkBilingualLines(lines, pairsPerSlide) {
  const per = Math.max(1, pairsPerSlide);
  const src = lines.filter((l) => l.trim().length > 0);
  const blocks = [];
  let cur = null;
  for (const line of src) {
    const te = isTelugu(line);
    if (!cur || (te && cur.en.length > 0)) {
      cur = { te: [], en: [] };
      blocks.push(cur);
    }
    (te ? cur.te : cur.en).push(line);
  }
  const slides = [];
  for (const b of blocks) {
    const paired = Math.min(b.te.length, b.en.length);
    for (let i = 0; i < paired; i += per) {
      const n = Math.min(per, paired - i);
      slides.push([...b.te.slice(i, i + n), ...b.en.slice(i, i + n)]);
    }
    const leftover = b.te.length > paired ? b.te.slice(paired) : b.en.slice(paired);
    for (let i = 0; i < leftover.length; i += per) slides.push(leftover.slice(i, i + per));
  }
  return slides;
}

/** Strict check: every Telugu line on the slide keeps its transliteration. */
export function isSlidePaired(lines) {
  const te = lines.filter((l) => l.trim() && isTelugu(l)).length;
  const en = lines.filter((l) => l.trim() && !isTelugu(l) && /[A-Za-z]/.test(l)).length;
  return te === 0 || en === 0 || te === en;
}

/** A backend song (song_name / main_stanza / stanzas) → one Cantica item. */
export function songToItem(song, lang = "both") {
  const both = lang === "both";
  const lpp = both ? 4 : 2;
  const sections = [];
  const ms = song.main_stanza;
  if (ms && (ms.telugu?.length || ms.english?.length)) {
    sections.push({ label: "Pallavi", lines: pickLines(ms.telugu, ms.english, lang) });
  }
  (song.stanzas ?? []).forEach((st, i) => {
    sections.push({
      label: `Stanza ${st.stanza_number ?? i + 1}`,
      lines: pickLines(st.telugu, st.english, lang),
    });
  });

  const slides = [];
  for (const sec of sections) {
    const lines = sec.lines.filter((l) => l && l.trim()).map(formatLyricLine);
    if (!lines.length) continue;
    const chunks = both
      ? chunkBilingualLines(lines, Math.max(1, Math.round(lpp / 2)))
      : chunkLyricLines(lines, lpp, true);
    chunks.forEach((chunk, i) => {
      slides.push({
        id: uid(),
        kind: "text",
        label: chunks.length > 1 ? `${sec.label} (${i + 1})` : sec.label,
        lines: chunk,
        // Each lyric line stays on one line; Cantica shrinks to fit the widest.
        singleLine: true,
      });
    });
  }
  if (!slides.length) return null;
  return { id: uid(), title: String(song.song_name ?? "Song"), kind: "song", slides };
}

/** Psalm verses → a Responsive Reading heading item plus the verses item. */
export function psalmToItems(chapter, verses, lang = "both") {
  const list = (verses ?? []).filter((v) => (v.telugu || "").trim() || (v.english || "").trim());
  if (!list.length) return [];
  const first = list[0].verse;
  const last = list[list.length - 1].verse;
  const reference = first === last ? `${chapter}:${first}` : `${chapter}:${first}-${last}`;

  const heading = {
    id: uid(),
    title: "Responsive Reading",
    kind: "scripture",
    slides: [
      {
        id: uid(),
        kind: "text",
        label: "Responsive Reading",
        lines: [
          "ఉత్తర ప్రత్యుత్తర వాక్య పఠనం",
          "Responsive Reading",
          `కీర్తనలు ${reference}`,
          `Psalm ${reference}`,
        ],
      },
    ],
  };

  const slides = list
    .map((v) => {
      const ref = `Psalm ${v.chapter ?? chapter}:${v.verse}`;
      const te = (v.telugu || "").trim();
      const en = (v.english || "").trim();
      const lines = (lang === "telugu" ? [te] : lang === "english" ? [en] : [te, en]).filter(Boolean);
      return { id: uid(), kind: "scripture", label: ref, lines, caption: ref };
    })
    .filter((s) => s.lines.length > 0);
  if (!slides.length) return [];

  return [heading, { id: uid(), title: `Psalm ${reference}`, kind: "scripture", slides }];
}

/** Cantica's DEFAULT_THEME / DEFAULT_BACKGROUND (mirror of shared/types.ts). */
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
const CANTICA_BACKGROUND = {
  type: "gradient",
  value: "radial-gradient(circle at 50% 28%, #3a2b6b 0%, #1c1440 55%, #0a0720 100%)",
  fit: "cover",
};

/**
 * Build the `cantica-service` envelope from an ordered selection.
 *
 * @param {string} name     service name
 * @param {Array}  picks    [{ type:'song', song, lang } | { type:'psalm', chapter, verses, lang }]
 * @returns {object} a cantica-service v1 envelope
 */
export function buildPresenterSession(name, picks = []) {
  const items = [];
  for (const p of picks) {
    if (p.type === "song") {
      const it = songToItem(p.song, p.lang ?? "both");
      if (it) items.push(it);
    } else if (p.type === "psalm") {
      items.push(...psalmToItems(p.chapter, p.verses, p.lang ?? "both"));
    }
  }
  return {
    format: "cantica-service",
    version: 1,
    exportedAt: new Date().toISOString(),
    service: {
      name: name || "Presenter Sync Session",
      items,
      background: CANTICA_BACKGROUND,
      theme: CANTICA_THEME,
    },
  };
}

/** Total slides across the built items — for the UI's summary line. */
export function countSlides(envelope) {
  return (envelope?.service?.items ?? []).reduce((n, it) => n + (it.slides?.length ?? 0), 0);
}
