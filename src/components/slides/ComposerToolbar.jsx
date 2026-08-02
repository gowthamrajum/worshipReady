import React from "react";
import { FiDownload, FiTrash2, FiCode } from "react-icons/fi";

export default function ComposerToolbar({ onDiscard, onSaveDownload, onDownloadZip, onSessionMaker }) {
  return (
    <div className="flex justify-end gap-4">
      <button
        onClick={onDiscard}
        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        <FiTrash2 />
        Discard Draft
      </button>

      <button
        onClick={onSaveDownload}
        className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
      >
        <FiDownload />
        Save & Download Session
      </button>

      <button
        onClick={onDownloadZip}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        <FiDownload />
        Download ZIP (PPT + Session)
      </button>

      <button
        onClick={onSessionMaker}
        title="Export a Cantica-compatible service JSON (import it in Cantica / lumen-presenter)"
        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
      >
        <FiCode />
        Session Maker
      </button>
    </div>
  );
}
