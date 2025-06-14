import React, { useRef, useState } from "react";
import {
  MdDelete,
  MdContentCopy,
  MdArrowBack,
  MdArrowForward,
  MdAdd,
  MdVisibility,
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
}) => {
  const containerRef = useRef(null);
  const [previewIndex, setPreviewIndex] = useState(null);

  let isDown = false;
  let startX;
  let scrollLeft;

  const handleMouseDown = (e) => {
    isDown = true;
    startX = e.pageX - containerRef.current.offsetLeft;
    scrollLeft = containerRef.current.scrollLeft;
    containerRef.current.classList.add("cursor-grabbing");
  };

  const handleMouseLeave = () => {
    isDown = false;
    containerRef.current.classList.remove("cursor-grabbing");
  };

  const handleMouseUp = () => {
    isDown = false;
    containerRef.current.classList.remove("cursor-grabbing");
  };

  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
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

      {/* Slide List - No Drag/Drop */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="flex gap-3 overflow-x-auto py-2 px-1 rounded border bg-white cursor-grab select-none"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            onClick={() => goToSlide(index)}
            className={`w-24 min-w-[96px] h-24 border-2 ${
              index === currentIndex ? "border-blue-600" : "border-gray-300"
            } rounded-md bg-white flex flex-col items-center justify-between p-1 cursor-pointer shadow-sm`}
          >
            <span className="text-xs font-medium">Slide {index + 1}</span>

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
                  onDuplicate(index);
                }}
                title="Duplicate"
                className="text-blue-500 hover:text-blue-700"
              >
                <MdContentCopy size={16} />
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
              backgroundColor: "#4b5c47",
              fontFamily: "'Anek Telugu', sans-serif",
              color: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
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