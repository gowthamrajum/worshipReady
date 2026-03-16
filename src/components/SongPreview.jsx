import React, { useState, useEffect } from "react";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FiChevronDown, FiMove, FiX, FiArrowRight, FiRotateCcw } from "react-icons/fi";
import { HiMusicNote, HiOutlineDocumentText } from "react-icons/hi";
import { buildSongSlideLines, ensureFontLoaded } from "../utils/buildSongSlideLines";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const SongPreview = ({ dragMode, onAddMultipleSlides, onUndoLastBatch }) => {
  const [expanded, setExpanded]   = useState(false);
  const [mode, setMode]           = useState("drag"); // "drag" | "arrange"
  const [query, setQuery]         = useState("");
  const [songs, setSongs]         = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyrics, setLyrics]       = useState([]);
  const [expandedStanzas, setExpandedStanzas] = useState({});

  // ── Arrange-mode state ──────────────────────────────────────────────────────
  const [selection, setSelection]         = useState([]);     // ordered stanza IDs
  const [recurringId, setRecurringId]     = useState(null);   // only one allowed
  const [recurringLines, setRecurringLines] = useState(new Set()); // indices of chosen lines
  const [recurringFirst, setRecurringFirst] = useState(false);    // prepend recurring as slide 1
  const [lastBatchIds, setLastBatchIds] = useState([]);           // for undo

  // ── Song list ───────────────────────────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`${API_BASE}/songs`)
      .then((res) => setSongs(res.data))
      .catch((err) => console.error("Error fetching songs:", err));
  }, []);

  const fetchLyrics = async (song) => {
    try {
      const res = await axios.get(`${API_BASE}/songs/${song.song_id}`);
      const { main_stanza, stanzas } = res.data;
      const allLyrics = [
        {
          id: "main",
          label: `Main: ${main_stanza.english?.[0] || "Main Stanza"}`,
          telugu:  main_stanza.telugu  ?? [],
          english: main_stanza.english ?? [],
        },
        ...stanzas.map((s, i) => ({
          id:      `stanza-${i + 1}`,
          label:   s.english?.[0] || `Stanza ${i + 1}`,
          telugu:  s.telugu  ?? [],
          english: s.english ?? [],
        })),
      ];
      setSelectedSong(song);
      setLyrics(allLyrics);
      setExpandedStanzas({});
      setSelection([]);
      setRecurringId(null);
      setRecurringLines(new Set());
      setRecurringFirst(false);
      setLastBatchIds([]);
    } catch (err) {
      console.error("Failed to load lyrics:", err);
    }
  };

  const clearSong = () => {
    setSelectedSong(null);
    setLyrics([]);
    setQuery("");
    setExpandedStanzas({});
    setSelection([]);
    setRecurringId(null);
    setRecurringLines(new Set());
    setRecurringFirst(false);
    setLastBatchIds([]);
  };

  const filteredSongs = songs.filter((s) =>
    s.song_name.toLowerCase().includes(query.toLowerCase())
  );

  // ── Arrange-mode helpers ────────────────────────────────────────────────────

  const isSelected = (id) => selection.includes(id);

  const toggleStanzaSelection = (id) => {
    if (isSelected(id)) {
      setSelection((prev) => prev.filter((s) => s !== id));
      if (recurringId === id) {
        setRecurringId(null);
        setRecurringLines(new Set());
      }
    } else {
      setSelection((prev) => [...prev, id]);
    }
  };

  /** Set/unset a stanza as recurring and initialise its line selection. */
  const toggleRecurring = (e, id) => {
    e.stopPropagation();
    if (recurringId === id) {
      setRecurringId(null);
      setRecurringLines(new Set());
    } else {
      setRecurringId(id);
      const stanza = lyrics.find((l) => l.id === id);
      if (stanza) {
        const total = stanza.telugu.length + stanza.english.length;
        setRecurringLines(new Set(Array.from({ length: total }, (_, i) => i)));
      }
    }
  };

  /** Toggle a single line index in/out of the recurring-slide selection. */
  const toggleRecurringLine = (e, idx) => {
    e.stopPropagation();
    setRecurringLines((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        if (next.size === 1) return prev; // keep at least one line
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const removeFromOrder = (e, id) => {
    e.stopPropagation();
    setSelection((prev) => prev.filter((s) => s !== id));
    if (recurringId === id) {
      setRecurringId(null);
      setRecurringLines(new Set());
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const updated = [...selection];
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);
    setSelection(updated);
  };

  /**
   * Final slide order:
   * If a recurring stanza is set it is interleaved after every non-recurring stanza.
   * When recurringFirst is true the recurring stanza is also prepended as slide 1.
   */
  const getFinalOrder = () => {
    if (!recurringId || !selection.includes(recurringId)) return selection;
    const nonRecurring = selection.filter((id) => id !== recurringId);
    if (!nonRecurring.length) return selection;
    const result = recurringFirst ? [recurringId] : [];
    nonRecurring.forEach((id) => {
      result.push(id);
      result.push(recurringId);
    });
    return result;
  };

  const stanzaById = Object.fromEntries(lyrics.map((l) => [l.id, l]));
  const finalOrder = getFinalOrder();

  const handleMoveToCanvas = async () => {
    const order = getFinalOrder();
    if (!order.length) return;

    // Ensure the Anek Telugu font is loaded before measuring so the offscreen
    // canvas uses real glyph metrics, not a fallback (which causes wrong font
    // size → lines overlap or appear off-centre on the canvas).
    await ensureFontLoaded();

    const slideLinesArray = order
      .map((id) => {
        const stanza = stanzaById[id];
        if (!stanza) return null;

        const allLines = [...stanza.telugu, ...stanza.english];

        // For the recurring stanza, only use the lines the user has selected
        if (id === recurringId && recurringLines.size > 0) {
          const chosenLines = allLines.filter((_, i) => recurringLines.has(i));
          return buildSongSlideLines(chosenLines);
        }

        return buildSongSlideLines(allLines);
      })
      .filter(Boolean);

    if (slideLinesArray.length > 0) {
      const ids = onAddMultipleSlides?.(slideLinesArray) ?? [];
      setLastBatchIds(ids);
    }
  };

  /** Move every stanza (in original song order) to the canvas at once. */
  const handleMoveAll = async () => {
    if (!lyrics.length) return;
    await ensureFontLoaded();
    const slideLinesArray = lyrics
      .map((stanza) => {
        const allLines = [...stanza.telugu, ...stanza.english];
        return buildSongSlideLines(allLines);
      })
      .filter((lines) => lines.length > 0);

    if (slideLinesArray.length > 0) {
      const ids = onAddMultipleSlides?.(slideLinesArray) ?? [];
      setLastBatchIds(ids);
    }
  };

  const handleUndo = () => {
    onUndoLastBatch?.(lastBatchIds);
    setLastBatchIds([]);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="border rounded bg-white shadow">
      {/* Header */}
      <div
        className="flex justify-between items-center bg-yellow-100 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-yellow-700 inline-flex items-center gap-2">
          <HiMusicNote size={20} />
          Song Preview
        </h3>
        <FiChevronDown
          className={`transition-transform duration-300 text-yellow-700 ${
            expanded ? "rotate-180" : ""
          }`}
          size={20}
        />
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? "opacity-100 py-4" : "max-h-0 opacity-0 py-0"
        } px-4 space-y-4`}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="Search for a song..."
          className="w-full border rounded px-4 py-2 focus:outline-none focus:ring"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedSong(null);
            setLyrics([]);
          }}
        />

        {/* Song list dropdown */}
        {query && !selectedSong && (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {filteredSongs.map((song) => (
              <li
                key={song.song_id}
                onClick={() => fetchLyrics(song)}
                className="cursor-pointer p-2 bg-indigo-50 rounded hover:bg-indigo-100 flex items-center gap-2"
              >
                <HiMusicNote className="text-indigo-700" size={18} />
                {song.song_name}
              </li>
            ))}
          </ul>
        )}

        {selectedSong && lyrics.length > 0 && (
          <div className="space-y-3">
            {/* Song title + clear */}
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800 text-sm inline-flex items-center gap-2">
                <HiOutlineDocumentText size={18} />
                {selectedSong.song_name}
              </h4>
              <button onClick={clearSong} className="text-red-500 text-sm underline">
                Clear
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex rounded border overflow-hidden text-sm">
              <button
                onClick={() => setMode("drag")}
                className={`flex-1 py-1.5 font-medium transition-colors ${
                  mode === "drag"
                    ? "bg-yellow-400 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Drag
              </button>
              <button
                onClick={() => setMode("arrange")}
                className={`flex-1 py-1.5 font-medium transition-colors ${
                  mode === "arrange"
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Arrange
              </button>
            </div>

            {/* ── DRAG MODE ───────────────────────────────────────────────── */}
            {mode === "drag" && (
              <div className="space-y-2">
                {/* Quick-action: send every stanza to the canvas in one click */}
                <button
                  onClick={handleMoveAll}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white text-sm rounded font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <FiArrowRight size={14} />
                  Move All Stanzas ({lyrics.length} slides)
                </button>
                {lastBatchIds.length > 0 && (
                  <button
                    onClick={handleUndo}
                    className="w-full flex items-center justify-center gap-2 py-1.5 bg-red-50 text-red-600 border border-red-300 text-sm rounded font-medium hover:bg-red-100 transition-colors"
                  >
                    <FiRotateCcw size={13} />
                    Undo Last Move ({lastBatchIds.length} slides removed)
                  </button>
                )}
                {lyrics.map((stanza) => {
                  const allLines = [...stanza.telugu, ...stanza.english];
                  return (
                    <div
                      key={stanza.id}
                      className="border rounded shadow-sm"
                      draggable={dragMode === "stanza"}
                      onDragStart={(e) => {
                        if (dragMode === "stanza") {
                          e.dataTransfer.setData(
                            "text/plain",
                            JSON.stringify({
                              type: "stanza",
                              label: stanza.label,
                              lines: allLines,
                              breakIndex: stanza.telugu.length,
                            })
                          );
                        }
                      }}
                    >
                      <div
                        className="flex justify-between items-center bg-gray-100 px-3 py-2 cursor-pointer"
                        onClick={() =>
                          setExpandedStanzas((prev) => ({
                            ...prev,
                            [stanza.id]: !prev[stanza.id],
                          }))
                        }
                      >
                        <span className="font-semibold text-gray-700 text-sm">
                          {stanza.label}
                        </span>
                        <FiChevronDown
                          className={`transition-transform duration-300 text-gray-600 ${
                            expandedStanzas[stanza.id] ? "rotate-180" : ""
                          }`}
                          size={18}
                        />
                      </div>

                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden px-3 ${
                          expandedStanzas[stanza.id]
                            ? "max-h-[1000px] opacity-100 py-2"
                            : "max-h-0 opacity-0 py-0"
                        }`}
                      >
                        {dragMode === "line" ? (
                          <>
                            {stanza.telugu.map((line, j) => (
                              <div
                                key={`telugu-${j}`}
                                draggable
                                onDragStart={(e) =>
                                  e.dataTransfer.setData(
                                    "text/plain",
                                    JSON.stringify({ type: "line", text: line })
                                  )
                                }
                                className="p-2 border rounded bg-white hover:bg-blue-100 cursor-move mt-1"
                              >
                                {line}
                              </div>
                            ))}
                            <div className="my-2" />
                            {stanza.english.map((line, j) => (
                              <div
                                key={`english-${j}`}
                                draggable
                                onDragStart={(e) =>
                                  e.dataTransfer.setData(
                                    "text/plain",
                                    JSON.stringify({ type: "line", text: line })
                                  )
                                }
                                className="p-2 border rounded bg-white hover:bg-blue-100 cursor-move mt-1"
                              >
                                {line}
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="p-2 bg-green-100 rounded text-sm space-y-1">
                            {stanza.telugu.map((line, j) => (
                              <div key={`tel-${j}`}>{line}</div>
                            ))}
                            <div className="my-2" />
                            {stanza.english.map((line, j) => (
                              <div key={`eng-${j}`}>{line}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── ARRANGE MODE ────────────────────────────────────────────── */}
            {mode === "arrange" && (
              <div className="space-y-4">

                {/* ── Step 1: Select stanzas ─────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      1. Select Stanzas
                    </p>
                    <button
                      onClick={() => {
                        const allIds = lyrics.map((l) => l.id);
                        const allSelected = allIds.every((id) => selection.includes(id));
                        if (allSelected) {
                          setSelection([]);
                          setRecurringId(null);
                          setRecurringLines(new Set());
                        } else {
                          setSelection(allIds);
                        }
                      }}
                      className="text-xs text-indigo-600 underline hover:text-indigo-800"
                    >
                      {lyrics.every((l) => selection.includes(l.id)) ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {lyrics.map((stanza) => {
                      const allLines = [...stanza.telugu, ...stanza.english];
                      const isRecurring = recurringId === stanza.id;
                      return (
                        <div key={stanza.id}>
                          {/* Stanza row */}
                          <div
                            onClick={() => toggleStanzaSelection(stanza.id)}
                            className={`flex items-center justify-between px-3 py-2 rounded border cursor-pointer select-none transition-colors ${
                              isSelected(stanza.id)
                                ? isRecurring
                                  ? "bg-orange-50 border-orange-300"
                                  : "bg-indigo-50 border-indigo-300"
                                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected(stanza.id)}
                                onChange={() => {}}
                                className="accent-indigo-600 pointer-events-none"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                {stanza.label}
                              </span>
                              {isRecurring && (
                                <span className="text-xs text-orange-500 font-semibold">↻</span>
                              )}
                            </div>

                            {isSelected(stanza.id) && (
                              <button
                                onClick={(e) => toggleRecurring(e, stanza.id)}
                                title={
                                  isRecurring
                                    ? "Remove recurring"
                                    : "Set as recurring — repeats after every other stanza"
                                }
                                className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${
                                  isRecurring
                                    ? "bg-orange-500 text-white"
                                    : "bg-gray-200 text-gray-600 hover:bg-orange-100 hover:text-orange-600"
                                }`}
                              >
                                {isRecurring ? "↻ Recurring" : "Set Recurring"}
                              </button>
                            )}
                          </div>

                          {/* ── Recurring line picker ─────────────────────── */}
                          {isRecurring && (
                            <div className="ml-3 mt-1 mb-1 border border-orange-200 rounded bg-orange-50 px-3 py-2 space-y-1">
                              <p className="text-xs font-semibold text-orange-600 mb-1">
                                Choose lines for recurring slide:
                              </p>

                              {/* Telugu lines */}
                              {stanza.telugu.length > 0 && (
                                <>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide">Telugu</p>
                                  {stanza.telugu.map((line, j) => (
                                    <div
                                      key={`rec-tel-${j}`}
                                      onClick={(e) => toggleRecurringLine(e, j)}
                                      className="flex items-start gap-2 cursor-pointer select-none py-0.5"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={recurringLines.has(j)}
                                        readOnly
                                        className="accent-orange-500 mt-0.5 pointer-events-none shrink-0"
                                      />
                                      <span className="text-xs text-gray-700 leading-snug">{line}</span>
                                    </div>
                                  ))}
                                </>
                              )}

                              {/* English lines */}
                              {stanza.english.length > 0 && (
                                <>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide mt-1">English</p>
                                  {stanza.english.map((line, j) => {
                                    const idx = stanza.telugu.length + j;
                                    return (
                                      <div
                                        key={`rec-eng-${j}`}
                                        onClick={(e) => toggleRecurringLine(e, idx)}
                                        className="flex items-start gap-2 cursor-pointer select-none py-0.5"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={recurringLines.has(idx)}
                                          readOnly
                                          className="accent-orange-500 mt-0.5 pointer-events-none shrink-0"
                                        />
                                        <span className="text-xs text-gray-700 leading-snug">{line}</span>
                                      </div>
                                    );
                                  })}
                                </>
                              )}

                              <p className="text-xs text-orange-400 mt-1">
                                {recurringLines.size} / {allLines.length} lines selected
                              </p>

                              {/* First-slide toggle */}
                              <div
                                onClick={(e) => { e.stopPropagation(); setRecurringFirst((v) => !v); }}
                                className="flex items-center gap-2 cursor-pointer select-none mt-2 pt-2 border-t border-orange-200"
                              >
                                <input
                                  type="checkbox"
                                  checked={recurringFirst}
                                  readOnly
                                  className="accent-orange-500 pointer-events-none"
                                />
                                <span className="text-xs text-orange-700 font-medium">
                                  Also use as first slide
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {recurringId && (
                    <p className="text-xs text-orange-500 mt-1.5">
                      ↻ Recurring slide appears {recurringFirst ? "first, then " : ""}after every other stanza.
                    </p>
                  )}
                </div>

                {/* ── Step 2: Set order ──────────────────────────────────── */}
                {selection.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      2. Set Order — drag to reorder
                    </p>
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="stanza-order">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-1"
                          >
                            {selection.map((id, idx) => {
                              const stanza = stanzaById[id];
                              if (!stanza) return null;
                              const isRecurring = recurringId === id;
                              return (
                                <Draggable key={id} draggableId={id} index={idx}>
                                  {(draggable) => (
                                    <div
                                      ref={draggable.innerRef}
                                      {...draggable.draggableProps}
                                      className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
                                        isRecurring
                                          ? "bg-orange-50 border-orange-300"
                                          : "bg-white border-gray-200"
                                      }`}
                                    >
                                      <span
                                        {...draggable.dragHandleProps}
                                        className="text-gray-400 cursor-grab active:cursor-grabbing"
                                      >
                                        <FiMove size={14} />
                                      </span>
                                      <span className="flex-1 text-gray-700 truncate">
                                        {stanza.label}
                                      </span>
                                      {isRecurring && (
                                        <span className="text-xs text-orange-500 font-bold shrink-0">
                                          ↻
                                        </span>
                                      )}
                                      <button
                                        onClick={(e) => removeFromOrder(e, id)}
                                        className="text-red-400 hover:text-red-600 shrink-0"
                                        title="Remove"
                                      >
                                        <FiX size={14} />
                                      </button>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                )}

                {/* ── Step 3: Final slide order preview ─────────────────── */}
                {selection.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      3. Final Slides — {finalOrder.length} total
                    </p>
                    <div className="bg-gray-50 border rounded p-2 space-y-0.5 max-h-36 overflow-y-auto">
                      {finalOrder.map((id, idx) => {
                        const stanza = stanzaById[id];
                        const isRecurring = recurringId === id;
                        return (
                          <div
                            key={`${id}-${idx}`}
                            className="flex items-center gap-2 text-xs py-0.5"
                          >
                            <span className="text-gray-400 w-5 text-right shrink-0">
                              {idx + 1}.
                            </span>
                            <span
                              className={
                                isRecurring
                                  ? "text-orange-600 font-medium"
                                  : "text-gray-700"
                              }
                            >
                              {stanza?.label}
                              {isRecurring && " ↻"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Action buttons ─────────────────────────────────────── */}
                {selection.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={handleMoveToCanvas}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      <FiArrowRight size={16} />
                      Move My Selection ({finalOrder.length} slides)
                    </button>

                    {lastBatchIds.length > 0 && (
                      <button
                        onClick={handleUndo}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 border border-red-300 rounded font-medium hover:bg-red-100 transition-colors"
                      >
                        <FiRotateCcw size={14} />
                        Undo Last Move ({lastBatchIds.length} slides removed)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SongPreview;
