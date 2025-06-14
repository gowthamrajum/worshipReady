import React, { useState, useRef } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";
import { AiOutlinePlus } from "react-icons/ai";
import {
  HiOutlineDocumentText,
  HiOutlineSpeakerphone,
  HiOutlineClipboardList,
  HiOutlineBookOpen,
  HiOutlineAnnotation,
} from "react-icons/hi";

import ConfirmModal from "./ConfirmModal"; // ✅ imported instead of inline

const INITIAL_SLIDES = [
  {
    label: "Praise & Worship",
    lines: ["స్తుతి ఆరాధన", "Praise & Worship"],
    icon: <HiOutlineSpeakerphone size={16} />,
  },
  {
    label: "Sermon",
    lines: ["వాక్యోపదేశం", "Sermon"],
    icon: <HiOutlineBookOpen size={16} />,
  },
  {
    label: "Psalm Reading",
    lines: [
      "ఉత్తర-ప్రత్యుత్తరాలు",
      "Responsive Reading",
      "కీర్తనలు | PSALMS",
    ],
    icon: <HiOutlineClipboardList size={16} />,
  },
  {
    label: "Communion",
    lines: ["Communion"],
    icon: <HiOutlineAnnotation size={16} />,
  },
  {
    label: "Announcements",
    lines: ["Announcements"],
    icon: <HiOutlineDocumentText size={16} />,
  },
  {
    label: "Benediction",
    lines: ["Benediction", "ఆశీర్వాదం"],
    icon: <HiOutlineDocumentText size={16} />,
  },
  {
    label: "Offerings",
    lines: ["Offerings","కానుకలు"],
    icon: <HiOutlineDocumentText size={16} />,
  },
  {
    label: "Thank You Note",
    lines: ["అందరికీ వందనాలు", "Greetings to all"],
    icon: <HiOutlineDocumentText size={16} />,
  },  
];

const CustomSlides = () => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef(null);

  const [customSlides, setCustomSlides] = useState(INITIAL_SLIDES);
  const [showModal, setShowModal] = useState(false);
  const [slideName, setSlideName] = useState("");
  const [slideContent, setSlideContent] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);

  const handleDragStart = (e, stanza) => {
    const data = {
      type: "stanza",
      lines: stanza.lines,
      fontSize: 60,
      lineSpacing: 110,
    };
    e.dataTransfer.setData("text/plain", JSON.stringify(data));
  };

  const handleEditClick = (index) => {
    const item = customSlides[index];
    const isEditable = index >= INITIAL_SLIDES.length;
    if (!isEditable) return;
    setSlideName(item.label);
    setSlideContent(item.lines.join("\n"));
    setEditIndex(index);
    setShowModal(true);
  };

  const handleDeleteClick = (index) => {
    const isEditable = index >= INITIAL_SLIDES.length;
    if (!isEditable) return;
    setConfirmDeleteIndex(index);
  };

  const confirmDelete = () => {
    const updated = [...customSlides];
    updated.splice(confirmDeleteIndex, 1);
    setCustomSlides(updated);
    setConfirmDeleteIndex(null);
  };

  const cancelDelete = () => {
    setConfirmDeleteIndex(null);
  };

  const handleSave = () => {
    if (!slideName.trim() || !slideContent.trim()) {
      alert("Please enter both slide name and content");
      return;
    }

    const lines = slideContent
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const updated = [...customSlides];
    if (editIndex !== null) {
      updated[editIndex] = { label: slideName.trim(), lines };
    } else {
      updated.push({ label: slideName.trim(), lines });
    }

    setCustomSlides(updated);
    resetModal();
  };

  const resetModal = () => {
    setSlideName("");
    setSlideContent("");
    setShowModal(false);
    setEditIndex(null);
  };

  return (
    <div ref={containerRef} className="relative border rounded bg-white shadow">
      {/* Expandable Panel */}
      {expanded && (
        <div className="absolute top-full mt-1 z-10 bg-white border rounded shadow-md px-4 py-3 max-h-64 overflow-y-auto w-full">
          <div className="grid grid-cols-2 gap-2">
            {customSlides.map((item, idx) => (
              <div
                key={idx}
                className="relative group cursor-grab bg-white border border-gray-300 rounded text-sm shadow-sm hover:shadow-md hover:border-blue-400 
                flex items-center justify-between h-14 px-3 font-medium transition-all duration-200 ease-in-out hover:scale-[1.03]"
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
              >
                <span className="flex items-center gap-1 truncate">
                  {item.icon ?? <HiOutlineDocumentText size={16} />}
                  {item.label}
                </span>

                {idx >= INITIAL_SLIDES.length && (
                  <div className="flex gap-1 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(idx);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                      title="Edit"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(idx);
                      }}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => {
                resetModal();
                setShowModal(true);
              }}
              className="flex items-center justify-center gap-1 h-14 px-3 text-center text-sm bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm transition-all duration-200 hover:scale-[1.03]"
            >
              <AiOutlinePlus />
              Custom Text
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="flex justify-between items-center bg-blue-100 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <h3 className="font-semibold text-blue-700 inline-flex items-center gap-2">
          <HiOutlineDocumentText size={20} />
          Custom Slides
        </h3>
        <div className="transition-transform duration-300">
          {expanded ? (
            <FiChevronUp className="text-blue-700" size={20} />
          ) : (
            <FiChevronDown className="text-blue-700" size={20} />
          )}
        </div>
      </div>

      {/* Slide Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editIndex !== null ? "Edit Custom Slide" : "Create Custom Slide"}
            </h2>

            <label className="block text-sm font-medium mb-1">Slide Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              value={slideName}
              onChange={(e) => setSlideName(e.target.value)}
              placeholder="Enter slide label"
            />

            <label className="block text-sm font-medium mb-1">
              Slide Content (1 line per row)
            </label>
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              rows={4}
              value={slideContent}
              onChange={(e) => setSlideContent(e.target.value)}
              placeholder="Type each line of the slide here..."
            ></textarea>

            <div className="flex justify-end gap-2">
              <button
                onClick={resetModal}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={confirmDeleteIndex !== null}
        title="Delete Custom Slide?"
        message="This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default CustomSlides;