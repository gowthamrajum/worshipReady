import React, { useState, useRef } from "react";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";
import { FiZap, FiCheck, FiEdit3, FiArrowLeft } from "react-icons/fi";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const isEnglishOnly = (text) => /^[\x00-\x7F\s]+$/.test(text);
const isTeluguLine = (line) => /[\u0C00-\u0C7F]/.test(line);
const cleanRepeatMarker = (line) => line.replace(/\s*\(x\d+\)\s*/g, "").trim();
const isNumberedLine = (line) => /^\d+\.\s/.test(line);
const stripNumber = (line) => line.replace(/^\d+\.\s*/, "");

/**
 * Intelligent lyrics parser that handles the common "lazy paste" format:
 *   - English transliteration block (no structure, no blank lines)
 *   - Followed by Telugu block (with blank lines, stanza numbers, (x2) markers)
 *
 * Also handles:
 *   - Interleaved Telugu/English (line-by-line alternating)
 *   - Only Telugu or only English (split by blank lines)
 */
function parseLyrics(rawText) {
  const lines = rawText.split("\n");

  // Classify every line
  const classified = lines.map((raw) => {
    const trimmed = raw.trim();
    return { raw: trimmed, telugu: isTeluguLine(trimmed), empty: trimmed === "" };
  });

  // Detect format: "two-section" (English block then Telugu block) vs interleaved
  const nonEmpty = classified.filter((c) => !c.empty);
  const firstTeluguIdx = nonEmpty.findIndex((c) => c.telugu);
  const firstEnglishIdx = nonEmpty.findIndex((c) => !c.telugu);

  // If first 3+ non-empty lines are same language, treat as two-section format
  const isTwoSection =
    firstTeluguIdx > 3 || // English block first, then Telugu
    (firstTeluguIdx === 0 && nonEmpty.findIndex((c, i) => i > 2 && !c.telugu) === -1); // all Telugu

  if (isTwoSection && firstTeluguIdx > 0) {
    return parseTwoSection(classified);
  }

  // Fallback: interleaved or blank-line-separated (original approach)
  return parseInterleaved(rawText);
}

/**
 * Two-section parser: English block first, then Telugu block.
 * Uses Telugu structure (blank lines, numbers, dedup) as source of truth.
 */
function parseTwoSection(classified) {
  // Split into English lines and Telugu lines (preserving blank lines in Telugu section)
  const englishLines = [];
  const teluguRaw = []; // includes blank markers for block splitting
  let hitTelugu = false;

  for (const c of classified) {
    if (!hitTelugu) {
      if (c.telugu) {
        hitTelugu = true;
        teluguRaw.push(c);
      } else if (!c.empty) {
        englishLines.push(c.raw);
      }
    } else {
      teluguRaw.push(c);
    }
  }

  // Parse Telugu into blocks by blank lines
  const teluguBlocks = [];
  let cur = [];
  for (const c of teluguRaw) {
    if (c.empty) {
      if (cur.length > 0) { teluguBlocks.push(cur); cur = []; }
    } else {
      cur.push(cleanRepeatMarker(c.raw));
    }
  }
  if (cur.length > 0) teluguBlocks.push(cur);

  if (teluguBlocks.length === 0) {
    // No Telugu — treat all English as one block
    return parseInterleaved(englishLines.join("\n"));
  }

  // Deduplicate Telugu blocks: find repeated blocks (chorus)
  const blockSigs = teluguBlocks.map((b) => b.join("||"));
  const sigCount = {};
  for (const sig of blockSigs) sigCount[sig] = (sigCount[sig] || 0) + 1;

  // Build unique blocks in order, skipping exact repeats
  const seen = new Set();
  const uniqueBlocks = [];
  for (let i = 0; i < teluguBlocks.length; i++) {
    const sig = blockSigs[i];
    if (seen.has(sig)) continue;
    seen.add(sig);
    uniqueBlocks.push(teluguBlocks[i]);
  }

  // Identify: first block = main stanza opening
  // Numbered blocks (1., 2.) = stanzas
  // Other non-repeated blocks = part of main stanza (bridge, chorus)
  const mainTeluguLines = [];
  const stanzas = [];

  for (const block of uniqueBlocks) {
    if (isNumberedLine(block[0])) {
      stanzas.push({
        stanza_number: stanzas.length + 1,
        telugu: block.map(stripNumber),
        english: [],
      });
    } else {
      mainTeluguLines.push(...block);
    }
  }

  // Pair English lines with Telugu blocks proportionally.
  // English section includes ALL repeats expanded, so we need to deduplicate
  // English lines that correspond to repeated Telugu chorus sections.
  //
  // Strategy: remove duplicate English lines that appear more than once
  // (likely chorus repeats), then pair remaining with unique Telugu blocks.
  const uniqueEnglish = [];
  const seenEnglish = new Set();
  for (const line of englishLines) {
    const key = line.toLowerCase().trim();
    if (!seenEnglish.has(key)) {
      seenEnglish.add(key);
      uniqueEnglish.push(line);
    }
  }

  // Distribute unique English lines across main stanza + stanzas
  let engIdx = 0;

  // Main stanza gets its share
  const mainEngCount = Math.min(mainTeluguLines.length, uniqueEnglish.length);
  const mainEnglish = uniqueEnglish.slice(engIdx, engIdx + mainEngCount);
  engIdx += mainEngCount;

  // Each stanza gets its share
  for (const s of stanzas) {
    const count = Math.min(s.telugu.length, uniqueEnglish.length - engIdx);
    s.english = uniqueEnglish.slice(engIdx, engIdx + count);
    engIdx += count;
  }

  // Any leftover English lines go to the last stanza (or main if no stanzas)
  if (engIdx < uniqueEnglish.length) {
    const leftover = uniqueEnglish.slice(engIdx);
    if (stanzas.length > 0) {
      stanzas[stanzas.length - 1].english.push(...leftover);
    } else {
      mainEnglish.push(...leftover);
    }
  }

  return {
    main_stanza: { telugu: mainTeluguLines, english: mainEnglish },
    stanzas,
  };
}

/**
 * Interleaved / blank-line-separated parser.
 * Splits by blank lines, classifies each line within a block.
 */
function parseInterleaved(rawText) {
  const lines = (typeof rawText === "string" ? rawText : "").split("\n");
  const blocks = [];
  let cur = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      if (cur.length > 0) { blocks.push(cur); cur = []; }
    } else {
      cur.push(trimmed);
    }
  }
  if (cur.length > 0) blocks.push(cur);

  if (blocks.length === 0) {
    return { main_stanza: { telugu: [], english: [] }, stanzas: [] };
  }

  const classifyBlock = (block) => {
    const telugu = [], english = [];
    for (const line of block) {
      const cleaned = cleanRepeatMarker(line);
      if (!cleaned) continue;
      if (isTeluguLine(cleaned)) telugu.push(cleaned);
      else english.push(cleaned);
    }
    return { telugu, english };
  };

  const main_stanza = classifyBlock(blocks[0]);
  const stanzas = blocks.slice(1).map((block, i) => ({
    stanza_number: i + 1,
    ...classifyBlock(block),
  }));

  return { main_stanza, stanzas };
}

/** Suggest song name from first English line of main stanza */
function suggestSongName(parsed) {
  const eng = parsed.main_stanza.english[0];
  if (eng && eng.trim()) return eng.trim();
  const tel = parsed.main_stanza.telugu[0];
  if (tel && tel.trim()) return tel.trim();
  return "";
}

const AI_PARSE_URL = `${import.meta.env.VITE_API_BASE_URL}/songs/parse-lyrics`;

const QuickAddSong = ({ onSongAdded }) => {
  const [rawLyrics, setRawLyrics] = useState("");
  const [songName, setSongName] = useState("");
  const [parsed, setParsed] = useState(null);
  const [step, setStep] = useState("input"); // "input" | "review" | "done"
  const [modalState, setModalState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseMode, setParseMode] = useState(null); // "ai" | "local"
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  const handleParse = async () => {
    if (!rawLyrics.trim()) return;
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setModalState({ type: "error", message: "Please complete the CAPTCHA first." });
      return;
    }
    setParsing(true);

    // Try AI parsing first
    try {
      const headers = captchaToken ? { "x-recaptcha-token": captchaToken } : {};
      const res = await axios.post(AI_PARSE_URL, { rawLyrics }, { headers });
      if (res.data?.main_stanza) {
        setParsed(res.data);
        setSongName(res.data.song_name || suggestSongName(res.data));
        setParseMode("ai");
        setStep("review");
        setParsing(false);
        captchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }
    } catch {
      // AI not available — fall back silently
    }

    // Local fallback
    const result = parseLyrics(rawLyrics);
    setParsed(result);
    setSongName(suggestSongName(result));
    setParseMode("local");
    setStep("review");
    setParsing(false);
    captchaRef.current?.reset();
    setCaptchaToken(null);
  };

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
      await axios.post(`${API_BASE}/songs`, payload);
      setModalState({ type: "success", message: "Song added successfully!" });
      onSongAdded?.();
      setStep("done");
    } catch (err) {
      const msg =
        err.response?.status === 409
          ? "A similar song already exists."
          : "Failed to save. Please try again.";
      setModalState({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRawLyrics("");
    setSongName("");
    setParsed(null);
    setStep("input");
    setModalState(null);
  };

  const renderBlock = (label, block, accent) => (
    <div className={`border rounded-lg p-3 bg-${accent}-50 border-${accent}-200`}>
      <h4 className={`text-xs font-bold uppercase tracking-widest text-${accent}-600 mb-2`}>
        {label}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase mb-1">Telugu</p>
          {block.telugu.length > 0 ? (
            block.telugu.map((l, i) => (
              <p key={i} className="text-sm text-gray-800 leading-relaxed">{l}</p>
            ))
          ) : (
            <p className="text-xs text-gray-300 italic">—</p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase mb-1">English</p>
          {block.english.length > 0 ? (
            block.english.map((l, i) => (
              <p key={i} className="text-sm text-gray-800 leading-relaxed">{l}</p>
            ))
          ) : (
            <p className="text-xs text-gray-300 italic">—</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded shadow-md space-y-4">
      <h2 className="text-xl font-semibold text-amber-700 flex items-center gap-2">
        <FiZap /> Quick Add Song
      </h2>

      {/* Step 1: Paste lyrics */}
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

      {/* Step 2: Review parsed result */}
      {step === "review" && parsed && (
        <>
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

          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400 flex-1">
              Review below. Main Stanza = chorus/pallavi. Numbered blocks = stanzas.
            </p>
            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
              parseMode === "ai"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {parseMode === "ai" ? "AI Parsed" : "Local Parse"}
            </span>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {renderBlock("Main Stanza (Pallavi / Chorus)", parsed.main_stanza, "amber")}
            {parsed.stanzas.map((s, i) =>
              renderBlock(`Stanza ${i + 1}`, s, "blue")
            )}
          </div>

          {parsed.stanzas.length === 0 && (
            <p className="text-xs text-orange-500 bg-orange-50 border border-orange-200 rounded px-3 py-2">
              No numbered stanzas detected. Use "1." "2." etc. in the Telugu section to mark stanzas, or separate blocks with blank lines.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("input")}
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

      {/* Step 3: Done */}
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

      {/* Error Modal */}
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
