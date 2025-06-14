// CanvasEditor.jsx
import React, { useState, useEffect, useRef } from "react";
import CanvasToolbar from "./CanvasToolbar";
import { exportSlideCanvasAsImage } from "../utils/exportSlideCanvasAsImage";

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

// —–––––– Offscreen measure canvas (one-time cost) ––––––—
const _measureCanvas = document.createElement("canvas");
const _measureCtx    = _measureCanvas.getContext("2d");

/**
 * Binary-search the largest integer fontSize so that
 * `text` fits within `maxWidth` in pixels.
 */
function fitLineToWidth(
  text,
  maxWidth,
  fontFamily = "'Anek Telugu', sans-serif",
  minSize    = 12,
  maxSize    = 200
) {
  let lo = minSize, hi = maxSize, best = minSize;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    _measureCtx.font = `${mid}px ${fontFamily}`;
    if (_measureCtx.measureText(text).width <= maxWidth) {
      best = mid;    // it fits, try bigger
      lo   = mid + 1;
    } else {
      hi = mid - 1;  // too big, try smaller
    }
  }
  return best;
}

/**
 * For a stanza (multiple lines), first compute the
 * horizontal-limit font (smallest across all lines),
 * then cap that by the vertical limit so that
 * N * fontSize * lineHeightFactor <= maxHeight.
 */
function fitStanzaFontSize(
  lines,
  maxWidth,
  maxHeight,
  lineHeightFactor = 1.2
) {
  // 1️⃣ horizontal constraint per line
  const horizSizes = lines.map((t) => fitLineToWidth(t, maxWidth));
  const fontHoriz   = Math.min(...horizSizes);

  // 2️⃣ vertical constraint across all lines
  const maxFontVert = Math.floor(
    (maxHeight * 0.9) / (lines.length * lineHeightFactor)
  );

  return Math.min(fontHoriz, maxFontVert);
}

const CanvasEditor = ({
  slides,
  currentIndex,
  setSlideLines,
  setSlideEditMode,
  dragMode,
  editMode,
  slideRefs,
  captureSlideImage,
  onPrev,
  onNext,
}) => {
  const [canvasLines, setCanvasLines]   = useState([]);
  const [selectedIds, setSelectedIds]   = useState([]);
  const [dragInfo, setDragInfo]         = useState(null);
  const [editingId, setEditingId]       = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const internalRef = useRef(null);
  const pendingDrop = useRef(null);

  // keep local canvasLines in sync with slides[currentIndex]
  useEffect(() => {
    setCanvasLines(slides[currentIndex]?.lines || []);
  }, [slides, currentIndex]);
  useEffect(() => setSelectedIds([]), [currentIndex]);

  // handle arrow-key nudging…
  useEffect(() => {
    const handler = (e) => {
      if (!["line","stanza"].includes(editMode) || !selectedIds.length) return;
      const delta = e.shiftKey ? 20 : 5;
      let dx=0, dy=0;
      switch(e.key){
        case "ArrowUp":    dy = -delta; break;
        case "ArrowDown":  dy = +delta; break;
        case "ArrowLeft":  dx = -delta; break;
        case "ArrowRight": dx = +delta; break;
        default: return;
      }
      e.preventDefault();
      const updated = canvasLines.map((ln) =>
        selectedIds.includes(ln.id)
        ? { ...ln, x: ln.x + dx, y: ln.y + dy }
        : ln
      );
      setSlideLines(currentIndex, updated);
      setCanvasLines(updated);
      captureSlideImage(slideRefs.current[currentIndex]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canvasLines, selectedIds, editMode, currentIndex]);

  //-------------- D R A G - & - D R O P  -----------------
  const processDrop = (e, parsed) => {
    const container     = internalRef.current;
    const { left, top } = container.getBoundingClientRect();
    const x = e.pageX - left - window.scrollX;
    const y = e.pageY - top  - window.scrollY;

    // allow 5% padding on each side
    const maxTextWidth  = container.clientWidth  * 0.9;
    const maxTextHeight = container.clientHeight * 0.9;

    if (parsed.type === "line") {
      // auto-size this single line
      const fontSize = fitLineToWidth(parsed.text, maxTextWidth);
      const spacing  = fontSize * 1.2;

      const newLine = {
        text: parsed.text,
        x, y,
        fontSize,
        lineSpacing: spacing,
        id: generateId(),
        stanzaId: null,
        textAlign: "center",
      };
      const updated = [...canvasLines, newLine];
      setSlideLines(currentIndex, updated);
      setCanvasLines(updated);
      setSelectedIds([newLine.id]);
      captureSlideImage(slideRefs.current[currentIndex]);
    }
    else if (parsed.type === "stanza") {
      const stanzaId = generateId();
      const lines    = parsed.lines;

      // pick a single font so that horizontal & vertical both fit
      const fontSize = fitStanzaFontSize(lines, maxTextWidth, maxTextHeight);
      const spacing  = fontSize * 1.2;

      const dropped = lines.map((text, i) => ({
        text,
        x,
        y: y + i * spacing,
        fontSize,
        lineSpacing: spacing,
        id: generateId(),
        stanzaId,
        textAlign: "center",
      }));

      const updated = [...canvasLines, ...dropped];
      setSlideLines(currentIndex, updated);
      setCanvasLines(updated);
      setSelectedIds(dropped.map((l) => l.id));
      captureSlideImage(slideRefs.current[currentIndex]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const raw    = e.dataTransfer.getData("text/plain");
    const parsed = JSON.parse(raw);

    if (!["line","stanza"].includes(editMode)) {
      pendingDrop.current = { event: e, parsed };
      setShowEditModal(true);
      return;
    }
    processDrop(e, parsed);
  };

  //-------------- M O U S E   D R A G   H A N D L E R S  ---------------
  const handleMouseDown = (e, idx) => {
    if (!["line","stanza"].includes(editMode)) return;
    document.body.style.userSelect = "none";
    const rect     = internalRef.current.getBoundingClientRect();
    const offsetX  = e.clientX - rect.left - canvasLines[idx].x;
    const offsetY  = e.clientY - rect.top  - canvasLines[idx].y;
    setDragInfo({ index: idx, offsetX, offsetY });

    if (editMode === "stanza" && canvasLines[idx].stanzaId) {
      const stanzaLines = canvasLines.filter((l) => l.stanzaId === canvasLines[idx].stanzaId);
      setSelectedIds(stanzaLines.map((l) => l.id));
    } else {
      setSelectedIds([canvasLines[idx].id]);
    }
  };

  const handleMouseMove = (e) => {
    if (!dragInfo) return;
    const rect = internalRef.current.getBoundingClientRect();
    const x    = e.clientX - rect.left - dragInfo.offsetX;
    const y    = e.clientY - rect.top  - dragInfo.offsetY;

    const isStanza = editMode === "stanza" && canvasLines[dragInfo.index].stanzaId;
    const updated = canvasLines.map((ln, i) => {
      if (isStanza && selectedIds.includes(ln.id)) {
        return { ...ln, x: ln.x + (x - canvasLines[dragInfo.index].x),
                         y: ln.y + (y - canvasLines[dragInfo.index].y) };
      }
      else if (!isStanza && i === dragInfo.index) {
        return { ...ln, x, y };
      }
      return ln;
    });
    setSlideLines(currentIndex, updated);
    setCanvasLines(updated);
    captureSlideImage(slideRefs.current[currentIndex]);
  };

  const handleMouseUp = () => {
    document.body.style.userSelect = "auto";
    setDragInfo(null);
  };

  //-------------- R E N D E R  -----------------
  return (
    <div
      className="relative w-full h-full flex justify-center items-center bg-gray-100"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        ref={(el) => {
          internalRef.current = el;
          if (slideRefs.current) slideRefs.current[currentIndex] = { current: el };
        }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative shadow-lg border"
        style={{ width: "960px", height: "540px", backgroundColor: "#4b5c47" }}
      >
        {canvasLines.map((line, idx) => (
          <div
            key={line.id}
            onMouseDown={(e) => handleMouseDown(e, idx)}
            onClick={() => {
              if (editMode === "line") {
                setSelectedIds([line.id]);
              } else if (editMode === "stanza" && line.stanzaId) {
                const stanzaLines = canvasLines.filter((l) => l.stanzaId === line.stanzaId);
                setSelectedIds(stanzaLines.map((l) => l.id));
              }
            }}
            onDoubleClick={() => {
              if (["line","stanza"].includes(editMode)) {
                setEditingId(line.id);
              } else {
                setShowEditModal(true);
              }
            }}
            className={`absolute text-white font-bold px-2 ${
              selectedIds.includes(line.id) ? "border border-yellow-300" : ""
            }`}
            style={{
              left:      `${line.x}px`,
              top:       `${line.y}px`,
              fontSize:  `${line.fontSize}px`,
              fontFamily:"'Anek Telugu', sans-serif",
              textAlign: line.textAlign || "center",
              transform: "translate(-50%, -50%)",
              width:     "800px",
              cursor:    "pointer",
              lineHeight: 1, // actual line-height controlled by y + spacing
            }}
          >
            {editingId === line.id ? (
              <textarea
                autoFocus
                value={line.text}
                onChange={(e) => {
                  const updated = canvasLines.map((l) =>
                    l.id === line.id ? { ...l, text: e.target.value } : l
                  );
                  setSlideLines(currentIndex, updated);
                  setCanvasLines(updated);
                }}
                onBlur={(e) => {
                  setEditingId(null);
                  setTimeout(() =>
                    captureSlideImage(slideRefs.current[currentIndex])
                  , 100);
                }}
                className="w-full bg-white text-black rounded p-1"
                style={{
                  fontSize: `${line.fontSize}px`,
                  fontFamily: "'Anek Telugu', sans-serif",
                  fontWeight: "bold",
                  textAlign: line.textAlign,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.2,
                }}
              />
            ) : (
              line.text
            )}
          </div>
        ))}
      </div>

      <CanvasToolbar
        canvasLines={canvasLines}
        setCanvasLines={(lines) => {
          setSlideLines(currentIndex, lines);
          setCanvasLines(lines);
          captureSlideImage(slideRefs.current[currentIndex]);
        }}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        editMode={editMode}
      />

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md text-center space-y-4">
            <h2 className="text-lg font-semibold text-red-600">
              Edit Mode Required
            </h2>
            <p className="text-sm text-gray-600">
              You must enter Edit Mode before modifying this slide.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  pendingDrop.current = null;
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSlideEditMode(currentIndex, "stanza");
                  setShowEditModal(false);
                  if (pendingDrop.current) {
                    processDrop(
                      pendingDrop.current.event,
                      pendingDrop.current.parsed
                    );
                    pendingDrop.current = null;
                  }
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Edit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasEditor;