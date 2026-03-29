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

import ConfirmModal from "../modals/ConfirmModal";
import { buildSongSlideLines, ensureFontLoaded } from "../../utils/buildSongSlideLines";
import qrDonationsImg from "../../assets/qr-donations.png";
import { getMaxVerse, getOrdinal, getTeluguOrdinal, validatePsalmInput, buildPsalmLines } from "../../constants/psalms";

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
    lines: ["పరిశుద్ధ సంస్కారము", "Holy Communion"],
    icon: <HiOutlineAnnotation size={16} />,
    editable: true,
  },
  {
    label: "Announcements",
    lines: ["ప్రకటనలు", "Announcements"],
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

const CustomSlides = ({ onAddSlide }) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);

  const [customSlides, setCustomSlides] = useState(INITIAL_SLIDES);
  const [showModal, setShowModal] = useState(false);
  const [slideName, setSlideName] = useState("");
  const [slideContent, setSlideContent] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);

  // ── Announcements modal state ─────────────────────────────────────────────
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcerName, setAnnouncerName] = useState("");

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
  const handleAddOfferingsSlide = async () => {
    const uid = () => `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const stanzaId = `stanza-${uid()}`;

    // Convert QR URL to base64 data URL so html2canvas can embed it when exporting
    let qrSrc = qrDonationsImg;
    try {
      const resp = await fetch(qrDonationsImg);
      const blob = await resp.blob();
      qrSrc = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      // fall back to URL if conversion fails
    }

    // Layout: text left-center, QR + caption right (960x540 canvas)
    const slideLines = [
      { id: uid(), text: "Offerings",  x: 350, y: 210, fontSize: 65, lineSpacing: 90, stanzaId, textAlign: "center" },
      { id: uid(), text: "కానుకలు",   x: 350, y: 330, fontSize: 65, lineSpacing: 90, stanzaId, textAlign: "center" },
      { id: uid(), type: "image", src: qrSrc, alt: "Donations QR", x: 760, y: 300, width: 200, height: 200, stanzaId },
      { id: uid(), text: "Know ways to contribute !", x: 760, y: 160, fontSize: 18, lineSpacing: 30, stanzaId, textAlign: "center" },
    ];
    onAddSlide?.([slideLines]);
  };

  /** Build Communion slide with communion_easter theme as default background. */
  const handleAddCommunionSlide = async (lines) => {
    await ensureFontLoaded();
    const slideLines = buildSongSlideLines(lines);
    if (!slideLines.length) return;

    const themeSrc = "/themes/easter/communion_easter.jpg";
    let bgImage = themeSrc;
    try {
      const resp = await fetch(themeSrc);
      const blob = await resp.blob();
      bgImage = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      // fall back to URL path if fetch fails
    }

    onAddSlide?.([slideLines], {
      backgroundImage: bgImage,
      backgroundTheme: { category: "Easter", name: "Communion Easter" },
    });
  };

  /** Add the main Announcements slide + 3 continuation slides with Neon Blank Easter bg.
   *  Each slide has English on the left (x=240) and Telugu on the right (x=720). */
  const handleAddAnnouncementsSlides = async (name) => {
    const uid = () => `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const L = 240;  // left column centre
    const R = 720;  // right column centre

    // ── Slide 1: Announcements title ────────────────────────────────────────
    const s1 = `stanza-${uid()}`;
    const titleY = name.trim() ? 210 : 270;
    const slide1 = [
      { id: uid(), text: "Announcements", x: L, y: titleY, fontSize: 52, lineSpacing: 80, stanzaId: s1, textAlign: "center" },
      { id: uid(), text: "ప్రకటనలు",      x: R, y: titleY, fontSize: 52, lineSpacing: 80, stanzaId: s1, textAlign: "center" },
      ...(name.trim() ? [{ id: uid(), text: name.trim(), x: 480, y: 340, fontSize: 34, lineSpacing: 55, stanzaId: s1, textAlign: "center" }] : []),
    ];

    // ── Slide 2: Bible Study ─────────────────────────────────────────────────
    const s2 = `stanza-${uid()}`;
    const slide2 = [
      { id: uid(), text: "Bible Study",            x: L, y: 175, fontSize: 44, lineSpacing: 70, stanzaId: s2, textAlign: "center" },
      { id: uid(), text: "on Zoom",                x: L, y: 255, fontSize: 36, lineSpacing: 60, stanzaId: s2, textAlign: "center" },
      { id: uid(), text: "Every Wednesday",         x: L, y: 325, fontSize: 30, lineSpacing: 50, stanzaId: s2, textAlign: "center" },
      { id: uid(), text: "at 8 PM",                x: L, y: 380, fontSize: 30, lineSpacing: 50, stanzaId: s2, textAlign: "center" },
      { id: uid(), text: "జూమ్ లో బైబిల్ స్టడీ", x: R, y: 175, fontSize: 38, lineSpacing: 65, stanzaId: s2, textAlign: "center" },
      { id: uid(), text: "ప్రతి బుధవారం",          x: R, y: 275, fontSize: 32, lineSpacing: 55, stanzaId: s2, textAlign: "center" },
      { id: uid(), text: "రాత్రి 8 గంటలకు",        x: R, y: 345, fontSize: 32, lineSpacing: 55, stanzaId: s2, textAlign: "center" },
    ];

    // ── Slide 3: Saturday Prayer Meeting ────────────────────────────────────
    const s3 = `stanza-${uid()}`;
    const slide3 = [
      { id: uid(), text: "Saturday Prayer",         x: L, y: 175, fontSize: 42, lineSpacing: 65, stanzaId: s3, textAlign: "center" },
      { id: uid(), text: "Meeting on Zoom",          x: L, y: 245, fontSize: 36, lineSpacing: 60, stanzaId: s3, textAlign: "center" },
      { id: uid(), text: "Every Saturday",           x: L, y: 315, fontSize: 30, lineSpacing: 50, stanzaId: s3, textAlign: "center" },
      { id: uid(), text: "at 8 PM",                 x: L, y: 370, fontSize: 30, lineSpacing: 50, stanzaId: s3, textAlign: "center" },
      { id: uid(), text: "శనివారం ప్రార్థన సభ",    x: R, y: 175, fontSize: 38, lineSpacing: 65, stanzaId: s3, textAlign: "center" },
      { id: uid(), text: "జూమ్ లో",                x: R, y: 260, fontSize: 32, lineSpacing: 55, stanzaId: s3, textAlign: "center" },
      { id: uid(), text: "ప్రతి శనివారం",           x: R, y: 320, fontSize: 30, lineSpacing: 50, stanzaId: s3, textAlign: "center" },
      { id: uid(), text: "రాత్రి 8 గంటలకు",        x: R, y: 375, fontSize: 30, lineSpacing: 50, stanzaId: s3, textAlign: "center" },
    ];

    // ── Slide 4: Worship Service ─────────────────────────────────────────────
    const s4 = `stanza-${uid()}`;
    const slide4 = [
      { id: uid(), text: "Worship Service",          x: L, y: 155, fontSize: 42, lineSpacing: 65, stanzaId: s4, textAlign: "center" },
      { id: uid(), text: "Every Sunday at 11 AM",    x: L, y: 228, fontSize: 30, lineSpacing: 50, stanzaId: s4, textAlign: "center" },
      { id: uid(), text: "8001 Mustang Drive",        x: L, y: 290, fontSize: 26, lineSpacing: 44, stanzaId: s4, textAlign: "center" },
      { id: uid(), text: "Irving, Texas 75038",       x: L, y: 345, fontSize: 26, lineSpacing: 44, stanzaId: s4, textAlign: "center" },
      { id: uid(), text: "ఆరాధన సేవ",               x: R, y: 155, fontSize: 42, lineSpacing: 65, stanzaId: s4, textAlign: "center" },
      { id: uid(), text: "ప్రతి ఆదివారం ఉ. 11 గంటలకు", x: R, y: 228, fontSize: 27, lineSpacing: 46, stanzaId: s4, textAlign: "center" },
      { id: uid(), text: "8001 Mustang Drive",        x: R, y: 290, fontSize: 26, lineSpacing: 44, stanzaId: s4, textAlign: "center" },
      { id: uid(), text: "Irving, Texas 75038",       x: R, y: 345, fontSize: 26, lineSpacing: 44, stanzaId: s4, textAlign: "center" },
    ];

    const themeSrc = "/themes/easter/neon_blank_easter.jpg";
    let bgImage = themeSrc;
    try {
      const resp = await fetch(themeSrc);
      const blob = await resp.blob();
      bgImage = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      // fall back to URL path if fetch fails
    }

    onAddSlide?.([slide1, slide2, slide3, slide4], {
      backgroundImage: bgImage,
      backgroundTheme: { category: "Easter", name: "Neon Blank Easter" },
    });
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
    if (item.label === "Communion") {
      handleAddCommunionSlide(item.lines);
      return;
    }
    if (item.label === "Announcements") {
      setAnnouncerName("");
      setAnnouncementModalOpen(true);
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

  const isEditable = (index) =>
    index >= INITIAL_SLIDES.length || !!customSlides[index]?.editable;

  const handleEditClick = (index) => {
    if (!isEditable(index)) return;
    const item = customSlides[index];
    setSlideName(item.label);
    setSlideContent(item.lines.join("\n"));
    setEditIndex(index);
    setShowModal(true);
  };

  const handleDeleteClick = (index) => {
    if (!isEditable(index)) return;
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

                  {isEditable(idx) && (
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
                      {idx >= INITIAL_SLIDES.length && (
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
                      )}
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

      {/* Announcements Modal */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-md shadow-xl max-w-sm w-full p-6 animate-fade-in-up">
            <div className="flex gap-3 items-start">
              <HiOutlineDocumentText size={24} className="text-blue-600 mt-1" />
              <div className="flex-1">
                <h2 className="text-base font-semibold text-gray-800 mb-1">Announcements</h2>
                <p className="text-xs text-gray-400 mb-4">
                  Adds 4 slides — main title + Bible Study, Prayer Meeting, and Worship Service.
                </p>

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Who is Announcing?
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={announcerName}
                  onChange={(e) => setAnnouncerName(e.target.value)}
                  placeholder="e.g. Brother John (optional)"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setAnnouncementModalOpen(false);
                      handleAddAnnouncementsSlides(announcerName);
                    }
                  }}
                />
                <p className="text-xs text-gray-400 mb-4">Leave blank to skip the name on the title slide.</p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setAnnouncementModalOpen(false)}
                    className="px-4 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setAnnouncementModalOpen(false);
                      handleAddAnnouncementsSlides(announcerName);
                    }}
                    className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    Add Slides
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
