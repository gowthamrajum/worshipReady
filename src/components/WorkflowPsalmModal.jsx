import React, { useState } from "react";
import { FiCheck, FiSkipForward } from "react-icons/fi";
import { HiOutlineClipboardList } from "react-icons/hi";

// ── Psalm verse counts (1–150) ──
// prettier-ignore
const PSALM_VERSE_COUNT = [
  0,
  6,12,8,8,12,10,17,9,20,18,
  7,8,6,7,5,11,15,50,14,9,
  13,31,6,10,22,12,14,9,11,12,
  24,11,22,22,28,12,40,22,13,17,
  13,11,5,26,17,11,9,14,20,23,
  19,9,6,7,23,13,11,11,17,12,
  8,12,11,10,13,20,7,35,36,5,
  24,20,28,23,10,12,20,72,13,19,
  16,8,18,12,13,17,7,18,52,17,
  16,15,5,23,11,13,12,9,9,5,
  8,28,22,35,45,48,43,13,31,7,
  10,10,9,8,18,19,2,29,176,7,
  8,9,4,8,5,6,5,6,8,8,
  3,18,3,3,21,26,9,8,24,13,
  10,7,12,15,21,10,20,14,9,6,
];

function getMaxVerse(ch) { return PSALM_VERSE_COUNT[ch] || 0; }

/**
 * Modal shown during the "Responsive Reading" workflow step.
 * Asks for psalm chapter + optional verse range, or lets the user skip.
 */
export default function WorkflowPsalmModal({ stepIndex, totalSteps, onConfirm, onSkip }) {
  const [chapter, setChapter] = useState("");
  const [verseStart, setVerseStart] = useState("");
  const [verseEnd, setVerseEnd] = useState("");
  const [error, setError] = useState(null);

  const ch = parseInt(chapter, 10);
  const maxV = ch >= 1 && ch <= 150 ? getMaxVerse(ch) : 0;

  const handleConfirm = () => {
    // Validate
    if (!ch || ch < 1 || ch > 150) { setError("Enter a psalm chapter (1–150)"); return; }
    const vs = verseStart ? parseInt(verseStart, 10) : null;
    const ve = verseEnd ? parseInt(verseEnd, 10) : null;
    if (vs && !ve) { setError("Enter the ending verse"); return; }
    if (!vs && ve) { setError("Enter the starting verse"); return; }
    if (vs && ve) {
      if (vs < 1) { setError("Starting verse must be at least 1"); return; }
      if (ve < vs) { setError("Ending verse must be ≥ starting verse"); return; }
      if (vs > maxV || ve > maxV) { setError(`Psalm ${ch} only has ${maxV} verses`); return; }
    }
    onConfirm(ch, vs, ve);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998]">
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-sm overflow-hidden">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HiOutlineClipboardList size={18} className="text-indigo-600" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Responsive Reading
              </span>
            </div>
            <span className="text-[9px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
              Step {stepIndex + 1} of {totalSteps}
            </span>
          </div>

          <h3 className="text-base font-bold text-gray-800 mb-3">
            Select Psalm Chapter
          </h3>

          {/* Chapter */}
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Psalm Chapter <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="150"
            value={chapter}
            onChange={(e) => { setChapter(e.target.value); setError(null); }}
            className="w-full border rounded-lg px-3 py-2 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="e.g. 23"
            autoFocus
          />
          {maxV > 0 && (
            <p className="text-[10px] text-gray-400 mb-2">
              Psalm {ch} has <span className="font-semibold text-gray-600">{maxV}</span> verses
            </p>
          )}

          {/* Verse range */}
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5 mt-2">
            Verse Range (optional)
          </p>
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-400 mb-0.5">From</label>
              <input
                type="number" min="1" max={maxV || 999}
                value={verseStart}
                onChange={(e) => { setVerseStart(e.target.value); setError(null); }}
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="1"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-400 mb-0.5">To</label>
              <input
                type="number" min="1" max={maxV || 999}
                value={verseEnd}
                onChange={(e) => { setVerseEnd(e.target.value); setError(null); }}
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="18"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium mb-2">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition border-r border-gray-100"
          >
            <FiCheck size={14} />
            Add to Slides
          </button>
          <button
            onClick={onSkip}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
          >
            <FiSkipForward size={14} />
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
