import React, { useEffect, useMemo, useState } from "react";
import { FiChevronUp, FiChevronDown, FiX } from "react-icons/fi";
import { songSections, detectRecurringSection, buildSongArrangement } from "../../utils/buildPresenterSession";

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

  useEffect(() => {
    setOrder(sections.map((s) => s.id));
    setIncluded(new Set(sections.map((s) => s.id)));
    setRecurring(detectRecurringSection(sections));
  }, [sections]);

  const byId = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

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
              <div
                key={id}
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
                <input
                  type="radio"
                  name="recurring"
                  checked={recurring === id}
                  disabled={!inc}
                  onChange={() => setRecurring(id)}
                  title="Repeat this after each stanza"
                />
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
            onClick={() => onConfirm({ includedIds: includedInOrder, recurringId: recurring })}
          >
            Add song
          </button>
        </div>
      </div>
    </div>
  );
}
