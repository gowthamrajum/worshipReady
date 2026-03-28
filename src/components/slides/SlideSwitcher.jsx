import React, { useRef, useState } from "react";
import { DEFAULT_BG_COLOR } from "../../config/canvas";
import {
  MdDelete,
  MdContentCopy,
  MdArrowBack,
  MdArrowForward,
  MdAdd,
  MdVisibility,
  MdDragIndicator,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdClose,
} from "react-icons/md";

const SlideSwitcher = ({
  slides,
  currentIndex,
  goToSlide,
  onAdd,
  onDuplicate,
  onDelete,
  onNext,
  onPrev,
  onReorder,
  onReorderMultiple,
}) => {
  const containerRef = useRef(null);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [copyModalIndex, setCopyModalIndex] = useState(null);

  // ── Multi-select state ────────────────────────────────────────────────────
  const [selected, setSelected] = useState(new Set());

  const toggleSelect = (e, index) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  // ── Drag-to-reorder state ─────────────────────────────────────────────────
  const [dragFromIndex, setDragFromIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDragFromIndex(index);
    e.dataTransfer.effectAllowed = "move";
    if (e.target) e.target.style.opacity = "0.5";
  };

  const handleDragEnd = (e) => {
    if (e.target) e.target.style.opacity = "1";
    if (dragFromIndex !== null && dragOverIndex !== null && dragFromIndex !== dragOverIndex) {
      if (selected.has(dragFromIndex) && selected.size > 1) {
        // Move the whole selection
        const sortedIndices = Array.from(selected).sort((a, b) => a - b);
        onReorderMultiple?.(sortedIndices, dragOverIndex);
        clearSelection();
      } else {
        onReorder?.(dragFromIndex, dragOverIndex);
      }
    }
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (index !== dragOverIndex) setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    // Only clear if leaving the container entirely; individual cards handle their own state
  };

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="bg-gray-300 px-3 py-1 rounded"
          >
            <MdArrowBack />
          </button>
          <span className="font-semibold">
            Slide {currentIndex + 1} / {slides.length}
          </span>
          <button
            onClick={onNext}
            disabled={currentIndex >= slides.length - 1}
            className="bg-gray-300 px-3 py-1 rounded"
          >
            <MdArrowForward />
          </button>
        </div>

        <button
          onClick={onAdd}
          className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1"
        >
          <MdAdd />
          New Slide
        </button>
      </div>

      {/* Multi-select banner */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-1.5 text-sm">
          <span className="text-blue-700 font-medium">{selected.size} slide{selected.size > 1 ? "s" : ""} selected</span>
          <span className="text-blue-400 text-xs">— drag the grouped block to reposition</span>
          <button
            onClick={clearSelection}
            title="Clear selection"
            className="ml-auto flex items-center gap-1 text-xs text-blue-400 hover:text-blue-600"
          >
            <MdClose size={14} /> Clear
          </button>
        </div>
      )}

      {/* Slide List */}
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto py-2 px-1 rounded border bg-white select-none"
      >
        {(() => {
          const hasSelection = selected.size > 1;
          const sortedSelected = hasSelection ? Array.from(selected).sort((a, b) => a - b) : [];
          const groupInsertPos = hasSelection ? sortedSelected[0] : -1;
          let groupRendered = false;

          const items = [];
          slides.forEach((slide, index) => {
            // If this slide is part of a multi-selection, render the group block once at the first selected position
            if (hasSelection && selected.has(index)) {
              if (!groupRendered) {
                groupRendered = true;
                const isDragOverGroup = dragOverIndex !== null && selected.has(dragOverIndex) && dragFromIndex !== null && !selected.has(dragFromIndex);
                items.push(
                  <div
                    key="__group__"
                    draggable
                    onDragStart={(e) => handleDragStart(e, groupInsertPos)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, groupInsertPos)}
                    className={`relative flex gap-1 border-2 border-dashed border-indigo-400 bg-indigo-50 rounded-lg p-2 items-end transition-all duration-150
                      ${isDragOverGroup ? "border-yellow-400 scale-105 shadow-md" : ""}
                      ${dragFromIndex === groupInsertPos ? "opacity-50" : ""}
                    `}
                  >
                    {/* Single group drag handle */}
                    <div className="flex flex-col items-center justify-center pr-1 self-stretch cursor-grab">
                      <MdDragIndicator size={20} className="text-indigo-400" />
                      <span className="text-[10px] text-indigo-400 font-medium mt-0.5">{sortedSelected.length}</span>
                    </div>

                    {/* Mini thumbnails for each selected slide */}
                    {sortedSelected.map((si) => (
                      <div
                        key={slides[si].id}
                        onClick={() => goToSlide(si)}
                        className={`relative w-20 min-w-[80px] h-20 border-2 rounded-md bg-white flex flex-col items-center justify-between p-1 cursor-pointer shadow-sm
                          ${si === currentIndex ? "border-blue-600" : "border-indigo-300"}
                        `}
                      >
                        <button
                          onClick={(e) => toggleSelect(e, si)}
                          title="Deselect"
                          className="absolute top-0.5 right-0.5 text-indigo-500"
                        >
                          <MdCheckBox size={14} />
                        </button>
                        <span className="text-[10px] font-medium text-indigo-700 mt-1">Slide {si + 1}</span>
                        <div className="flex justify-center gap-1.5 w-full">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPreviewIndex(si); }}
                            title="Preview"
                            className="text-gray-600 hover:text-black"
                          >
                            <MdVisibility size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(si); }}
                            title="Delete"
                            className="text-red-400 hover:text-red-600"
                          >
                            <MdDelete size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
              return; // skip individual rendering for selected slides
            }

            // Normal unselected slide
            const isDragOver = dragOverIndex === index && dragFromIndex !== index;
            const isDragging = dragFromIndex === index;
            items.push(
              <div
                key={slide.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onClick={() => goToSlide(index)}
                className={`relative w-24 min-w-[96px] h-24 border-2 rounded-md bg-white flex flex-col items-center justify-between p-1 cursor-pointer shadow-sm transition-all duration-150
                  ${index === currentIndex ? "border-blue-600" : "border-gray-300"}
                  ${isDragOver ? "border-yellow-400 scale-105 shadow-md" : ""}
                  ${isDragging ? "opacity-50" : ""}
                `}
              >
                {/* Select checkbox */}
                <button
                  onClick={(e) => toggleSelect(e, index)}
                  title="Select for multi-move"
                  className="absolute top-0.5 right-0.5 text-gray-300 hover:text-indigo-400 transition-colors"
                >
                  <MdCheckBoxOutlineBlank size={14} />
                </button>

                <div className="flex items-center gap-0.5 w-full">
                  <MdDragIndicator size={12} className="text-gray-400 cursor-grab shrink-0" />
                  <span className="text-xs font-medium truncate">Slide {index + 1}</span>
                </div>

                <div className="flex justify-center gap-2 w-full">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewIndex(index); }}
                    title="Preview"
                    className="text-gray-700 hover:text-black"
                  >
                    <MdVisibility size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCopyModalIndex(index); }}
                    title="Duplicate slide"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <MdContentCopy size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                    title="Delete"
                    className="text-red-500 hover:text-red-700"
                  >
                    <MdDelete size={16} />
                  </button>
                </div>
              </div>
            );
          });

          return items;
        })()}
      </div>

      {/* Preview Modal */}
      {previewIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[960px] h-[540px] rounded shadow-lg relative"
            style={{
              backgroundColor: slides[previewIndex]?.backgroundColor || DEFAULT_BG_COLOR,
              color: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {slides[previewIndex]?.backgroundImage && (
              <img src={slides[previewIndex].backgroundImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            {slides[previewIndex]?.lines.map((line, idx) =>
              line.type === "image" ? (
                <img
                  key={idx}
                  src={line.src}
                  alt={line.alt || ""}
                  style={{
                    position: "absolute",
                    left: `${line.x}px`,
                    top: `${line.y}px`,
                    width: `${line.width}px`,
                    height: `${line.height}px`,
                    transform: "translate(-50%, -50%)",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div
                  key={idx}
                  style={{
                    fontSize: `${line.fontSize}px`,
                    textAlign: line.textAlign || "center",
                    marginBottom: `${line.lineSpacing || 40}px`,
                    whiteSpace: "pre-line",
                  }}
                >
                  {line.text}
                </div>
              )
            )}

            <button
              onClick={() => setPreviewIndex(null)}
              className="absolute bottom-3 right-4 text-sm text-white bg-black/30 px-3 py-1 rounded hover:bg-black/50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Copy Position Modal */}
      {copyModalIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={() => setCopyModalIndex(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-xs w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 text-center">
              <MdContentCopy size={22} className="mx-auto text-blue-500 mb-2" />
              <h3 className="text-base font-bold text-gray-800 mb-1">
                Copy Slide {copyModalIndex + 1}
              </h3>
              <p className="text-xs text-gray-400">
                Where should the copy be placed?
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => {
                  onDuplicate(copyModalIndex, "next");
                  setCopyModalIndex(null);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition border-r border-gray-100"
              >
                <MdArrowForward size={16} />
                After Current
              </button>
              <button
                onClick={() => {
                  onDuplicate(copyModalIndex, "end");
                  setCopyModalIndex(null);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition"
              >
                <MdAdd size={16} />
                At the End
              </button>
            </div>
            <button
              onClick={() => setCopyModalIndex(null)}
              className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition border-t border-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideSwitcher;
