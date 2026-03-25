import React from "react";
import { BsCursor, BsTextParagraph, BsTextareaResize } from "react-icons/bs";
import { MdModeEditOutline, MdEditNote, MdOutlineFormatQuote } from "react-icons/md";

const ModeSelectors = ({ dragMode, setDragMode, editMode, setEditMode }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-6 bg-gray-50 border rounded px-4 py-4 shadow-sm">
      {/* Drag Mode */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 font-semibold text-blue-700">
          <BsCursor />
          <span>Drag Mode</span>
        </div>
        <div className="flex gap-2">
          {[
            { mode: "line", label: "Line-by-line", icon: <BsTextParagraph /> },
            { mode: "stanza", label: "Entire Stanza", icon: <BsTextareaResize /> },
          ].map(({ mode, label, icon }) => (
            <button
              key={mode}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDragMode(mode);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all ${
                dragMode === mode
                  ? "bg-blue-600 text-white border-blue-700"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Mode */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 font-semibold text-green-700">
          <MdModeEditOutline />
          <span>Edit Mode</span>
        </div>
        <div className="flex gap-2">
          {[
            { mode: "line", label: "Line Edit", icon: <MdEditNote /> },
            { mode: "stanza", label: "Stanza Edit", icon: <MdOutlineFormatQuote /> },
          ].map(({ mode, label, icon }) => (
            <button
              key={mode}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditMode(mode);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all ${
                editMode === mode
                  ? "bg-green-600 text-white border-green-700"
                  : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModeSelectors;