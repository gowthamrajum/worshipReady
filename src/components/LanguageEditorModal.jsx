// src/components/LanguageEditorModal.jsx
import React from "react";
import { Rnd } from "react-rnd";

export default function LanguageEditorModal({ isOpen, onClose, isMinimized, onToggleMinimize }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <Rnd
        default={{
          x: window.innerWidth / 6,
          y: window.innerHeight / 8,
          width: 700,
          height: 500,
        }}
        minWidth={400}
        minHeight={300}
        bounds="window"
        dragHandleClassName="drag-handle"
        className="bg-white rounded-lg overflow-hidden shadow-lg flex flex-col"
      >
        {/* Header */}
        <div className="drag-handle flex justify-between items-center bg-indigo-600 text-white px-4 py-2 cursor-move">
          <h2 className="text-lg font-semibold">Language Editor</h2>
          <div className="space-x-2">
            <button
              onClick={onToggleMinimize}
              className="bg-indigo-500 hover:bg-indigo-700 px-2 py-1 rounded"
            >
              {isMinimized ? "Expand" : "Minimize"}
            </button>
            <button
              onClick={onClose}
              className="bg-red-500 hover:bg-red-700 px-2 py-1 rounded"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <iframe
            src="https://lekhini.org/"
            title="Language Editor"
            className="flex-grow w-full"
            style={{ minHeight: "500px", border: "none" }}
          ></iframe>
        )}
      </Rnd>
    </div>
  );
}
