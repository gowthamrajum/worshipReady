import React from "react";
import { FiEdit, FiSave } from "react-icons/fi";

const SlideEditControls = ({ unsaved, onEdit, onSave, isEditing }) => {
  return (
    <div className="flex gap-4">
      <button
        onClick={onEdit}
        disabled={isEditing}
        className={`flex items-center gap-2 px-4 py-2 rounded text-white text-sm ${
          isEditing
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-yellow-500 hover:bg-yellow-600"
        }`}
      >
        <FiEdit />
        Edit Slide
      </button>

      <button
        onClick={onSave}
        disabled={!unsaved}
        className={`flex items-center gap-2 px-4 py-2 rounded text-white text-sm ${
          unsaved
            ? "bg-green-600 hover:bg-green-700"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        <FiSave />
        Save Slide
      </button>
    </div>
  );
};

export default SlideEditControls;