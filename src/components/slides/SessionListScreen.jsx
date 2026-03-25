import React, { useState } from "react";
import { FiTrash2, FiUpload, FiClock, FiLayers } from "react-icons/fi";
import { timeAgo, timeRemaining } from "../../utils/sessionManager";

export default function SessionListScreen({
  sessions,
  onResume,
  onDelete,
  onCreateNew,
  onLoadFile,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FiLayers size={20} />
            Your Sessions
          </h2>
          <p className="text-indigo-200 text-xs mt-1">
            Sessions auto-expire after 6 hours. Pick one to resume or start fresh.
          </p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              No saved sessions found.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 hover:bg-gray-50 transition group"
              >
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onResume(s.id)}>
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <FiLayers size={10} /> {s.slideCount} slides
                    </span>
                    <span className="flex items-center gap-1">
                      <FiClock size={10} /> {timeAgo(s.timestamp)}
                    </span>
                    <span className="text-amber-500 font-medium">{timeRemaining(s.expiresAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onResume(s.id)}
                  className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700 transition shrink-0"
                >
                  Resume
                </button>
                <button
                  onClick={() => setDeleteTarget(s)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 shrink-0"
                  title="Delete session"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex flex-col gap-2 border-t">
          <button
            onClick={onCreateNew}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition text-sm"
          >
            Create New Presentation
          </button>
          <button
            onClick={onLoadFile}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition text-sm"
          >
            <FiUpload size={14} />
            Load From File
          </button>
        </div>
      </div>

      {/* Delete Session Warning Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiTrash2 size={22} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Delete Session?</h3>
              <p className="text-sm text-gray-500">
                <strong>"{deleteTarget.name}"</strong> with {deleteTarget.slideCount} slide{deleteTarget.slideCount !== 1 ? "s" : ""} will be permanently removed.
              </p>
              <p className="text-xs text-red-500 font-semibold mt-2">
                This cannot be undone.
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition border-r border-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="flex-1 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
