import React from "react";
import { FiLoader, FiCheckCircle } from "react-icons/fi";

export function UnsavedChangesModal({ onCancel, onSaveAndContinue }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg max-w-md text-center space-y-4">
        <h2 className="text-lg font-semibold text-red-600">Unsaved Changes</h2>
        <p className="text-sm text-gray-600">
          You have unsaved changes on this slide. Please save before continuing.
        </p>
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onSaveAndContinue}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditRequiredModal({ onCancel, onEdit }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm">
        <h2 className="text-lg font-semibold text-yellow-700">Editing Required</h2>
        <p className="text-gray-600 text-sm">Click "Edit Now" to enable slide editing.</p>
        <div className="flex justify-center gap-4">
          <button
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={onEdit}
          >
            Edit Now
          </button>
        </div>
      </div>
    </div>
  );
}

export function SaveConfirmationModal({ lastSavedTime, onKeepWorking, onBackToHome }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg max-w-md text-center space-y-4">
        <h2 className="text-lg font-semibold text-green-700">Slides Saved</h2>
        <p className="text-sm text-gray-600">
          Slides saved locally at <strong>{lastSavedTime}</strong>
        </p>
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={onKeepWorking}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Keep Working
          </button>
          <button
            onClick={onBackToHome}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export function ZipProgressModal() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg flex items-center gap-4">
        <FiLoader className="animate-spin text-blue-500" size={24} />
        <span className="text-gray-700 font-medium">Preparing ZIP file...</span>
      </div>
    </div>
  );
}

export function ZipReadyModal() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm">
        <div className="flex justify-center text-green-600">
          <FiCheckCircle size={36} />
        </div>
        <h2 className="text-xl font-semibold text-green-700">ZIP is Ready!</h2>
        <p className="text-sm text-gray-600">
          Your presentation and session have been bundled and will download now.
        </p>
      </div>
    </div>
  );
}
