import React, { useState, useEffect } from "react";
import BgThemeModal from "./BgThemeModal";
import {
  HiOutlineTrash,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
} from "react-icons/hi";
import {
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
  MdFormatColorFill,
  MdFormatSize,
  MdTextFields,
} from "react-icons/md";
import { FaPlus, FaMinus } from "react-icons/fa";
import { FiImage, FiX } from "react-icons/fi";

const CanvasToolbar = ({
  canvasLines,
  setCanvasLines,
  selectedIds,
  setSelectedIds,
  editMode,
  backgroundColor,
  backgroundImage,
  backgroundTheme,
  onBackgroundChange,
  onResetCurrentBg,
  onResetAllBg,
}) => {
  const MIN_FONT_SIZE = 25;
  const MAX_FONT_SIZE = 70;
  const MIN_LINE_SPACING = 20;
  const MAX_LINE_SPACING = 150;

  // Which panel is open: "backdrop" | "type" | "scale" | null
  const [activePanel, setActivePanel] = useState(null);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [onModalConfirm, setOnModalConfirm] = useState(() => () => {});

  const isEditing = editMode === "line" || editMode === "stanza";
  const selectedLine = canvasLines?.find((line) =>
    selectedIds.includes(line.id)
  );
  const currentFontSize = selectedLine?.fontSize || MIN_FONT_SIZE;
  const currentStanzaId = selectedLine?.stanzaId;

  const stanzaLines = currentStanzaId
    ? canvasLines?.filter((l) => l.stanzaId === currentStanzaId)
    : [];

  const currentLineSpacing =
    stanzaLines.length > 0
      ? Math.round(
          stanzaLines.reduce((a, b) => a + (b.lineSpacing || 0), 0) /
            stanzaLines.length
        )
      : 40;

  const [manualFontSize, setManualFontSize] = useState(currentFontSize);
  const [manualSpacing, setManualSpacing] = useState(currentLineSpacing);

  useEffect(() => setManualFontSize(currentFontSize), [currentFontSize]);
  useEffect(() => setManualSpacing(currentLineSpacing), [currentLineSpacing]);

  const hasSelection = Array.isArray(canvasLines) && isEditing && selectedIds.length > 0;

  const togglePanel = (name) => setActivePanel((prev) => (prev === name ? null : name));

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onBackgroundChange?.({ backgroundImage: reader.result });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const showModalFn = (message, onConfirm) => {
    setModalMessage(message);
    setOnModalConfirm(() => onConfirm);
    setModalVisible(true);
  };

  const updateFontSizeForSelected = (delta) => {
    const updated = canvasLines.map((line) => {
      if (!selectedIds.includes(line.id)) return line;
      const newSize = line.fontSize + delta;
      if (newSize < MIN_FONT_SIZE || newSize > MAX_FONT_SIZE) {
        const clampedSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, newSize));
        showModalFn(
          `Font size must be between ${MIN_FONT_SIZE}px and ${MAX_FONT_SIZE}px. It has been set to ${clampedSize}px.`,
          () => {
            setCanvasLines((prev) =>
              prev.map((l) =>
                selectedIds.includes(l.id) ? { ...l, fontSize: clampedSize } : l
              )
            );
          }
        );
        return line;
      }
      return { ...line, fontSize: newSize };
    });
    setCanvasLines(updated);
  };

  const commitManualFontSize = () => {
    if (manualFontSize < MIN_FONT_SIZE || manualFontSize > MAX_FONT_SIZE) {
      const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, manualFontSize));
      showModalFn(
        `Font size must be between ${MIN_FONT_SIZE}px and ${MAX_FONT_SIZE}px. It has been set to ${clamped}px.`,
        () => {
          setManualFontSize(clamped);
          setCanvasLines(
            canvasLines.map((line) =>
              selectedIds.includes(line.id) ? { ...line, fontSize: clamped } : line
            )
          );
        }
      );
      return;
    }
    setCanvasLines(
      canvasLines.map((line) =>
        selectedIds.includes(line.id) ? { ...line, fontSize: manualFontSize } : line
      )
    );
  };

  const alignText = (alignment) => {
    setCanvasLines(
      canvasLines.map((line) =>
        selectedIds.includes(line.id) ? { ...line, textAlign: alignment } : line
      )
    );
  };

  const updateStanzaSpacing = (delta) => {
    const sorted = stanzaLines.sort((a, b) => a.y - b.y);
    const baseLine = sorted[0];
    const newSpacing = currentLineSpacing + delta;
    if (newSpacing < MIN_LINE_SPACING || newSpacing > MAX_LINE_SPACING) {
      const clamped = Math.max(MIN_LINE_SPACING, Math.min(MAX_LINE_SPACING, newSpacing));
      showModalFn(
        `Line spacing must be between ${MIN_LINE_SPACING}px and ${MAX_LINE_SPACING}px. It has been set to ${clamped}px.`,
        () => {
          const updated = canvasLines.map((line) => {
            if (line.stanzaId === currentStanzaId) {
              const index = sorted.findIndex((l) => l.id === line.id);
              return { ...line, y: baseLine.y + index * clamped, lineSpacing: clamped };
            }
            return line;
          });
          setManualSpacing(clamped);
          setCanvasLines(updated);
        }
      );
      return;
    }
    const updated = canvasLines.map((line) => {
      if (line.stanzaId === currentStanzaId) {
        const index = sorted.findIndex((l) => l.id === line.id);
        return { ...line, y: baseLine.y + index * newSpacing, lineSpacing: newSpacing };
      }
      return line;
    });
    setCanvasLines(updated);
  };

  const commitManualSpacing = () => {
    const delta = manualSpacing - currentLineSpacing;
    if (manualSpacing < MIN_LINE_SPACING || manualSpacing > MAX_LINE_SPACING) {
      const clamped = Math.max(MIN_LINE_SPACING, Math.min(MAX_LINE_SPACING, manualSpacing));
      showModalFn(
        `Line spacing must be between ${MIN_LINE_SPACING}px and ${MAX_LINE_SPACING}px. It has been set to ${clamped}px.`,
        () => {
          setManualSpacing(clamped);
          updateStanzaSpacing(clamped - currentLineSpacing);
        }
      );
      return;
    }
    updateStanzaSpacing(delta);
  };

  const deleteSelected = () => {
    setCanvasLines(canvasLines.filter((line) => !selectedIds.includes(line.id)));
    setSelectedIds([]);
  };

  /* ── Tab button on the right edge ── */
  const TabButton = ({ id, Icon, label, show = true }) => {
    if (!show) return null;
    const isActive = activePanel === id;
    return (
      <button
        onClick={() => togglePanel(id)}
        className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-l-lg transition-all ${
          isActive
            ? "bg-white text-blue-600 shadow-md -translate-x-[1px]"
            : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
        }`}
        title={label}
      >
        <Icon size={16} />
        <span className="text-[7px] font-bold uppercase tracking-wider leading-none">{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* ── Right-edge tab buttons ── */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1">
        <TabButton id="backdrop" Icon={MdFormatColorFill} label="Backdrop" />
        <TabButton id="type" Icon={MdTextFields} label="Type" show={hasSelection} />
        <TabButton id="scale" Icon={MdFormatSize} label="Scale" show={hasSelection} />
      </div>

      {/* ── Panels ── */}
      {activePanel && (
        <div className="fixed right-[52px] top-1/2 -translate-y-1/2 z-50">
          <div className="bg-white rounded-l-xl shadow-2xl border border-r-0 p-3 min-w-[120px] max-h-[70vh] overflow-y-auto">

            {/* ━━━ BACKDROP STUDIO ━━━ */}
            {activePanel === "backdrop" && (
              <div className="flex flex-col items-center space-y-2">
                <h3 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Backdrop Studio</h3>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor || "#4b5c47"}
                    onChange={(e) => onBackgroundChange?.({ backgroundColor: e.target.value })}
                    className="w-7 h-7 cursor-pointer border rounded"
                    title="Background Color"
                  />
                  <label className="cursor-pointer text-gray-500 hover:text-blue-600 transition" title="Upload Image">
                    <FiImage size={15} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  {backgroundImage && (
                    <button
                      onClick={() => onBackgroundChange?.({ backgroundImage: null })}
                      className="text-red-400 hover:text-red-600"
                      title="Remove Image"
                    >
                      <FiX size={13} />
                    </button>
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={onResetCurrentBg}
                    className="text-[8px] text-gray-500 hover:text-blue-600 underline transition"
                  >
                    Reset Slide
                  </button>
                  <span className="text-gray-300 text-[8px]">|</span>
                  <button
                    onClick={onResetAllBg}
                    className="text-[8px] text-gray-500 hover:text-blue-600 underline transition"
                  >
                    Reset All
                  </button>
                </div>

                <hr className="w-full border-gray-200" />

                <button
                  onClick={() => setShowThemeModal(true)}
                  className="w-full text-[9px] text-center bg-gray-800 text-white rounded py-1.5 px-2 hover:bg-gray-700 transition"
                >
                  {backgroundTheme ? "Change Theme" : "Select Theme"}
                </button>
                {backgroundTheme && (
                  <button
                    onClick={() => onBackgroundChange?.({ backgroundTheme: null })}
                    className="text-[8px] text-red-400 hover:text-red-600 underline"
                  >
                    Clear Theme
                  </button>
                )}
              </div>
            )}

            {/* ━━━ TYPE CRAFT ━━━ */}
            {activePanel === "type" && hasSelection && (
              <div className="flex flex-col items-center space-y-2.5">
                <h3 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Type Craft</h3>

                {/* Color row */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 uppercase">Fill</span>
                    <input
                      type="color"
                      value={selectedLine?.color || "#ffffff"}
                      onChange={(e) => {
                        setCanvasLines(
                          canvasLines.map((line) =>
                            selectedIds.includes(line.id) ? { ...line, color: e.target.value } : line
                          )
                        );
                      }}
                      className="w-7 h-7 cursor-pointer border rounded"
                      title="Text Color"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-gray-400 uppercase">Stroke</span>
                    <input
                      type="color"
                      value={selectedLine?.outlineColor || "#000000"}
                      onChange={(e) => {
                        setCanvasLines(
                          canvasLines.map((line) =>
                            selectedIds.includes(line.id) ? { ...line, outlineColor: e.target.value } : line
                          )
                        );
                      }}
                      className="w-7 h-7 cursor-pointer border rounded"
                      title="Outline Color"
                    />
                  </div>
                </div>

                {/* Outline size */}
                {selectedLine?.outlineColor && (
                  <div className="flex flex-col items-center space-y-0.5 w-full">
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.5"
                      value={selectedLine?.outlineSize || 1.5}
                      onChange={(e) => {
                        setCanvasLines(
                          canvasLines.map((line) =>
                            selectedIds.includes(line.id) ? { ...line, outlineSize: parseFloat(e.target.value) } : line
                          )
                        );
                      }}
                      className="w-full cursor-pointer"
                      title="Outline Size"
                    />
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[8px] text-gray-400">{selectedLine?.outlineSize || 1.5}px</span>
                      <button
                        onClick={() => {
                          setCanvasLines(
                            canvasLines.map((line) =>
                              selectedIds.includes(line.id) ? { ...line, outlineColor: null, outlineSize: null } : line
                            )
                          );
                        }}
                        className="text-[8px] text-red-400 hover:text-red-600 underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                <hr className="w-full border-gray-200" />

                {/* Alignment */}
                <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                  {[
                    { align: "left",   Icon: MdFormatAlignLeft },
                    { align: "center", Icon: MdFormatAlignCenter },
                    { align: "right",  Icon: MdFormatAlignRight },
                  ].map(({ align, Icon }) => (
                    <button
                      key={align}
                      onClick={() => alignText(align)}
                      className={`p-1 rounded transition ${
                        selectedLine?.textAlign === align
                          ? "bg-white shadow text-blue-600"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                      title={`${align.charAt(0).toUpperCase() + align.slice(1)} Align`}
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>

                {/* Delete */}
                <button
                  onClick={deleteSelected}
                  className="flex items-center gap-1 text-[9px] text-red-500 hover:text-red-700 transition"
                  title="Delete Selected"
                >
                  <HiOutlineTrash size={13} />
                  <span>Remove</span>
                </button>
              </div>
            )}

            {/* ━━━ SCALE & FLOW ━━━ */}
            {activePanel === "scale" && hasSelection && (
              <div className="flex flex-col items-center space-y-2.5">
                <h3 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Scale & Flow</h3>

                {/* Font Size */}
                <div className="flex flex-col items-center space-y-0.5">
                  <span className="text-[8px] text-gray-400 uppercase tracking-wide">Size</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateFontSizeForSelected(-2)}
                      className="p-1 rounded bg-gray-100 text-blue-600 hover:bg-gray-200 transition"
                      title="Decrease"
                    >
                      <FaMinus size={9} />
                    </button>
                    <input
                      type="number"
                      value={manualFontSize}
                      onChange={(e) => setManualFontSize(Number(e.target.value))}
                      onBlur={commitManualFontSize}
                      className="w-11 text-center border rounded text-xs py-0.5"
                    />
                    <button
                      onClick={() => updateFontSizeForSelected(2)}
                      className="p-1 rounded bg-gray-100 text-blue-600 hover:bg-gray-200 transition"
                      title="Increase"
                    >
                      <FaPlus size={9} />
                    </button>
                  </div>
                </div>

                {/* Line Spacing */}
                {editMode === "stanza" && (
                  <div className="flex flex-col items-center space-y-0.5">
                    <span className="text-[8px] text-gray-400 uppercase tracking-wide">Spacing</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateStanzaSpacing(-5)}
                        className="p-1 rounded bg-gray-100 text-purple-600 hover:bg-gray-200 transition"
                        title="Decrease Spacing"
                      >
                        <HiOutlineChevronDown size={13} />
                      </button>
                      <input
                        type="number"
                        value={manualSpacing}
                        onChange={(e) => setManualSpacing(Number(e.target.value))}
                        onBlur={commitManualSpacing}
                        className="w-11 text-center border rounded text-xs py-0.5"
                      />
                      <button
                        onClick={() => updateStanzaSpacing(5)}
                        className="p-1 rounded bg-gray-100 text-purple-600 hover:bg-gray-200 transition"
                        title="Increase Spacing"
                      >
                        <HiOutlineChevronUp size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* BG Theme Modal */}
      {showThemeModal && (
        <BgThemeModal
          currentTheme={backgroundTheme}
          onSelect={(id, scope) => onBackgroundChange?.({ backgroundTheme: id, _scope: scope })}
          onClose={() => setShowThemeModal(false)}
        />
      )}

      {/* Confirmation modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[999]">
          <div className="bg-white p-6 rounded shadow-md w-[90%] max-w-sm text-center">
            <p className="mb-4">{modalMessage}</p>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => {
                onModalConfirm();
                setModalVisible(false);
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CanvasToolbar;
