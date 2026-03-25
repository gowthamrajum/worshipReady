import React, { useState } from "react";
import { FiFilm, FiAlertTriangle } from "react-icons/fi";

const PresentationPrompt = ({ inputValue, setInputValue, onCreate, onLoadFile }) => {
  const [showWarning, setShowWarning] = useState(false);

  const handleCreateClick = () => {
    if (!inputValue.trim()) {
      setShowWarning(true);
      return;
    }
    onCreate(); // 🔥 trigger parent logic
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative">
      <div className="bg-white p-6 rounded shadow w-full max-w-md space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <FiFilm className="text-indigo-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-800">
            Create New Presentation
          </h2>
        </div>

        <input
          type="text"
          placeholder="Enter Presentation Name"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full border border-gray-300 px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="flex flex-col gap-3">
          <button
            onClick={handleCreateClick}
            className="bg-indigo-600 text-white px-4 py-2 rounded w-full hover:bg-indigo-700 transition-all"
          >
            Create
          </button>

          <button
            onClick={onLoadFile}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded w-full hover:bg-gray-300 transition-all"
          >
            Load From Session File
          </button>
        </div>
      </div>

      {/* ⚠️ Warning Modal */}
      {showWarning && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowWarning(false)}
        >
          <div
            className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center text-yellow-500">
              <FiAlertTriangle size={36} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              Presentation Name Required
            </h2>
            <p className="text-sm text-gray-600">
              Please enter a name to create your presentation.
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentationPrompt;