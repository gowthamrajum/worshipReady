import React, { useState, useRef, useMemo } from "react";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  FiZap, FiCheck, FiEdit3, FiArrowLeft, FiMove, FiTrash,
  FiChevronDown, FiChevronRight, FiArrowUp, FiPlus,
} from "react-icons/fi";
import { createSong, RECAPTCHA_SITE_KEY, API_BASE } from "../../api/client";

const isEnglishOnly = (text) => /^[\x00-\x7F\s]+$/.test(text);
const isTeluguLine = (line) => /[\u0C00-\u0C7F]/.test(line);
const cleanRepeatMarker = (line) => line.replace(/\s*\(x\d+\)\s*/g, "").trim();
const isNumberedLine = (line) => /^\d+\.\s/.test(line);
const stripNumber = (line) => line.replace(/^\d+\.\s*/, "");

// ─── Lyrics parsers (unchanged) ──────────────────────────────────────────────

function parseLyrics(rawText) {
  const lines = rawText.split("\n");
  const classified = lines.map((raw) => {
    const trimmed = raw.trim();
    return { raw: trimmed, telugu: isTeluguLine(trimmed), empty: trimmed === "" };
  });
  const nonEmpty = classified.filter((c) => !c.empty);
  const firstTeluguIdx = nonEmpty.findIndex((c) => c.telugu);
  const isTwoSection =
    firstTeluguIdx > 3 ||
    (firstTeluguIdx === 0 && nonEmpty.findIndex((c, i) => i > 2 && !c.telugu) === -1);
  if (isTwoSection && firstTeluguIdx > 0) return parseTwoSection(classified);
  return parseInterleaved(rawText);
}

function parseTwoSection(classified) {
  const englishLines = [];
  const teluguRaw = [];
  let hitTelugu = false;
  for (const c of classified) {
    if (!hitTelugu) {
      if (c.telugu) { hitTelugu = true; teluguRaw.push(c); }
      else if (!c.empty) englishLines.push(c.raw);
    } else {
      teluguRaw.push(c);
    }
  }
  const teluguBlocks = [];
  let cur = [];
  for (const c of teluguRaw) {
    if (c.empty) { if (cur.length > 0) { teluguBlocks.push(cur); cur = []; } }
    else cur.push(cleanRepeatMarker(c.raw));
  }
  if (cur.length > 0) teluguBlocks.push(cur);
  if (teluguBlocks.length === 0) return parseInterleaved(englishLines.join("\n"));

  const blockSigs = teluguBlocks.map((b) => b.join("||"));
  const seen = new Set();
  const uniqueBlocks = [];
  for (let i = 0; i < teluguBlocks.length; i++) {
    if (seen.has(blockSigs[i])) continue;
    seen.add(blockSigs[i]);
    uniqueBlocks.push(teluguBlocks[i]);
  }

  const mainTeluguLines = [];
  const stanzas = [];
  for (const block of uniqueBlocks) {
    if (isNumberedLine(block[0])) {
      stanzas.push({ stanza_number: stanzas.length + 1, telugu: block.map(stripNumber), english: [] });
    } else {
      mainTeluguLines.push(...block);
    }
  }

  const uniqueEnglish = [];
  const seenEng = new Set();
  for (const line of englishLines) {
    const key = line.toLowerCase().trim();
    if (!seenEng.has(key)) { seenEng.add(key); uniqueEnglish.push(line); }
  }
  let engIdx = 0;
  const mainEngCount = Math.min(mainTeluguLines.length, uniqueEnglish.length);
  const mainEnglish = uniqueEnglish.slice(engIdx, engIdx + mainEngCount);
  engIdx += mainEngCount;
  for (const s of stanzas) {
    const count = Math.min(s.telugu.length, uniqueEnglish.length - engIdx);
    s.english = uniqueEnglish.slice(engIdx, engIdx + count);
    engIdx += count;
  }
  if (engIdx < uniqueEnglish.length) {
    const leftover = uniqueEnglish.slice(engIdx);
    if (stanzas.length > 0) stanzas[stanzas.length - 1].english.push(...leftover);
    else mainEnglish.push(...leftover);
  }
  return { main_stanza: { telugu: mainTeluguLines, english: mainEnglish }, stanzas };
}

function parseInterleaved(rawText) {
  const lines = (typeof rawText === "string" ? rawText : "").split("\n");
  const blocks = [];
  let cur = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") { if (cur.length > 0) { blocks.push(cur); cur = []; } }
    else cur.push(trimmed);
  }
  if (cur.length > 0) blocks.push(cur);
  if (blocks.length === 0) return { main_stanza: { telugu: [], english: [] }, stanzas: [] };
  const classifyBlock = (block) => {
    const telugu = [], english = [];
    for (const line of block) {
      const cleaned = cleanRepeatMarker(line);
      if (!cleaned) continue;
      if (isTeluguLine(cleaned)) telugu.push(cleaned); else english.push(cleaned);
    }
    return { telugu, english };
  };
  const main_stanza = classifyBlock(blocks[0]);
  const stanzas = blocks.slice(1).map((block, i) => ({ stanza_number: i + 1, ...classifyBlock(block) }));
  return { main_stanza, stanzas };
}

function suggestSongName(parsed) {
  return parsed.main_stanza.english[0]?.trim() || parsed.main_stanza.telugu[0]?.trim() || "";
}

const AI_PARSE_URL = `${API_BASE}/songs/parse-lyrics`;

// ─── Paired-line model ───────────────────────────────────────────────────────
//
// After parsing, we convert { telugu: [...], english: [...] } into an array of
// paired rows: [{ id, telugu, english }, ...]. Each row is a single draggable
// unit — dragging it moves both Telugu and English together. We convert back
// to the flat { telugu: [], english: [] } format on save.

let _pairId = 0;
const nextPairId = () => `pair-${++_pairId}-${Math.random().toString(36).slice(2, 6)}`;

/** Convert { telugu: [], english: [] } → [{ id, telugu, english }] */
function toPairs(block) {
  const len = Math.max(block.telugu.length, block.english.length);
  const pairs = [];
  for (let i = 0; i < len; i++) {
    pairs.push({
      id: nextPairId(),
      telugu: block.telugu[i] || "",
      english: block.english[i] || "",
    });
  }
  return pairs;
}

/** Convert [{ telugu, english }] → { telugu: [], english: [] } */
function fromPairs(pairs) {
  const telugu = [];
  const english = [];
  for (const p of pairs) {
    if (p.telugu) telugu.push(p.telugu);
    if (p.english) english.push(p.english);
  }
  return { telugu, english };
}

/** Convert entire parsed song into paired model */
function parsedToPairedModel(parsed) {
  return {
    main: toPairs(parsed.main_stanza),
    stanzas: parsed.stanzas.map((s) => toPairs(s)),
  };
}

/** Convert paired model back to API format */
function pairedModelToParsed(model) {
  return {
    main_stanza: fromPairs(model.main),
    stanzas: model.stanzas.map((pairs) => fromPairs(pairs)),
  };
}

function reorder(list, from, to) {
  const result = [...list];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

const QuickAddSong = ({ onSongAdded }) => {
  const [rawLyrics, setRawLyrics] = useState("");
  const [songName, setSongName] = useState("");
  const [step, setStep] = useState("input"); // "input" | "review" | "done"
  const [modalState, setModalState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseMode, setParseMode] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  // The paired model: { main: PairRow[], stanzas: PairRow[][] }
  const [model, setModel] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [editingCell, setEditingCell] = useState(null); // "pairId-lang"

  const toggleCollapse = (key) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Parse ──────────────────────────────────────────────────────────────────

  const handleParse = async () => {
    if (!rawLyrics.trim()) return;
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setModalState({ type: "error", message: "Please complete the CAPTCHA first." });
      return;
    }
    setParsing(true);

    let parsed = null;
    let mode = "local";

    // Try AI first
    try {
      const headers = captchaToken ? { "x-recaptcha-token": captchaToken } : {};
      const res = await axios.post(AI_PARSE_URL, { rawLyrics }, { headers });
      if (res.data?.main_stanza) {
        parsed = res.data;
        mode = "ai";
      }
    } catch { /* fall through */ }

    if (!parsed) {
      parsed = parseLyrics(rawLyrics);
    }

    setSongName(parsed.song_name || suggestSongName(parsed));
    setModel(parsedToPairedModel(parsed));
    setParseMode(mode);
    setStep("review");
    setParsing(false);
    setCollapsed({});
    setEditingCell(null);
    captchaRef.current?.reset();
    setCaptchaToken(null);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!songName.trim()) {
      setModalState({ type: "error", message: "Please enter a song name." });
      return;
    }
    if (!isEnglishOnly(songName.trim())) {
      setModalState({ type: "error", message: "Song name must be in English only." });
      return;
    }

    const currentUser = sessionStorage.getItem("userName") || "System";
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const parsed = pairedModelToParsed(model);

    const payload = {
      song_name: songName.trim(),
      main_stanza: {
        telugu: parsed.main_stanza.telugu.filter(Boolean),
        english: parsed.main_stanza.english.filter(Boolean),
      },
      stanzas: parsed.stanzas.map((s, i) => ({
        stanza_number: i + 1,
        telugu: s.telugu.filter(Boolean),
        english: s.english.filter(Boolean),
      })),
      created_by: currentUser,
      last_updated_by: currentUser,
      created_at: now,
      last_updated_at: now,
    };

    setSaving(true);
    try {
      await createSong(payload);
      setModalState({ type: "success", message: "Song added successfully!" });
      onSongAdded?.();
      setStep("done");
    } catch (err) {
      const msg = err.response?.status === 409
        ? "A similar song already exists."
        : "Failed to save. Please try again.";
      setModalState({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRawLyrics(""); setSongName(""); setModel(null);
    setStep("input"); setModalState(null); setCollapsed({}); setEditingCell(null);
  };

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  //
  // type "STANZA" → reorder stanzas
  // type "PAIR"   → reorder paired rows within / across sections
  //
  // Droppable IDs: "pairs-main", "pairs-0", "pairs-1", ...
  // Draggable IDs: the pair's unique id

  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // ── Stanza reorder ──
    if (type === "STANZA") {
      setModel((prev) => ({
        ...prev,
        stanzas: reorder(prev.stanzas, source.index, destination.index),
      }));
      return;
    }

    // ── Paired-row reorder / cross-section move ──
    if (type === "PAIR") {
      const getList = (droppableId, m) => {
        if (droppableId === "pairs-main") return m.main;
        return m.stanzas[parseInt(droppableId.replace("pairs-", ""), 10)];
      };
      const setList = (droppableId, m, newList) => {
        if (droppableId === "pairs-main") {
          m.main = newList;
        } else {
          const idx = parseInt(droppableId.replace("pairs-", ""), 10);
          m.stanzas[idx] = newList;
        }
      };

      setModel((prev) => {
        const next = { main: [...prev.main], stanzas: prev.stanzas.map((s) => [...s]) };

        if (source.droppableId === destination.droppableId) {
          // Same section reorder
          const list = getList(source.droppableId, next);
          setList(source.droppableId, next, reorder(list, source.index, destination.index));
        } else {
          // Cross-section move
          const srcList = [...getList(source.droppableId, next)];
          const dstList = [...getList(destination.droppableId, next)];
          const [moved] = srcList.splice(source.index, 1);
          dstList.splice(destination.index, 0, moved);
          setList(source.droppableId, next, srcList);
          setList(destination.droppableId, next, dstList);
        }
        return next;
      });
    }
  };

  // ── Mutation helpers ───────────────────────────────────────────────────────

  const deletePair = (sectionKey, pairIdx) => {
    setModel((prev) => {
      const next = { main: [...prev.main], stanzas: prev.stanzas.map((s) => [...s]) };
      if (sectionKey === "main") next.main.splice(pairIdx, 1);
      else next.stanzas[sectionKey].splice(pairIdx, 1);
      return next;
    });
  };

  const movePairToMain = (stanzaIdx, pairIdx) => {
    setModel((prev) => {
      const next = { main: [...prev.main], stanzas: prev.stanzas.map((s) => [...s]) };
      const [pair] = next.stanzas[stanzaIdx].splice(pairIdx, 1);
      next.main.push(pair);
      return next;
    });
  };

  const deleteStanza = (stanzaIdx) => {
    setModel((prev) => {
      const next = { ...prev, stanzas: prev.stanzas.filter((_, i) => i !== stanzaIdx) };
      return next;
    });
  };

  const mergeStanzaIntoMain = (stanzaIdx) => {
    setModel((prev) => {
      const merged = [...prev.main, ...prev.stanzas[stanzaIdx]];
      return { main: merged, stanzas: prev.stanzas.filter((_, i) => i !== stanzaIdx) };
    });
  };

  const addEmptyPair = (sectionKey) => {
    setModel((prev) => {
      const next = { main: [...prev.main], stanzas: prev.stanzas.map((s) => [...s]) };
      const newPair = { id: nextPairId(), telugu: "", english: "" };
      if (sectionKey === "main") next.main.push(newPair);
      else next.stanzas[sectionKey].push(newPair);
      return next;
    });
  };

  const addNewStanza = () => {
    setModel((prev) => ({
      ...prev,
      stanzas: [...prev.stanzas, [{ id: nextPairId(), telugu: "", english: "" }]],
    }));
  };

  const updatePairField = (sectionKey, pairIdx, lang, value) => {
    setModel((prev) => {
      const next = { main: [...prev.main], stanzas: prev.stanzas.map((s) => [...s]) };
      const list = sectionKey === "main" ? next.main : next.stanzas[sectionKey];
      list[pairIdx] = { ...list[pairIdx], [lang]: value };
      return next;
    });
  };

  // ── Pair count summary ─────────────────────────────────────────────────────

  const pairSummary = (pairs) => {
    const t = pairs.filter((p) => p.telugu).length;
    const e = pairs.filter((p) => p.english).length;
    return `${pairs.length} rows (${t}T, ${e}E)`;
  };

  // ── Inline-editable cell ───────────────────────────────────────────────────

  const EditableCell = ({ value, cellKey, lang, sectionKey, pairIdx, placeholder }) => {
    const isEditing = editingCell === cellKey;
    if (isEditing) {
      return (
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => updatePairField(sectionKey, pairIdx, lang, e.target.value)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => { if (e.key === "Enter") setEditingCell(null); }}
          className="w-full text-sm px-1.5 py-0.5 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        />
      );
    }
    return (
      <span
        onClick={() => setEditingCell(cellKey)}
        className={`block w-full text-sm px-1.5 py-0.5 rounded cursor-text hover:bg-white hover:ring-1 hover:ring-gray-200 transition-all break-words ${
          value ? "text-gray-800" : "text-gray-300 italic"
        }`}
        title={value || "Click to type"}
      >
        {value || placeholder || "--"}
      </span>
    );
  };

  // ── Render a paired-line row ───────────────────────────────────────────────

  const renderPairRow = (pair, idx, sectionKey, dragProvided, isDragging) => {
    const isMain = sectionKey === "main";
    return (
      <div
        ref={dragProvided.innerRef}
        {...dragProvided.draggableProps}
        className={`flex items-start gap-1.5 group rounded-md px-1 py-1 transition-all ${
          isDragging
            ? "bg-white shadow-xl ring-2 ring-indigo-300 z-10"
            : "hover:bg-white/60"
        }`}
      >
        {/* Drag handle */}
        <span
          {...dragProvided.dragHandleProps}
          className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
          title="Drag to reorder or move to another section"
        >
          <FiMove size={13} />
        </span>

        {/* Row number */}
        <span className="mt-0.5 text-[9px] text-gray-300 font-mono w-4 shrink-0 text-right">
          {idx + 1}
        </span>

        {/* Telugu + English side by side */}
        <div className="flex-1 grid grid-cols-2 gap-1.5 min-w-0">
          <EditableCell
            value={pair.telugu}
            cellKey={`${pair.id}-telugu`}
            lang="telugu"
            sectionKey={sectionKey}
            pairIdx={idx}
            placeholder="Telugu..."
          />
          <EditableCell
            value={pair.english}
            cellKey={`${pair.id}-english`}
            lang="english"
            sectionKey={sectionKey}
            pairIdx={idx}
            placeholder="English..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
          {!isMain && (
            <button
              onClick={() => movePairToMain(sectionKey, idx)}
              className="text-blue-400 hover:text-blue-600 p-0.5"
              title="Move pair to Main Stanza"
            >
              <FiArrowUp size={12} />
            </button>
          )}
          <button
            onClick={() => deletePair(sectionKey, idx)}
            className="text-red-400 hover:text-red-600 p-0.5"
            title="Delete this pair"
          >
            <FiTrash size={12} />
          </button>
        </div>
      </div>
    );
  };

  // ── Render a section (main or stanza) ──────────────────────────────────────

  const renderSection = (label, pairs, sectionKey, accent, extraHeader) => {
    const isOpen = !collapsed[sectionKey];
    const droppableId = sectionKey === "main" ? "pairs-main" : `pairs-${sectionKey}`;

    return (
      <div className={`border rounded-lg overflow-hidden border-${accent}-200`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between px-3 py-2 cursor-pointer select-none bg-${accent}-100`}
          onClick={() => toggleCollapse(sectionKey)}
        >
          <div className="flex items-center gap-2">
            {isOpen
              ? <FiChevronDown size={14} className={`text-${accent}-600`} />
              : <FiChevronRight size={14} className={`text-${accent}-600`} />}
            <h4 className={`text-xs font-bold uppercase tracking-widest text-${accent}-600`}>
              {label}
            </h4>
            <span className="text-[9px] text-gray-400">{pairSummary(pairs)}</span>
          </div>
          {extraHeader}
        </div>

        {/* Body */}
        {isOpen && (
          <div className={`bg-${accent}-50/50 px-2 pt-1 pb-2`}>
            {/* Column headers */}
            <div className="flex items-center gap-1.5 px-1 mb-1">
              <span className="w-4 shrink-0" /> {/* handle spacer */}
              <span className="w-4 shrink-0" /> {/* number spacer */}
              <div className="flex-1 grid grid-cols-2 gap-1.5">
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Telugu</p>
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">English</p>
              </div>
              <span className="w-12 shrink-0" /> {/* action spacer */}
            </div>

            {/* Droppable zone for paired rows */}
            <Droppable droppableId={droppableId} type="PAIR">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[32px] rounded transition-colors space-y-0.5 ${
                    snapshot.isDraggingOver ? "bg-indigo-50 ring-1 ring-indigo-200" : ""
                  }`}
                >
                  {pairs.map((pair, idx) => (
                    <Draggable key={pair.id} draggableId={pair.id} index={idx}>
                      {(drag, snap) => renderPairRow(pair, idx, sectionKey, drag, snap.isDragging)}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {pairs.length === 0 && !snapshot.isDraggingOver && (
                    <p className="text-xs text-gray-300 italic text-center py-2">
                      Drop lines here or add a new row
                    </p>
                  )}
                </div>
              )}
            </Droppable>

            {/* Add row button */}
            <button
              onClick={() => addEmptyPair(sectionKey)}
              className={`mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-${accent}-500 hover:text-${accent}-700 transition px-1`}
            >
              <FiPlus size={10} /> Add Row
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white p-6 rounded shadow-md space-y-4">
      <h2 className="text-xl font-semibold text-amber-700 flex items-center gap-2">
        <FiZap /> Quick Add Song
      </h2>

      {/* ── Step 1: Paste lyrics ── */}
      {step === "input" && (
        <>
          <p className="text-sm text-gray-500">
            Paste the full lyrics below — English transliteration first, then Telugu with stanza numbers.
            Or mix them freely. The parser will figure out the structure.
          </p>
          <textarea
            className="w-full border rounded-lg px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-300"
            rows={16}
            value={rawLyrics}
            onChange={(e) => setRawLyrics(e.target.value)}
            placeholder={`Paste English transliteration here...\n(no blank lines needed)\n\nThen paste Telugu lyrics with blank lines\nbetween stanzas and 1. 2. numbering...\n\nOr paste both mixed — Telugu and English\nalternating line by line.`}
          />
          {RECAPTCHA_SITE_KEY && (
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={captchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>
          )}
          <button
            onClick={handleParse}
            disabled={!rawLyrics.trim() || parsing || (RECAPTCHA_SITE_KEY && !captchaToken)}
            className="w-full bg-amber-600 text-white py-2.5 rounded-lg font-semibold hover:bg-amber-700 transition disabled:opacity-40"
          >
            {parsing ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Analyzing with AI...
              </span>
            ) : (
              <>
                <FiZap className="inline mr-1.5 -mt-0.5" />
                Parse & Preview
              </>
            )}
          </button>
        </>
      )}

      {/* ── Step 2: Review with paired drag-and-drop ── */}
      {step === "review" && model && (
        <>
          {/* Song name */}
          <div className="flex items-center gap-2">
            <FiEdit3 className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              placeholder="Song Name (English only)"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          {/* Instructions */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-gray-400 flex-1">
              Drag <FiMove size={10} className="inline" /> to reorder.
              Each row is a Telugu + English pair — they move together.
              Drop rows between sections. Click text to edit.
            </p>
            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
              parseMode === "ai" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
            }`}>
              {parseMode === "ai" ? "AI Parsed" : "Local Parse"}
            </span>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {/* Main Stanza */}
              {renderSection(
                "Main Stanza (Pallavi / Chorus)",
                model.main,
                "main",
                "amber"
              )}

              {/* Draggable Stanzas */}
              <Droppable droppableId="stanza-list" type="STANZA">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {model.stanzas.map((pairs, idx) => (
                      <Draggable key={`stanza-${idx}`} draggableId={`stanza-${idx}`} index={idx}>
                        {(drag, snap) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={snap.isDragging ? "shadow-xl ring-2 ring-blue-300 rounded-lg" : ""}
                          >
                            {renderSection(
                              `Stanza ${idx + 1}`,
                              pairs,
                              idx,
                              "blue",
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <span
                                  {...drag.dragHandleProps}
                                  className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1"
                                  title="Drag to reorder stanza"
                                >
                                  <FiMove size={14} />
                                </span>
                                <button
                                  onClick={() => mergeStanzaIntoMain(idx)}
                                  className="text-blue-400 hover:text-blue-600 p-1"
                                  title="Merge all rows into Main Stanza"
                                >
                                  <FiArrowUp size={13} />
                                </button>
                                <button
                                  onClick={() => deleteStanza(idx)}
                                  className="text-red-400 hover:text-red-600 p-1"
                                  title="Delete stanza"
                                >
                                  <FiTrash size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>

          {/* Add stanza button */}
          <button
            onClick={addNewStanza}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-700 transition"
          >
            <FiPlus size={12} /> Add New Stanza
          </button>

          {model.stanzas.length === 0 && (
            <p className="text-xs text-orange-500 bg-orange-50 border border-orange-200 rounded px-3 py-2">
              No stanzas detected. Add stanzas manually or go back and adjust the lyrics.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => { setStep("input"); setEditingCell(null); }}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              <FiArrowLeft size={14} />
              Back to Edit
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              <FiCheck size={14} />
              {saving ? "Saving..." : "Save Song"}
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: Done ── */}
      {step === "done" && (
        <div className="text-center py-8">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FiCheck size={28} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-700 mb-1">Song Saved!</h3>
          <p className="text-sm text-gray-500 mb-4">{songName}</p>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition"
          >
            Add Another
          </button>
        </div>
      )}

      {/* ── Error Modal ── */}
      {modalState && modalState.type === "error" && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center space-y-3 max-w-sm">
            <h2 className="text-lg font-semibold text-red-700">Oops</h2>
            <p className="text-sm text-gray-700">{modalState.message}</p>
            <button
              onClick={() => setModalState(null)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickAddSong;
