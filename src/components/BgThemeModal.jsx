import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import { STATIC_BACKGROUNDS } from "../utils/staticBackgrounds";

const CATEGORIES = [...new Set(STATIC_BACKGROUNDS.map((b) => b.category))];

export default function BgThemeModal({ currentTheme, onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(() => {
    if (currentTheme) {
      const found = STATIC_BACKGROUNDS.find((b) => b.id === currentTheme);
      if (found) return found.category;
    }
    return CATEGORIES[0] ?? "";
  });

  // When a theme is clicked, we stash its id and show the scope prompt
  const [pendingThemeId, setPendingThemeId] = useState(null);

  const themes = STATIC_BACKGROUNDS.filter((b) => b.category === activeCategory);

  const handleApply = (scope) => {
    onSelect(pendingThemeId, scope);
    setPendingThemeId(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex overflow-hidden"
        style={{ width: 740, maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left pane: category list ── */}
        <div className="flex flex-col bg-gray-900 flex-shrink-0" style={{ width: 160 }}>
          <div className="px-4 pt-4 pb-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            Event
          </div>

          <div className="flex-1 flex flex-col gap-0.5 px-2 overflow-y-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="px-2 py-3 border-t border-gray-800">
            <button
              onClick={() => { onSelect(null, "all"); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-800 hover:text-white transition"
            >
              Clear Theme
            </button>
          </div>
        </div>

        {/* ── Right pane: theme grid ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">{activeCategory} Themes</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Click a theme to apply it</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 transition p-1 rounded-full hover:bg-gray-100"
            >
              <FiX size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {themes.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center px-6">
                No themes added yet for this category.<br />
                Place images in <code className="text-xs bg-gray-100 px-1 rounded">public/themes/{activeCategory.toLowerCase().replace(/ /g, "-")}/</code>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {themes.map((theme) => {
                  const selected = currentTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => setPendingThemeId(theme.id)}
                      className={`rounded-xl overflow-hidden border-2 text-left transition-all duration-150
                        hover:scale-[1.025] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          selected
                            ? "border-blue-500 shadow-lg ring-2 ring-blue-300"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                    >
                      <div className="w-full overflow-hidden rounded-t-[10px]">
                        <img
                          src={theme.src}
                          alt={theme.label}
                          className="w-full h-auto block aspect-video object-cover"
                        />
                      </div>
                      <div className={`px-3 py-2 flex items-center justify-between ${selected ? "bg-blue-50" : "bg-gray-50"}`}>
                        <span className={`text-xs font-semibold ${selected ? "text-blue-700" : "text-gray-700"}`}>
                          {theme.label}
                        </span>
                        {selected && (
                          <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                            Active
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Apply-scope confirmation prompt ── */}
      {pendingThemeId !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
          onClick={() => setPendingThemeId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-xs text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Apply Theme</h3>
            <p className="text-xs text-gray-500 mb-5">
              Where would you like to apply this theme?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleApply("current")}
                className="w-full py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
              >
                Current Slide
              </button>
              <button
                onClick={() => handleApply("all")}
                className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                All Slides
              </button>
            </div>
            <button
              onClick={() => setPendingThemeId(null)}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
