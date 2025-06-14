// EditSong.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FiChevronDown, FiChevronRight, FiSave, FiRotateCw,
  FiRotateCcw, FiX, FiEdit3, FiTrash, FiPlus, FiMove, FiXCircle
} from "react-icons/fi";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import LanguageEditorModal from "./LanguageEditorModal";


const API_BASE = import.meta.env.VITE_API_BASE_URL;

const cleanLine = (line) =>
  typeof line === "string"
    ? line.replace(/\(\d+\)/g, "").replace(/\|\|.*?\|\|/g, "").trim()
    : "Untitled";

export default function EditSong({ songId, onSongUpdated }) {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyrics, setLyrics] = useState(null);
  const [editingLines, setEditingLines] = useState({});
  const [lineDrafts, setLineDrafts] = useState({});
  const [collapsed, setCollapsed] = useState({ main: true, stanzas: [] });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [showSavedModal, setShowSavedModal] = useState(null);
  // null | { type: "saved" | "no-change" | "no-change-discard", timestamp?: string }
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [originalLyrics, setOriginalLyrics] = useState(null);
  const [languageEditorOpen, setLanguageEditorOpen] = useState(false);
const [languageEditorMinimized, setLanguageEditorMinimized] = useState(false);


  useEffect(() => {
    if (songId) {
      axios.get(`${API_BASE}/songs/${songId}`)
        .then(res => {
          setSelectedSong(res.data);
          setLyrics(res.data);
          setOriginalLyrics(JSON.parse(JSON.stringify(res.data)));
          setQuery(res.data.song_name);
          setCollapsed({
            main: true,
            stanzas: res.data.stanzas.map(() => true),
          });
          setEditingLines({});
          setLineDrafts({});
          setUndoStack([]);
          setRedoStack([]);
        })
        .catch(err => console.error("Error fetching song:", err));
    } else {
      axios.get(`${API_BASE}/songs`)
        .then(res => setSongs(res.data))
        .catch(err => console.error("Error fetching songs:", err));
    }
  }, [songId]);

  const handleSelect = (song) => {
    axios.get(`${API_BASE}/songs/${song.song_id}`)
      .then(res => {
        setSelectedSong(song);
        setLyrics(res.data);
        setOriginalLyrics(JSON.parse(JSON.stringify(res.data))); // Deep copy
        setQuery(song.song_name);
        setCollapsed({
          main: true,
          stanzas: res.data.stanzas.map(() => true),
        });
        setEditingLines({});
        setLineDrafts({});
        setUndoStack([]);
        setRedoStack([]);
      });
  };

  const clearSelection = () => {
    setSelectedSong(null);
    setLyrics(null);
    setQuery("");
    setEditingLines({});
  };

  const toggleCollapse = (type, index = null) => {
    if (type === "main") {
      setCollapsed({ ...collapsed, main: !collapsed.main });
    } else {
      const newStanzas = [...collapsed.stanzas];
      newStanzas[index] = !newStanzas[index];
      setCollapsed({ ...collapsed, stanzas: newStanzas });
    }
  };

  const startEdit = (key, value) => {
    setEditingLines((prev) => ({ ...prev, [key]: true }));
    setLineDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const saveEdit = (type, lang, stanzaIdx, lineIdx, key) => {
    const updated = JSON.parse(JSON.stringify(lyrics));
    const value = lineDrafts[key] ?? "";
    if (type === "main") {
      updated.main_stanza[lang][lineIdx] = value;
    } else {
      updated.stanzas[stanzaIdx][lang][lineIdx] = value;
    }
    setUndoStack([...undoStack, lyrics]);
    setRedoStack([]);
    setLyrics(updated);
    setEditingLines((prev) => ({ ...prev, [key]: false }));
  };

  const deleteLine = (type, lang, stanzaIdx, lineIdx) => {
    const updated = JSON.parse(JSON.stringify(lyrics));
    if (type === "main") {
      updated.main_stanza[lang].splice(lineIdx, 1);
    } else {
      updated.stanzas[stanzaIdx][lang].splice(lineIdx, 1);
    }
    setUndoStack([...undoStack, lyrics]);
    setRedoStack([]);
    setLyrics(updated);
  };

  const addLine = (type, lang, stanzaIdx = null) => {
    const updated = JSON.parse(JSON.stringify(lyrics));
    if (type === "main") {
      updated.main_stanza[lang].push("");
    } else {
      updated.stanzas[stanzaIdx][lang].push("");
    }
    setLyrics(updated);
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const last = undoStack.pop();
      setRedoStack([lyrics, ...redoStack]);
      setLyrics(last);
      setUndoStack([...undoStack]);
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const [next, ...rest] = redoStack;
      setUndoStack([...undoStack, lyrics]);
      setLyrics(next);
      setRedoStack(rest);
    }
  };

  const saveSong = async () => {
    if (JSON.stringify(lyrics) === JSON.stringify(originalLyrics)) {
      setShowSavedModal({ type: "no-change" });
      return;
    }
    try {
      const updatedLyrics = JSON.parse(JSON.stringify(lyrics));
      updatedLyrics.last_updated_by = sessionStorage.getItem("userName") || "System";
  
      await axios.put(`${API_BASE}/songs/${selectedSong.song_id}`, updatedLyrics);
  
      setOriginalLyrics(updatedLyrics);
      setLyrics(updatedLyrics);
      setShowSavedModal({
        type: "saved",
        timestamp: new Date().toLocaleString(),
      });
  
      // ❌ Do NOT call onSongUpdated() here immediately!
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update song.");
    }
  };
  const handleModalOK = () => {
    setShowSavedModal(null);     // Close the modal
    onSongUpdated?.();           // Now refresh the table
    toast.success("Song updated successfully! 🎉"); // Optional toast
  };

  const addStanza = () => {
    const newStanza = { telugu: [""], english: [""] };
    setLyrics({
      ...lyrics,
      stanzas: [...lyrics.stanzas, newStanza],
    });
    setCollapsed({
      ...collapsed,
      stanzas: [...collapsed.stanzas, false],
    });
  };

  const removeStanza = (index) => {
    const updated = { ...lyrics };
    updated.stanzas.splice(index, 1);
    setLyrics(updated);
    setCollapsed({
      ...collapsed,
      stanzas: collapsed.stanzas.filter((_, i) => i !== index),
    });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = Array.from(lyrics.stanzas);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    const reorderedCollapsed = Array.from(collapsed.stanzas);
    const [collapsedItem] = reorderedCollapsed.splice(result.source.index, 1);
    reorderedCollapsed.splice(result.destination.index, 0, collapsedItem);

    setLyrics({ ...lyrics, stanzas: reordered });
    setCollapsed({ ...collapsed, stanzas: reorderedCollapsed });
  };

  const renderLines = (lines, type, lang, stanzaIdx = null) =>
    lines.map((line, idx) => {
      const key = `${type}-${lang}-${stanzaIdx ?? "main"}-${idx}`;
      const isEditing = editingLines[key];
      return (
        <div key={key} className="flex items-center gap-2 mb-2 border px-2 py-1 rounded">
          {isEditing ? (
            <>
              <input
                value={lineDrafts[key]}
                onChange={(e) => setLineDrafts({ ...lineDrafts, [key]: e.target.value })}
                className="flex-1 px-2 py-1 outline-none"
                autoFocus
              />
              <button onClick={() => saveEdit(type, lang, stanzaIdx, idx, key)}>
                <FiSave className="text-green-600 hover:text-green-800" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-gray-700">{line}</span>
              <button onClick={() => startEdit(key, line)}>
                <FiEdit3 className="text-indigo-500 hover:text-indigo-700" />
              </button>
              <button onClick={() => deleteLine(type, lang, stanzaIdx, idx)}>
                <FiTrash className="text-red-500 hover:text-red-700" />
              </button>
            </>
          )}
        </div>
      );
    });

  return (
    <div className="space-y-6 mt-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search song to edit..."
          className="w-full border px-4 py-2 rounded focus:ring pr-10"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedSong(null);
            setLyrics(null);
          }}
        />
        {selectedSong && (
          <button
            onClick={clearSelection}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600"
          >
            <FiX />
          </button>
        )}
      </div>

      {/* Song list */}
      {!selectedSong && query && (
        <ul className="space-y-2">
          {songs
            .filter((s) => s.song_name.toLowerCase().includes(query.toLowerCase()))
            .map((song) => (
              <li
                key={song.song_id}
                onClick={() => handleSelect(song)}
                className="cursor-pointer p-2 bg-indigo-50 rounded hover:bg-indigo-100"
              >
                🎵 {song.song_name}
              </li>
            ))}
        </ul>
      )}

      {/* Editor */}
      {lyrics && (
        <div className="bg-white border rounded p-4 shadow space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-700">{lyrics.song_name}</h2>
            <div className="flex gap-3">
              <button onClick={undo}><FiRotateCcw /></button>
              <button onClick={redo}><FiRotateCw /></button>
              <button
                onClick={() => setShowDiscardModal(true)}
                className="flex items-center gap-2 text-red-600 hover:text-red-800"
              >
                <FiXCircle /> Discard Changes
              </button>
              <button
                onClick={saveSong}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                <FiSave /> Save Song
              </button>
              <button
                onClick={() => {
                  setLanguageEditorOpen(true);
                  setLanguageEditorMinimized(false);
                }}
                className="flex items-center gap-2 text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded shadow"
              >
                🈳 Language Editor
              </button>

            </div>
          </div>

          {/* Main stanza */}
          <div>
            <button
              onClick={() => toggleCollapse("main")}
              className="flex items-center text-indigo-700 text-lg font-medium mb-2"
            >
              {collapsed.main ? <FiChevronRight /> : <FiChevronDown />}
              {cleanLine(lyrics.main_stanza?.english?.[0])}
            </button>
            {!collapsed.main && (
              <div className="grid grid-cols-2 gap-6">
                {["telugu", "english"].map((lang) => (
                  <div key={lang}>
                    {renderLines(lyrics.main_stanza[lang], "main", lang)}
                    <button
                      className="flex items-center gap-2 text-sm text-blue-600 mt-2"
                      onClick={() => addLine("main", lang)}
                    >
                      <FiPlus /> Add Line ({lang})
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Draggable stanzas */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="stanzas">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {lyrics.stanzas.map((stanza, idx) => (
                    <Draggable key={idx} draggableId={`stanza-${idx}`} index={idx}>
                      {(draggable) => (
                        <div
                          {...draggable.draggableProps}
                          ref={draggable.innerRef}
                          className="mb-4 border-t pt-4"
                        >
                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => toggleCollapse("stanza", idx)}
                              className="flex items-center text-gray-800 font-medium mb-2"
                            >
                              {collapsed.stanzas[idx] ? <FiChevronRight /> : <FiChevronDown />}
                              {cleanLine(stanza.english[0])}
                            </button>
                            <div className="flex items-center gap-2">
                              <button {...draggable.dragHandleProps}>
                                <FiMove className="text-gray-400" />
                              </button>
                              <button onClick={() => removeStanza(idx)}>
                                <FiTrash className="text-red-500" />
                              </button>
                            </div>
                          </div>

                          {!collapsed.stanzas[idx] && (
                            <div className="grid grid-cols-2 gap-6">
                              {["telugu", "english"].map((lang) => (
                                <div key={lang}>
                                  {renderLines(stanza[lang], "stanza", lang, idx)}
                                  <button
                                    className="flex items-center gap-2 text-sm text-blue-600 mt-2"
                                    onClick={() => addLine("stanza", lang, idx)}
                                  >
                                    <FiPlus /> Add Line ({lang})
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Add stanza */}
          <div className="flex justify-end">
            <button
              onClick={addStanza}
              className="flex items-center gap-2 mt-4 px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700"
            >
              <FiPlus />
              Add Stanza
            </button>
          </div>
        </div>
      )}

      {/* Save confirmation modal */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm">
            {showSavedModal.type === "saved" && (
                <>
                <h2 className="text-green-700 text-lg font-semibold">Song Saved</h2>
                <p className="text-sm text-gray-700">
                    Song successfully updated at <strong>{showSavedModal.timestamp}</strong>
                </p>
                </>
            )}
            {showSavedModal.type === "no-change" && (
                <>
                <h2 className="text-yellow-600 text-lg font-semibold">No Changes Detected</h2>
                <p className="text-sm text-gray-700">
                    The song wasn't saved because no edits were made.
                </p>
                </>
            )}
            {showSavedModal.type === "no-change-discard" && (
                <>
                <h2 className="text-yellow-600 text-lg font-semibold">No Changes Were Lost</h2>
                <p className="text-sm text-gray-700">
                    You hadn’t made any changes, so nothing was discarded.
                </p>
                </>
            )}
            <button onClick={handleModalOK}>OK</button>
            </div>
        </div>
        )}

      {/* Discard confirmation modal */}
      {showDiscardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm">
            <h2 className="text-red-700 text-lg font-semibold">Discard Changes?</h2>
            <p className="text-sm text-gray-700">
              This will permanently discard your unsaved changes.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setShowDiscardModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                No, Keep Working
              </button>
              <button
                onClick={() => {
                    if (JSON.stringify(lyrics) === JSON.stringify(originalLyrics)) {
                        setShowDiscardModal(false);
                        clearSelection();
                        setShowSavedModal({ type: "no-change-discard" });
                      } else {
                        clearSelection();
                        setShowDiscardModal(false);
                      }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                Yes, Discard
                </button>
            </div>
          </div>
        </div>
      )}
      <LanguageEditorModal
        isOpen={languageEditorOpen}
        onClose={() => setLanguageEditorOpen(false)}
        isMinimized={languageEditorMinimized}
        onToggleMinimize={() => setLanguageEditorMinimized(!languageEditorMinimized)}
      />

    </div>
  );
}