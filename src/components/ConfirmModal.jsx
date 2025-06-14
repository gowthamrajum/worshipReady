import React from "react";
import { FiTrash2 } from "react-icons/fi";

const ConfirmModal = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-md shadow-xl max-w-sm w-full p-6 animate-fade-in-up">
        <div className="flex gap-3 items-start">
          <FiTrash2 size={24} className="text-red-600 mt-1" />
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">
              {title}
            </h2>
            <p className="text-sm text-gray-600">{message}</p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;