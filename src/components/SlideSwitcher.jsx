import React, { useRef, useState } from "react";
import {
  MdDelete,
  MdContentCopy,
  MdArrowBack,
  MdArrowForward,
  MdAdd,
  MdVisibility,
  MdDragIndicator,
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
}) => {
  const containerRef = useRef(null);
  const [previewIndex, setPreviewIndex] = useState(null);

  // ── Drag-to-reorder state ─────────────────────────────────────────────────
  const [dragFromIndex, setDragFromIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDragFromIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Make the drag ghost semi-transparent
    if (e.target) e.target.style.opacity = "0.5";
  };

  const handleDragEnd = (e) => {
    if (e.target) e.target.style.opacity = "1";
    if (dragFromIndex !== null && dragOverIndex !== null && dragFromIndex !== dragOverIndex) {
      onReorder?.(dragFromIndex, dragOverIndex);
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

      {/* Slide List */}
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto py-2 px-1 rounded border bg-white select-none"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onClick={() => goToSlide(index)}
            className={`w-24 min-w-[96px] h-24 border-2 rounded-md bg-white flex flex-col items-center justify-between p-1 cursor-pointer shadow-sm transition-all duration-150
              ${index === currentIndex ? "border-blue-600" : "border-gray-300"}
              ${dragOverIndex === index && dragFromIndex !== index ? "border-yellow-400 scale-105 shadow-md" : ""}
              ${dragFromIndex === index ? "opacity-50" : ""}
            `}
          >
            <div className="flex items-center gap-0.5 w-full">
              <MdDragIndicator size={12} className="text-gray-400 cursor-grab shrink-0" />
              <span className="text-xs font-medium truncate">Slide {index + 1}</span>
            </div>

            <div className="flex justify-center gap-2 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(index);
                }}
                title="Preview"
                className="text-gray-700 hover:text-black"
              >
                <MdVisibility size={16} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(index, "next");
                }}
                title="Duplicate next"
                className="text-blue-500 hover:text-blue-700"
              >
                <MdContentCopy size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(index, "end");
                }}
                title="Duplicate to end"
                className="text-blue-400 hover:text-blue-700 text-[9px] font-bold"
              >
                END
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(index);
                }}
                title="Delete"
                className="text-red-500 hover:text-red-700"
              >
                <MdDelete size={16} />
              </button>
            </div>
          </div>
        ))}
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
              backgroundColor: slides[previewIndex]?.backgroundColor || "#4b5c47",
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
            {slides[previewIndex]?.lines.map((line, idx) => (
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
            ))}

            <button
              onClick={() => setPreviewIndex(null)}
              className="absolute bottom-3 right-4 text-sm text-white bg-black/30 px-3 py-1 rounded hover:bg-black/50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideSwitcher;
