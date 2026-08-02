/**
 * Service Builder — turn a picked set of songs and psalms into the portable
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

/**
 * One groupable unit: a lyric line, or — in a bilingual stanza — a Telugu line
 * WITH its English transliteration. Keeping the two sides in separate fields is
 * what preserves the Telugu-block-then-English-block layout when several units
 * share a slide, and what makes a unit indivisible when reordering.
 * (Mirrors SlideUnit / sectionUnits.)
 */
export function sectionUnits(lines, bilingual) {
  const src = lines.filter((l) => l && l.trim().length > 0);
  if (!bilingual) return src.map((l) => ({ lines: [l], translit: [] }));
  return chunkBilingualLines(src, 1).map((pair) => ({
    lines: pair.filter(isTelugu),
    translit: pair.filter((l) => !isTelugu(l)),
  }));
}

/** A unit's lines in render order. */
export const unitLines = (u) => [...u.lines, ...u.translit];

/** Slice units into slides, stacking every unit's lyric lines then every unit's
 *  transliterations — the block layout the automatic split produces. */
export function applyGroups(units, groups) {
  const slide = (us) => [...us.flatMap((u) => u.lines), ...us.flatMap((u) => u.translit)];
  const out = [];
  let i = 0;
  for (const g of groups) {
    const n = Math.max(1, Math.floor(g));
    const s = units.slice(i, i + n);
    i += n;
    if (s.length) out.push(slide(s));
  }
  if (i < units.length) out.push(slide(units.slice(i)));
  return out;
}

/** The unit grouping the automatic split would produce. */
export function autoGroups(lines, bilingual, lpp) {
  const units = sectionUnits(lines, bilingual);
  const src = lines.filter((l) => l && l.trim().length > 0);
  const chunks = bilingual
    ? chunkBilingualLines(src, Math.max(1, Math.round(lpp / 2)))
    : chunkLyricLines(src, lpp, true);
  const out = [];
  let u = 0;
  for (const c of chunks) {
    let taken = 0, n = 0;
    while (u < units.length && taken < c.length) { taken += unitLines(units[u]).length; u++; n++; }
    if (n > 0) out.push(n);
  }
  if (u < units.length) out.push(units.length - u);
  return out;
}

/** A grouping describes its section only while it accounts for every unit. */
export const groupsFit = (groups, unitCount) =>
  !!groups?.length && groups.reduce((a, b) => a + b, 0) === unitCount;

/** Strict check: every Telugu line on the slide keeps its transliteration. */
export function isSlidePaired(lines) {
  const te = lines.filter((l) => l.trim() && isTelugu(l)).length;
  const en = lines.filter((l) => l.trim() && !isTelugu(l) && /[A-Za-z]/.test(l)).length;
  return te === 0 || en === 0 || te === en;
}

/**
 * A backend song → its sections in written order, in the chosen language.
 * Ids are stable for a given song+language so the structure modal can reference
 * them. (Pallavi is the main_stanza; the rest are the numbered stanzas.)
 */
export function songSections(song, lang = "both") {
  const out = [];
  const ms = song.main_stanza;
  if (ms && (ms.telugu?.length || ms.english?.length)) {
    out.push({ id: "pallavi", kind: "chorus", label: "Pallavi", lines: pickLines(ms.telugu, ms.english, lang) });
  }
  (song.stanzas ?? []).forEach((st, i) => {
    const n = st.stanza_number ?? i + 1;
    out.push({
      id: `stanza-${n}-${i}`,
      kind: "verse",
      label: `Stanza ${n}`,
      lines: pickLines(st.telugu, st.english, lang),
    });
  });
  return out.filter((s) => s.lines.some((l) => l && l.trim()));
}

const blockKey = (s) => s.lines.map((l) => l.trim()).filter(Boolean).join("\n");
const hasContent = (s) => s.lines.some((l) => l.trim().length > 0);

/**
 * Guess which section recurs after each stanza (the Pallavi / chorus / refrain).
 * Prefers an explicit chorus, then a telltale label, then a section whose lyric
 * block repeats. Null if unsure. (Mirrors detectRecurringSection.)
 */
export function detectRecurringSection(sections) {
  const secs = sections.filter(hasContent);
  if (secs.length < 2) return null;
  const chorus = secs.find((s) => s.kind === "chorus");
  if (chorus) return chorus.id;
  const labelled = secs.find((s) => /pallavi|chorus|refrain|పల్లవి/i.test(s.label));
  if (labelled) return labelled.id;
  const firstId = new Map();
  const seen = new Map();
  for (const s of secs) {
    const k = blockKey(s);
    if (!k) continue;
    seen.set(k, (seen.get(k) ?? 0) + 1);
    if (!firstId.has(k)) firstId.set(k, s.id);
  }
  for (const [k, n] of seen) if (n > 1) return firstId.get(k) ?? null;
  return null;
}

/**
 * Play order for the chosen sections. A recurring section plays after every
 * other included section — leading too when the presenter placed it first — for
 * the worship-standard Pallavi, V1, Pallavi, V2, Pallavi. Sections that merely
 * duplicate the refrain's lyrics collapse into it so it never plays twice in a
 * row. (Mirrors buildSongArrangement.)
 */
export function buildSongArrangement(sections, includedIds, recurringId) {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const included = includedIds.map((id) => byId.get(id)).filter(Boolean);
  if (!included.length) return [];
  const rec = recurringId ? byId.get(recurringId) : undefined;
  if (rec && includedIds.includes(rec.id) && hasContent(rec)) {
    const recKey = blockKey(rec);
    const isRefrain = (s) => blockKey(s) === recKey;
    const others = included.filter((s) => !isRefrain(s));
    if (!others.length) return [rec.id];
    const arr = isRefrain(included[0]) ? [rec.id] : [];
    for (const s of others) {
      arr.push(s.id);
      arr.push(rec.id);
    }
    return arr;
  }
  return included.map((s) => s.id);
}

/**
 * A backend song → one Cantica item.
 *
 * `structure` is what the Add-song modal chose: which sections play, in what
 * order, and which one repeats after each stanza. Omit it and the whole song
 * plays in written order.
 */
export function songToItem(song, lang = "both", structure = null) {
  const both = lang === "both";
  const lpp = both ? 4 : 2;
  const all = songSections(song, lang);
  const order = structure?.includedIds?.length
    ? buildSongArrangement(all, structure.includedIds, structure.recurringId ?? null)
    : all.map((s) => s.id);
  const byId = new Map(all.map((s) => [s.id, s]));
  const sections = order.map((id) => byId.get(id)).filter(Boolean);

  const slides = [];
  for (const sec of sections) {
    // Lines the operator reordered by moving units, else as written.
    const raw = structure?.sectionLines?.[sec.id] ?? sec.lines;
    const lines = raw.filter((l) => l && l.trim()).map(formatLyricLine);
    if (!lines.length) continue;
    const units = sectionUnits(lines, both);
    const chosen = structure?.groups?.[sec.id];
    // An operator grouping wins while it still accounts for every unit; a stale
    // one falls back to the automatic split rather than mis-slicing.
    const chunks = groupsFit(chosen, units.length)
      ? applyGroups(units, chosen)
      : both
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
  return {
    id: uid(),
    title: String(song.song_name ?? "Song"),
    kind: "song",
    slides,
  };
}

/**
 * A psalm becomes the same two items Cantica's own "add psalm" makes: a
 * Responsive Reading heading, then one scripture slide per verse captioned with
 * its reference. Mirrors responsiveReadingHeading + bilingualScriptureSlides in
 * lumen-presenter; keep them in step or a psalm added here reads differently
 * from one added there.
 *
 * @param {number} chapter
 * @param {Array}  verses  [{ chapter, verse, telugu, english }]
 * @param {string} lang    'both' | 'telugu' | 'english'
 */
export function psalmToItems(chapter, verses = [], lang = "both") {
  const list = (verses ?? []).filter((v) => v && (v.telugu || v.english));
  if (!list.length) return [];

  // "23" for a whole chapter, "23:1-6" for a run — the same shape Cantica labels
  // a reading with.
  const nums = list.map((v) => Number(v.verse)).filter((n) => Number.isFinite(n));
  const lo = nums.length ? Math.min(...nums) : null;
  const hi = nums.length ? Math.max(...nums) : null;
  const reference =
    lo == null ? String(chapter) : lo === hi ? `${chapter}:${lo}` : `${chapter}:${lo}-${hi}`;

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
      const ref = `Psalm ${chapter}:${v.verse}`;
      const te = String(v.telugu ?? "").trim();
      const en = String(v.english ?? "").trim();
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
 * Where an imported item belongs in a Sunday order. Cantica reads this on import
 * to drop worship into the gap between Sunday School and the Sermon, and to put an
 * offering song against the Offerings slot, rather than appending everything to
 * the end. An item with no slot appends, which is what older exports do — the
 * field is additive, so a session built here still imports into a Cantica that
 * has never heard of it.
 */
export const SLOT_WORSHIP = "worship";
export const SLOT_OFFERING = "offering";

/**
 * Build the `cantica-service` envelope from an ordered selection.
 *
 * @param {string} name     service name
 * @param {Array}  picks    [{ type:'song', song, lang, offering } | { type:'psalm', chapter, verses, lang }]
 * @returns {object} a cantica-service v1 envelope
 */
export function buildPresenterSession(name, picks = []) {
  const items = [];
  for (const p of picks) {
    if (p.type === "song") {
      const it = songToItem(p.song, p.lang ?? "both", p.structure ?? null);
      if (it) items.push({ ...it, slot: p.offering ? SLOT_OFFERING : SLOT_WORSHIP });
    } else if (p.type === "psalm") {
      // A psalm is a reading, never the offering song.
      items.push(...psalmToItems(p.chapter, p.verses, p.lang ?? "both").map((it) => ({ ...it, slot: SLOT_WORSHIP })));
    }
  }
  return {
    format: "cantica-service",
    version: 1,
    exportedAt: new Date().toISOString(),
    service: {
      name: name || "Sunday Service",
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
