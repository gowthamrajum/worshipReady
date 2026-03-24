import React, { useState, useRef } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiArrowRight,
} from "react-icons/fi";
import { AiOutlinePlus } from "react-icons/ai";
import {
  HiOutlineDocumentText,
  HiOutlineSpeakerphone,
  HiOutlineClipboardList,
  HiOutlineBookOpen,
  HiOutlineAnnotation,
} from "react-icons/hi";

import ConfirmModal from "./ConfirmModal";
import { buildSongSlideLines, ensureFontLoaded } from "../utils/buildSongSlideLines";
import qrDonationsImg from "../assets/qr-donations.png";

const PSALM_READING_LABEL = "Psalm Reading";

const INITIAL_SLIDES = [
  {
    label: "Praise & Worship",
    lines: ["స్తుతి ఆరాధన", "Praise & Worship"],
    icon: <HiOutlineSpeakerphone size={16} />,
  },
  {
    label: "Sermon",
    lines: ["వాక్యోపదేశం", "Sermon"],
    icon: <HiOutlineBookOpen size={16} />,
  },
  {
    label: PSALM_READING_LABEL,
    lines: [
      "ఉత్తర-ప్రత్యుత్తర వాక్య పఠనం",
      "Responsive Reading",
      "కీర్తనలు | PSALMS",
    ],
    icon: <HiOutlineClipboardList size={16} />,
  },
  {
    label: "Sunday School",
    lines: ["ఆదివార బడి", "Sunday School"],
    icon: <HiOutlineBookOpen size={16} />,
  },
  {
    label: "Communion",
    lines: ["Communion"],
    icon: <HiOutlineAnnotation size={16} />,
  },
  {
    label: "Announcements",
    lines: ["Announcements"],
    icon: <HiOutlineDocumentText size={16} />,
  },
  {
    label: "Benediction",
    lines: ["Benediction", "ఆశీర్వాదం"],
    icon: <HiOutlineDocumentText size={16} />,
  },
  {
    label: "Offerings",
    lines: ["Offerings","కానుకలు"],
    icon: <HiOutlineDocumentText size={16} />,
  },
  {
    label: "Thank You Note",
    lines: ["అందరికీ వందనాలు", "Greetings to all"],
    icon: <HiOutlineDocumentText size={16} />,
  },
];

// ── English word-form ordinal builder ────────────────────────────────────────
const ENG_ONES_ORD = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth"];
const ENG_TEENS_ORD = ["Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth"];
const ENG_TENS_ORD = ["", "", "Twentieth", "Thirtieth", "Fortieth", "Fiftieth", "Sixtieth", "Seventieth", "Eightieth", "Ninetieth"];
const ENG_TENS_PFX = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function getOrdinal(n) {
  if (n >= 1 && n <= 9) return ENG_ONES_ORD[n];
  if (n >= 10 && n <= 19) return ENG_TEENS_ORD[n - 10];
  if (n >= 20 && n <= 99) {
    const t = Math.floor(n / 10), o = n % 10;
    return o === 0 ? ENG_TENS_ORD[t] : `${ENG_TENS_PFX[t]} ${ENG_ONES_ORD[o]}`;
  }
  if (n === 100) return "Hundredth";
  if (n >= 101 && n <= 150) {
    const r = n - 100;
    if (r <= 9) return `Hundred and ${ENG_ONES_ORD[r]}`;
    if (r <= 19) return `Hundred and ${ENG_TEENS_ORD[r - 10]}`;
    const t = Math.floor(r / 10), o = r % 10;
    return o === 0 ? `Hundred and ${ENG_TENS_ORD[t]}` : `Hundred and ${ENG_TENS_PFX[t]} ${ENG_ONES_ORD[o]}`;
  }
  return `${n}th`;
}

// ── Telugu ordinal builder ──────────────────────────────────────────────────
const TEL_ONES = ["", "మొదటి", "రెండవ", "మూడవ", "నాలుగవ", "ఐదవ", "ఆరవ", "ఏడవ", "ఎనిమిదవ", "తొమ్మిదవ"];
const TEL_TEENS = ["పదవ", "పదకొండవ", "పన్నెండవ", "పదమూడవ", "పధ్నాలుగవ", "పదిహేనవ", "పదహారవ", "పదిహేడవ", "పధ్ధెనిమిదవ", "పందొమ్మిదవ"];
const TEL_TENS_ORD = ["", "", "ఇరవయ్యవ", "ముప్పయ్యవ", "నలభయ్యవ", "ఏభయ్యవ", "అరవయ్యవ", "డెబ్బయ్యవ", "ఎనభయ్యవ", "తొంభయ్యవ"];
const TEL_TENS_PFX = ["", "", "ఇరవై", "ముప్పై", "నలభై", "ఏభై", "అరవై", "డెబ్భై", "ఎనభై", "తొంభై"];
const TEL_COMPOUND_ONES = ["", "ఒకటవ", "రెండవ", "మూడవ", "నాలుగవ", "ఐదవ", "ఆరవ", "ఏడవ", "ఎనిమిదవ", "తొమ్మిదవ"];

function getTeluguOrdinal(n) {
  if (n >= 1 && n <= 9) return TEL_ONES[n];
  if (n >= 10 && n <= 19) return TEL_TEENS[n - 10];
  if (n >= 20 && n <= 99) {
    const t = Math.floor(n / 10), o = n % 10;
    return o === 0 ? TEL_TENS_ORD[t] : `${TEL_TENS_PFX[t]} ${TEL_COMPOUND_ONES[o]}`;
  }
  if (n === 100) return "నూరవ";
  if (n >= 101 && n <= 150) {
    const r = n - 100;
    if (r <= 9) return `నూట ${TEL_COMPOUND_ONES[r]}`;
    if (r <= 19) return `నూట ${TEL_TEENS[r - 10]}`;
    const t = Math.floor(r / 10), o = r % 10;
    return o === 0 ? `నూట ${TEL_TENS_ORD[t]}` : `నూట ${TEL_TENS_PFX[t]} ${TEL_COMPOUND_ONES[o]}`;
  }
  return `${n}వ`;
}

// ── Psalm verse counts (1–150) ──────────────────────────────────────────────
// prettier-ignore
const PSALM_VERSE_COUNT = [
  0, // index 0 unused
  6,12,8,8,12,10,17,9,20,18,    // 1-10
  7,8,6,7,5,11,15,50,14,9,      // 11-20
  13,31,6,10,22,12,14,9,11,12,  // 21-30
  24,11,22,22,28,12,40,22,13,17,// 31-40
  13,11,5,26,17,11,9,14,20,23,  // 41-50
  19,9,6,7,23,13,11,11,17,12,   // 51-60
  8,12,11,10,13,20,7,35,36,5,   // 61-70
  24,20,28,23,10,12,20,72,13,19,// 71-80
  16,8,18,12,13,17,7,18,52,17,  // 81-90
  16,15,5,23,11,13,12,9,9,5,    // 91-100
  8,28,22,35,45,48,43,13,31,7,  // 101-110
  10,10,9,8,18,19,2,29,176,7,   // 111-120
  8,9,4,8,5,6,5,6,8,8,          // 121-130
  3,18,3,3,21,26,9,8,24,13,     // 131-140
  10,7,12,15,21,10,20,14,9,6,   // 141-150
];

function getMaxVerse(chapter) {
  return PSALM_VERSE_COUNT[chapter] || 0;
}

/** Validate verse range against the psalm's actual verse count. Returns error string or null. */
function validatePsalmInput(chapter, verseStart, verseEnd) {
  const ch = parseInt(chapter, 10);
  if (!ch || ch < 1 || ch > 150) return "Psalm chapter must be 1\u2013150";
  const max = getMaxVerse(ch);
  const vs = verseStart ? parseInt(verseStart, 10) : null;
  const ve = verseEnd ? parseInt(verseEnd, 10) : null;
  if (vs && !ve) return "Please enter the ending verse";
  if (!vs && ve) return "Please enter the starting verse";
  if (vs && ve) {
    if (vs < 1) return "Starting verse must be at least 1";
    if (ve < vs) return "Ending verse must be \u2265 starting verse";
    if (vs > max) return `Psalm ${ch} only has ${max} verses`;
    if (ve > max) return `Psalm ${ch} only has ${max} verses (max ${max})`;
  }
  return null;
}

/** Build the formatted Psalm slide lines from chapter + optional verse range. */
function buildPsalmLines(chapter, verseStart, verseEnd) {
  const teluguPsalm = `${getTeluguOrdinal(chapter)} కీర్తన`;
  const englishPsalm = `${getOrdinal(chapter)} Psalm`;

  const hasRange = verseStart && verseEnd;

  const teluguLine = hasRange
    ? `${teluguPsalm} : ${verseStart}-${verseEnd} వచనాలు`
    : teluguPsalm;

  const englishLine = hasRange
    ? `${englishPsalm} : ${verseStart}-${verseEnd}th Verse`
    : englishPsalm;

  return [
    "ఉత్తర-ప్రత్యుత్తర వాక్య పఠనం",
    "Responsive Reading",
    teluguLine,
    englishLine,
  ];
}

const CustomSlides = ({ onAddSlide }) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);

  const [customSlides, setCustomSlides] = useState(INITIAL_SLIDES);
  const [showModal, setShowModal] = useState(false);
  const [slideName, setSlideName] = useState("");
  const [slideContent, setSlideContent] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);

  // ── Psalm modal state ─────────────────────────────────────────────────────
  const [psalmModalOpen, setPsalmModalOpen] = useState(false);
  const [psalmChapter, setPsalmChapter] = useState("");
  const [psalmVerseStart, setPsalmVerseStart] = useState("");
  const [psalmVerseEnd, setPsalmVerseEnd] = useState("");
  const [psalmError, setPsalmError] = useState(null);

  // ── Add slide via button click ────────────────────────────────────────────
  const handleAddSlide = async (lines) => {
    await ensureFontLoaded();
    const slideLines = buildSongSlideLines(lines);
    if (slideLines.length > 0) {
      onAddSlide?.([slideLines]);
    }
  };

  /** Build Offerings slide with QR code matching the Donations Template layout. */
  const handleAddOfferingsSlide = () => {
    const uid = () => `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const stanzaId = `stanza-${uid()}`;

    // Layout: text left-center, QR + caption right (960x540 canvas)
    const slideLines = [
      { id: uid(), text: "Offerings",  x: 350, y: 210, fontSize: 65, lineSpacing: 90, stanzaId, textAlign: "center" },
      { id: uid(), text: "కానుకలు",   x: 350, y: 330, fontSize: 65, lineSpacing: 90, stanzaId, textAlign: "center" },
      { id: uid(), type: "image", src: qrDonationsImg, alt: "Donations QR", x: 760, y: 300, width: 200, height: 200, stanzaId },
      { id: uid(), text: "Know ways to contribute !", x: 760, y: 160, fontSize: 18, lineSpacing: 30, stanzaId, textAlign: "center" },
    ];
    onAddSlide?.([slideLines]);
  };

  const handleSlideClick = (item) => {
    if (item.label === PSALM_READING_LABEL) {
      setPsalmModalOpen(true);
      return;
    }
    if (item.label === "Offerings") {
      handleAddOfferingsSlide();
      return;
    }
    handleAddSlide(item.lines);
  };

  const handlePsalmConfirm = () => {
    const err = validatePsalmInput(psalmChapter, psalmVerseStart, psalmVerseEnd);
    if (err) {
      setPsalmError(err);
      return;
    }

    const ch = parseInt(psalmChapter, 10);
    const vs = psalmVerseStart ? parseInt(psalmVerseStart, 10) : null;
    const ve = psalmVerseEnd ? parseInt(psalmVerseEnd, 10) : null;

    const lines = buildPsalmLines(ch, vs, ve);
    handleAddSlide(lines);
    setPsalmModalOpen(false);
    setPsalmChapter("");
    setPsalmVerseStart("");
    setPsalmVerseEnd("");
    setPsalmError(null);
  };

  const handlePsalmCancel = () => {
    setPsalmModalOpen(false);
    setPsalmChapter("");
    setPsalmVerseStart("");
    setPsalmVerseEnd("");
    setPsalmError(null);
  };

  const handleEditClick = (index) => {
    const item = customSlides[index];
    const isEditable = index >= INITIAL_SLIDES.length;
    if (!isEditable) return;
    setSlideName(item.label);
    setSlideContent(item.lines.join("\n"));
    setEditIndex(index);
    setShowModal(true);
  };

  const handleDeleteClick = (index) => {
    const isEditable = index >= INITIAL_SLIDES.length;
    if (!isEditable) return;
    setConfirmDeleteIndex(index);
  };

  const confirmDelete = () => {
    const updated = [...customSlides];
    updated.splice(confirmDeleteIndex, 1);
    setCustomSlides(updated);
    setConfirmDeleteIndex(null);
  };

  const cancelDelete = () => {
    setConfirmDeleteIndex(null);
  };

  const handleSave = () => {
    if (!slideName.trim() || !slideContent.trim()) {
      alert("Please enter both slide name and content");
      return;
    }

    const lines = slideContent
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const updated = [...customSlides];
    if (editIndex !== null) {
      updated[editIndex] = { label: slideName.trim(), lines };
    } else {
      updated.push({ label: slideName.trim(), lines });
    }

    setCustomSlides(updated);
    resetModal();
  };

  const resetModal = () => {
    setSlideName("");
    setSlideContent("");
    setShowModal(false);
    setEditIndex(null);
  };

  return (
    <div ref={containerRef} className="relative border rounded bg-white shadow">
      {/* Expandable Panel */}
      {expanded && (
        <div className="absolute top-full mt-1 z-10 bg-white border rounded shadow-md px-4 py-3 max-h-64 overflow-y-auto w-full">
          <div className="grid grid-cols-2 gap-2">
            {customSlides.map((item, idx) => (
              <div
                key={idx}
                className="relative group bg-white border border-gray-300 rounded text-sm shadow-sm hover:shadow-md hover:border-blue-400
                  flex items-center justify-between h-14 px-3 font-medium transition-all duration-200 ease-in-out hover:scale-[1.03]"
              >
                <span className="flex items-center gap-1 truncate">
                  {item.icon ?? <HiOutlineDocumentText size={16} />}
                  {item.label}
                </span>

                <div className="flex items-center gap-1">
                  {/* Arrow button to add slide */}
                  <button
                    onClick={() => handleSlideClick(item)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                    title={`Add "${item.label}" to canvas`}
                  >
                    <FiArrowRight size={16} />
                  </button>

                  {idx >= INITIAL_SLIDES.length && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(idx);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(idx);
                        }}
                        className="text-red-500 hover:text-red-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={() => {
                resetModal();
                setShowModal(true);
              }}
              className="flex items-center justify-center gap-1 h-14 px-3 text-center text-sm bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm transition-all duration-200 hover:scale-[1.03]"
            >
              <AiOutlinePlus />
              Custom Text
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="flex justify-between items-center bg-blue-100 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <h3 className="font-semibold text-blue-700 inline-flex items-center gap-2">
          <HiOutlineDocumentText size={20} />
          Custom Slides
        </h3>
        <div className="transition-transform duration-300">
          {expanded ? (
            <FiChevronUp className="text-blue-700" size={20} />
          ) : (
            <FiChevronDown className="text-blue-700" size={20} />
          )}
        </div>
      </div>

      {/* Slide Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editIndex !== null ? "Edit Custom Slide" : "Create Custom Slide"}
            </h2>

            <label className="block text-sm font-medium mb-1">Slide Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={slideName}
              onChange={(e) => setSlideName(e.target.value)}
              placeholder="Enter slide label"
            />

            <label className="block text-sm font-medium mb-1">
              Slide Content (1 line per row)
            </label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              rows={4}
              value={slideContent}
              onChange={(e) => setSlideContent(e.target.value)}
              placeholder="Type each line of the slide here..."
            ></textarea>

            <div className="flex justify-end gap-2">
              <button
                onClick={resetModal}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Psalm Chapter Modal */}
      {psalmModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-md shadow-xl max-w-sm w-full p-6 animate-fade-in-up">
            <div className="flex gap-3 items-start">
              <HiOutlineClipboardList size={24} className="text-indigo-600 mt-1" />
              <div className="flex-1">
                <h2 className="text-base font-semibold text-gray-800 mb-3">
                  Psalm Details
                </h2>

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Psalm Chapter <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="150"
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={psalmChapter}
                  onChange={(e) => { setPsalmChapter(e.target.value); setPsalmError(null); }}
                  placeholder="e.g. 23"
                  autoFocus
                />
                {(() => {
                  const ch = parseInt(psalmChapter, 10);
                  const max = ch >= 1 && ch <= 150 ? getMaxVerse(ch) : 0;
                  return max > 0 ? (
                    <p className="text-xs text-gray-400 mb-2">
                      Psalm {ch} has <span className="font-semibold text-gray-600">{max}</span> verses
                    </p>
                  ) : <div className="mb-2" />;
                })()}

                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                  Verse Range (optional)
                </p>
                <div className="flex gap-2 mb-1">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-0.5">From</label>
                    <input
                      type="number"
                      min="1"
                      max={(() => { const ch = parseInt(psalmChapter, 10); return ch >= 1 && ch <= 150 ? getMaxVerse(ch) : 999; })()}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      value={psalmVerseStart}
                      onChange={(e) => { setPsalmVerseStart(e.target.value); setPsalmError(null); }}
                      placeholder="1"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-0.5">To</label>
                    <input
                      type="number"
                      min="1"
                      max={(() => { const ch = parseInt(psalmChapter, 10); return ch >= 1 && ch <= 150 ? getMaxVerse(ch) : 999; })()}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      value={psalmVerseEnd}
                      onChange={(e) => { setPsalmVerseEnd(e.target.value); setPsalmError(null); }}
                      placeholder="18"
                    />
                  </div>
                </div>

                {/* Validation error */}
                {psalmError && (
                  <p className="text-xs text-red-500 font-medium mb-2">{psalmError}</p>
                )}
                {!psalmError && <div className="mb-3" />}

                {/* Live preview */}
                {psalmChapter && parseInt(psalmChapter, 10) >= 1 && parseInt(psalmChapter, 10) <= 150 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded p-2 mb-4 text-xs space-y-0.5">
                    <p className="text-indigo-400 font-semibold uppercase tracking-wide mb-1">Preview</p>
                    {buildPsalmLines(
                      parseInt(psalmChapter, 10),
                      psalmVerseStart ? parseInt(psalmVerseStart, 10) : null,
                      psalmVerseEnd ? parseInt(psalmVerseEnd, 10) : null
                    ).map((line, i) => (
                      <p key={i} className="text-gray-700">{line}</p>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handlePsalmCancel}
                    className="px-4 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePsalmConfirm}
                    disabled={!psalmChapter || parseInt(psalmChapter, 10) < 1}
                    className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add to Slides
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={confirmDeleteIndex !== null}
        title="Delete Custom Slide?"
        message="This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default CustomSlides;
