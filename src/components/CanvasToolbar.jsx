import React, { useState, useEffect } from "react";
import {
  HiOutlineTrash,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
} from "react-icons/hi";
import {
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
} from "react-icons/md";
import { FaPlus, FaMinus } from "react-icons/fa";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const CanvasToolbar = ({
  canvasLines,
  setCanvasLines,
  selectedIds,
  setSelectedIds,
  editMode,
}) => {
  const MIN_FONT_SIZE = 25;
  const MAX_FONT_SIZE = 70;
  const MIN_LINE_SPACING = 1;
  const MAX_LINE_SPACING = 150;

  const [expanded, setExpanded] = useState(true);
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

  if (!Array.isArray(canvasLines) || !isEditing || selectedIds.length === 0)
    return null;

  const showModal = (message, onConfirm) => {
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
        showModal(
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
      showModal(
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
      showModal(
        `Line spacing must be between ${MIN_LINE_SPACING}px and ${MAX_LINE_SPACING}px. It has been set to ${clamped}px.`,
        () => {
          const updated = canvasLines.map((line) => {
            if (line.stanzaId === currentStanzaId) {
              const index = sorted.findIndex((l) => l.id === line.id);
              return {
                ...line,
                y: baseLine.y + index * clamped,
                lineSpacing: clamped,
              };
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
        return {
          ...line,
          y: baseLine.y + index * newSpacing,
          lineSpacing: newSpacing,
        };
      }
      return line;
    });
    setCanvasLines(updated);
  };

  const commitManualSpacing = () => {
    const delta = manualSpacing - currentLineSpacing;

    if (manualSpacing < MIN_LINE_SPACING || manualSpacing > MAX_LINE_SPACING) {
      const clamped = Math.max(MIN_LINE_SPACING, Math.min(MAX_LINE_SPACING, manualSpacing));
      showModal(
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

  return (
    <>
      {/* Toolbar */}
      <div
        className={`fixed top-1/2 transition-all transform -translate-y-1/2 z-50 flex ${
          expanded ? "right-0" : "right-[70px]"
        }`}
      >
        {/* Toggle */}
        <div className="bg-gray-900 text-white flex flex-col items-center justify-center px-1 rounded-l">
          <button
            onClick={() => setExpanded(!expanded)}
            className="hover:bg-gray-800 p-1 transition"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        {/* Actual Toolbar */}
        {expanded && (
          <div className="bg-white border-l shadow-lg p-3 rounded-l-md flex flex-col items-center space-y-3 min-w-[90px]">
            {/* Font Size */}
            <div className="flex flex-col items-center space-y-1">
              <button
                onClick={() => updateFontSizeForSelected(2)}
                className="text-blue-600 hover:text-blue-800"
                title="Increase"
              >
                <FaPlus />
              </button>
              <input
                type="number"
                value={manualFontSize}
                onChange={(e) => setManualFontSize(Number(e.target.value))}
                onBlur={commitManualFontSize}
                className="w-14 text-center border rounded text-sm py-0.5"
              />
              <button
                onClick={() => updateFontSizeForSelected(-2)}
                className="text-blue-600 hover:text-blue-800"
                title="Decrease"
              >
                <FaMinus />
              </button>
            </div>

            {/* Align */}
            <div className="flex space-x-1">
              <button onClick={() => alignText("left")} title="Left Align">
                <MdFormatAlignLeft size={18} />
              </button>
              <button onClick={() => alignText("center")} title="Center Align">
                <MdFormatAlignCenter size={18} />
              </button>
              <button onClick={() => alignText("right")} title="Right Align">
                <MdFormatAlignRight size={18} />
              </button>
            </div>

            {/* Spacing */}
            {editMode === "stanza" && (
              <div className="flex flex-col items-center space-y-1">
                <button
                  onClick={() => updateStanzaSpacing(5)}
                  className="text-purple-600 hover:text-purple-800"
                  title="Increase Spacing"
                >
                  <HiOutlineChevronUp />
                </button>
                <input
                  type="number"
                  value={manualSpacing}
                  onChange={(e) => setManualSpacing(Number(e.target.value))}
                  onBlur={commitManualSpacing}
                  className="w-14 text-center border rounded text-sm py-0.5"
                />
                <button
                  onClick={() => updateStanzaSpacing(-5)}
                  className="text-purple-600 hover:text-purple-800"
                  title="Decrease Spacing"
                >
                  <HiOutlineChevronDown />
                </button>
              </div>
            )}

            {/* Delete */}
            <button
              onClick={deleteSelected}
              className="text-red-600 hover:text-red-800"
              title="Delete Selected"
            >
              <HiOutlineTrash size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
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