import React, { useEffect, useMemo, useState } from "react";
import { FiChevronUp, FiChevronDown, FiX } from "react-icons/fi";
import {
  songSections,
  detectRecurringSection,
  buildSongArrangement,
  sectionUnits,
  unitLines,
  autoGroups,
  groupsFit,
} from "../../utils/buildPresenterSession";

/** Cumulative unit index after each slide, i.e. where the breaks sit. */
function groupsToBreaks(groups) {
  const breaks = new Set();
  let at = 0;
  for (let i = 0; i < groups.length - 1; i++) {
    at += groups[i];
    breaks.add(at - 1);
  }
  return breaks;
}
function breaksToGroups(breaks, unitCount) {
  const groups = [];
  let run = 0;
  for (let i = 0; i < unitCount; i++) {
    run++;
    if (breaks.has(i) || i === unitCount - 1) { groups.push(run); run = 0; }
  }
  return groups;
}

/**
 * Shown when adding a song in Presenter Sync: choose which stanzas play, reorder
 * them, and pick which part recurs after each stanza (auto-detected). Mirrors
 * Cantica's own Add-song dialog so a song added here is arranged the same way.
 */
export default function SongStructureModal({ song, lang, onCancel, onConfirm }) {
  const sections = useMemo(() => songSections(song, lang), [song, lang]);
  const [order, setOrder] = useState([]);
  const [included, setIncluded] = useState(new Set());
  const [recurring, setRecurring] = useState(null);
  /** which section's slide-grouping editor is expanded, or null */
  const [expanded, setExpanded] = useState(null);
  /** operator-chosen units-per-slide, by section id (absent = automatic) */
  const [groups, setGroups] = useState({});
  /** section lines rewritten by moving units (absent = as written) */
  const [lineOverride, setLineOverride] = useState({});

  useEffect(() => {
    setOrder(sections.map((s) => s.id));
    setIncluded(new Set(sections.map((s) => s.id)));
    setRecurring(detectRecurringSection(sections));
    setExpanded(null);
    setGroups({});
    setLineOverride({});
  }, [sections]);

  const byId = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  // ---- slide grouping ----
  const lpp = lang === "both" ? 4 : 2;
  const isBi = lang === "both";
  const linesOf = (id) => lineOverride[id] ?? byId.get(id)?.lines ?? [];
  const unitsOf = (id) => sectionUnits(linesOf(id), isBi);
  const groupsOf = (id) => {
    const units = unitsOf(id);
    const chosen = groups[id];
    if (groupsFit(chosen, units.length)) return chosen;
    return autoGroups(linesOf(id), isBi, lpp);
  };
  const toggleBreak = (id, u) => {
    const b = groupsToBreaks(groupsOf(id));
    if (b.has(u)) b.delete(u); else b.add(u);
    setGroups((p) => ({ ...p, [id]: breaksToGroups(b, unitsOf(id).length) }));
  };
  /** Move a whole unit — a Telugu line and its transliteration travel together. */
  const moveUnit = (id, i, dir) => {
    const units = unitsOf(id);
    const j = i + dir;
    if (j < 0 || j >= units.length) return;
    // Pin the grouping as it stands. Reordering writes the lines back unit by
    // unit, which interleaves the two languages — so the AUTOMATIC split would
    // then see one pair per block and re-paginate (2 slides became 4). A swap
    // leaves the unit count alone, so the current grouping still fits exactly.
    const held = groupsOf(id);
    const next = units.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setLineOverride((p) => ({ ...p, [id]: next.flatMap(unitLines) }));
    setGroups((p) => ({ ...p, [id]: held }));
  };
  /** The section as the slides it will produce: units grouped per slide. */
  const slidesOf = (id) => {
    const units = unitsOf(id);
    const out = [];
    let i = 0;
    for (const g of groupsOf(id)) { out.push(units.slice(i, i + g)); i += g; }
    if (i < units.length) out.push(units.slice(i));
    return out.filter((x) => x.length > 0);
  };

  /** Write a slide layout back as lines + grouping (empty slides disappear). */
  const applySlides = (id, slides) => {
    const kept = slides.filter((x) => x.length > 0);
    setLineOverride((p) => ({ ...p, [id]: kept.flat().flatMap(unitLines) }));
    setGroups((p) => ({ ...p, [id]: kept.map((x) => x.length) }));
  };

  /** Where a drag started: stanza, slide, unit. */
  const [drag, setDrag] = useState(null);
  const [overSlide, setOverSlide] = useState(null);

  /**
   * Drop the dragged pair onto `toSlide` at `toIndex` (null = the end) — this is
   * how two lines are put on one slide. The pair moves whole.
   */
  const dropUnit = (id, toSlide, toIndex) => {
    if (!drag || drag.id !== id) return;
    const slides = slidesOf(id).map((x) => x.slice());
    const [unit] = slides[drag.s].splice(drag.u, 1);
    if (!unit) return;
    while (slides.length <= toSlide) slides.push([]);
    const target = slides[toSlide];
    let at = toIndex == null || toIndex > target.length ? target.length : toIndex;
    if (drag.s === toSlide && drag.u < at) at -= 1;
    target.splice(Math.max(0, at), 0, unit);
    applySlides(id, slides);
    setDrag(null);
    setOverSlide(null);
  };

  /** Which slide (group index) a unit currently sits in. */
  const groupOfUnit = (grps, unitIndex) => {
    let at = 0;
    for (let g = 0; g < grps.length; g++) { at += grps[g]; if (unitIndex < at) return g; }
    return Math.max(0, grps.length - 1);
  };

  /**
   * Move a unit OUT of one stanza and onto the end of another — the Telugu line
   * and its transliteration travel together across stanzas too. Both groupings
   * are carried rather than recomputed, since the flat unit-by-unit storage
   * interleaves the languages and the automatic split would re-paginate both.
   */
  const moveUnitTo = (fromId, index, toId) => {
    if (fromId === toId) return;
    const fromUnits = unitsOf(fromId);
    const toUnits = unitsOf(toId);
    const unit = fromUnits[index];
    if (!unit) return;

    const fromGroups = groupsOf(fromId).slice();
    fromGroups[groupOfUnit(fromGroups, index)] -= 1;
    const nextFromGroups = fromGroups.filter((n) => n > 0);

    const toGroups = groupsOf(toId).slice();
    if (toGroups.length) toGroups[toGroups.length - 1] += 1; else toGroups.push(1);

    setLineOverride((p) => ({
      ...p,
      [fromId]: fromUnits.filter((_, i) => i !== index).flatMap(unitLines),
      [toId]: [...toUnits, unit].flatMap(unitLines),
    }));
    setGroups((p) => ({ ...p, [fromId]: nextFromGroups, [toId]: toGroups }));
  };

  const resetSection = (id) => {
    setGroups((p) => { const n = { ...p }; delete n[id]; return n; });
    setLineOverride((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  const toggle = (id) =>
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (recurring === id) setRecurring(null); // can't repeat a stanza you dropped
      } else next.add(id);
      return next;
    });

  const move = (id, dir) =>
    setOrder((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const includedInOrder = order.filter((id) => included.has(id));
  const canAdd = includedInOrder.length > 0;

  // Live preview of the resulting play order, so "repeat after each stanza" is
  // something you can see rather than infer.
  const playOrder = useMemo(
    () => buildSongArrangement(sections, includedInOrder, recurring).map((id) => byId.get(id)?.label ?? "?"),
    [sections, includedInOrder, recurring, byId]
  );

  const firstLine = (id) => {
    const l = byId.get(id)?.lines.find((x) => x.trim()) ?? "";
    return l.length > 48 ? `${l.slice(0, 48)}…` : l;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-gray-800">Add “{song.song_name}”</h3>
          <button className="text-gray-400 hover:text-gray-700" onClick={onCancel} title="Cancel">
            <FiX size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-auto space-y-2">
          <p className="text-xs text-gray-500">
            Reorder and tick to include; pick one part to repeat after each stanza.
          </p>

          <label
            className={`flex items-center gap-3 border rounded px-3 py-2 cursor-pointer ${
              recurring === null ? "bg-indigo-50 border-indigo-300" : ""
            }`}
          >
            <span className="w-12" />
            <span className="flex-1 text-sm text-gray-700">Don’t repeat any section</span>
            <input
              type="radio"
              name="recurring"
              checked={recurring === null}
              onChange={() => setRecurring(null)}
            />
          </label>

          {order.map((id, idx) => {
            const sec = byId.get(id);
            if (!sec) return null;
            const inc = included.has(id);
            return (
              <div key={id}>
              <div
                className={`flex items-center gap-3 border rounded px-3 py-2 ${
                  recurring === id ? "bg-indigo-50 border-indigo-300" : ""
                } ${inc ? "" : "opacity-50"}`}
              >
                <span className="flex flex-col">
                  <button
                    className="text-gray-400 hover:text-indigo-700 disabled:opacity-30"
                    onClick={() => move(id, -1)}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    <FiChevronUp size={14} />
                  </button>
                  <button
                    className="text-gray-400 hover:text-indigo-700 disabled:opacity-30"
                    onClick={() => move(id, 1)}
                    disabled={idx === order.length - 1}
                    title="Move down"
                  >
                    <FiChevronDown size={14} />
                  </button>
                </span>
                <input type="checkbox" checked={inc} onChange={() => toggle(id)} title="Include this stanza" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{sec.label}</div>
                  <div className="text-xs text-gray-500 truncate">{firstLine(id) || "—"}</div>
                </div>
                <button
                  className={`shrink-0 text-xs rounded-full border px-2 py-0.5 whitespace-nowrap ${
                    expanded === id
                      ? "border-indigo-400 bg-indigo-100 text-indigo-800"
                      : groups[id] || lineOverride[id]
                        ? "border-indigo-400 text-indigo-700"
                        : "border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-gray-700"
                  } disabled:opacity-40`}
                  disabled={!inc}
                  onClick={() => setExpanded(expanded === id ? null : id)}
                  title="Choose which lines share a slide"
                >
                  {groupsOf(id).length} slide{groupsOf(id).length === 1 ? "" : "s"}
                </button>
                <input
                  type="radio"
                  name="recurring"
                  checked={recurring === id}
                  disabled={!inc}
                  onChange={() => setRecurring(id)}
                  title="Repeat this after each stanza"
                />
                </div>

                {expanded === id && (
                  <div className="ml-10 mt-1 mb-2 border border-dashed rounded p-3 bg-gray-50">
                    <div className="text-xs text-gray-500 mb-2">
                      Drag a pair onto another slide to put those lines together
                      {isBi && " · each Telugu line stays with its transliteration"}
                      {(groups[id] || lineOverride[id]) && (
                        <button
                          className="ml-2 text-[10px] border rounded-full px-2 py-0.5 text-gray-500 hover:text-gray-800"
                          onClick={() => resetSection(id)}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {slidesOf(id).map((slideUnits, si) => (
                        <div
                          key={si}
                          className={`rounded border p-1.5 ${
                            overSlide === si && drag?.id === id
                              ? "border-indigo-400 bg-indigo-50"
                              : "border-gray-200 bg-white/60"
                          }`}
                          onDragOver={(e) => { if (drag?.id !== id) return; e.preventDefault(); setOverSlide(si); }}
                          onDragLeave={() => setOverSlide((v) => (v === si ? null : v))}
                          onDrop={(e) => { e.preventDefault(); dropUnit(id, si, null); }}
                        >
                          <div className="text-[9px] uppercase tracking-wide text-gray-400 mb-1">
                            Slide {si + 1}
                          </div>
                          {slideUnits.map((unit, ui) => (
                            <div
                              key={ui}
                              draggable
                              onDragStart={() => setDrag({ id, s: si, u: ui })}
                              onDragEnd={() => { setDrag(null); setOverSlide(null); }}
                              onDragOver={(e) => { if (drag?.id !== id) return; e.preventDefault(); e.stopPropagation(); setOverSlide(si); }}
                              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropUnit(id, si, ui); }}
                              className={`flex items-center gap-2 px-2 py-1 mb-1 last:mb-0 rounded bg-white border-l-2 border-indigo-300 cursor-grab ${
                                drag?.id === id && drag.s === si && drag.u === ui ? "opacity-40" : ""
                              }`}
                            >
                              <span className="shrink-0 text-gray-300 select-none" title="Drag onto another slide to pair these lines with it">⠿</span>
                              <span className="flex-1 min-w-0">
                                {unitLines(unit).map((line, k) => (
                                  <span key={k} className="block text-xs text-gray-800 truncate">{line}</span>
                                ))}
                              </span>
                              {order.filter((o) => o !== id && included.has(o)).length > 0 && (
                                <select
                                  className="shrink-0 text-[10px] border rounded px-1 py-0.5 text-gray-500 bg-white hover:border-indigo-400"
                                  value=""
                                  onChange={(e) => {
                                    if (!e.target.value) return;
                                    const flat = slidesOf(id).slice(0, si).reduce((n, x) => n + x.length, 0) + ui;
                                    moveUnitTo(id, flat, e.target.value);
                                  }}
                                  title="Move these lines to another stanza"
                                >
                                  <option value="">Move to…</option>
                                  {order.filter((o) => o !== id && included.has(o)).map((o) => (
                                    <option key={o} value={o}>{byId.get(o)?.label ?? o}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                      <div
                        className={`rounded border border-dashed p-2 text-center text-[9px] uppercase tracking-wide ${
                          overSlide === slidesOf(id).length && drag?.id === id
                            ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                            : "border-gray-300 text-gray-400"
                        }`}
                        onDragOver={(e) => { if (drag?.id !== id) return; e.preventDefault(); setOverSlide(slidesOf(id).length); }}
                        onDragLeave={() => setOverSlide(null)}
                        onDrop={(e) => { e.preventDefault(); dropUnit(id, slidesOf(id).length, null); }}
                      >
                        drop here for a new slide
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {canAdd && (
            <div className="mt-3 border-t pt-3">
              <div className="text-xs font-medium text-gray-600 mb-1">Play order</div>
              <div className="flex flex-wrap gap-1">
                {playOrder.map((label, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t">
          {!canAdd && <span className="text-xs text-red-600 mr-auto">Pick at least one stanza</span>}
          <button className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40"
            disabled={!canAdd}
            onClick={() =>
              onConfirm({
                includedIds: includedInOrder,
                recurringId: recurring,
                groups,
                sectionLines: lineOverride,
              })
            }
          >
            Add song
          </button>
        </div>
      </div>
    </div>
  );
}
