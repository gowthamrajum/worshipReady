import React, { useState } from "react";
import axios from "axios";
import {
  FiPlusCircle, FiPlus, FiEdit3, FiTrash, FiMove
} from "react-icons/fi";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const isEnglishText = (text) => /^[\x00-\x7F\s]+$/.test(text);

const AddSong = ({ onSongAdded }) => {
  const [songName, setSongName] = useState("");
  const [mainStanza, setMainStanza] = useState({ telugu: [""], english: [""] });
  const [stanzas, setStanzas] = useState([
    { stanza_number: 1, telugu: [""], english: [""] },
  ]);
  const [editingLines, setEditingLines] = useState({});
  const [lineDrafts, setLineDrafts] = useState({});
  const [modalState, setModalState] = useState(null);

  const updateMainLine = (lang, index, value) => {
    const updated = [...mainStanza[lang]];
    updated[index] = value;
    setMainStanza((prev) => ({ ...prev, [lang]: updated }));
  };

  const addMainLine = (lang) => {
    setMainStanza((prev) => ({
      ...prev,
      [lang]: [...prev[lang], ""],
    }));
  };

  const handleLineChange = (stanzaIndex, lang, lineIndex, value) => {
    const updated = [...stanzas];
    updated[stanzaIndex][lang][lineIndex] = value;
    setStanzas(updated);
  };

  const addLineToStanza = (stanzaIndex, lang) => {
    const updated = [...stanzas];
    updated[stanzaIndex][lang].push("");
    setStanzas(updated);
  };

  const deleteLine = (type, lang, stanzaIndex, lineIndex) => {
    if (type === "main") {
      const updated = [...mainStanza[lang]];
      updated.splice(lineIndex, 1);
      setMainStanza((prev) => ({ ...prev, [lang]: updated }));
    } else {
      const updatedStanzas = [...stanzas];
      updatedStanzas[stanzaIndex][lang].splice(lineIndex, 1);
      setStanzas(updatedStanzas);
    }
  };

  const startEdit = (key, value) => {
    setEditingLines((prev) => ({ ...prev, [key]: true }));
    setLineDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const saveEdit = (type, lang, stanzaIdx, lineIdx, key) => {
    const value = lineDrafts[key];
    if (type === "main") {
      updateMainLine(lang, lineIdx, value);
    } else {
      handleLineChange(stanzaIdx, lang, lineIdx, value);
    }
    setEditingLines((prev) => ({ ...prev, [key]: false }));
  };

  const handleAddStanza = () => {
    setStanzas([
      ...stanzas,
      { stanza_number: stanzas.length + 1, telugu: [""], english: [""] },
    ]);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = [...stanzas];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setStanzas(reordered);
  };

  const handleSubmit = async () => {
    const currentUser = sessionStorage.getItem("userName") || "System";
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  
    const payload = {
      song_name: songName.trim(),
      main_stanza: {
        telugu: mainStanza.telugu.filter(Boolean),
        english: mainStanza.english.filter(Boolean),
      },
      stanzas: stanzas.map((s, i) => ({
        stanza_number: i + 1,
        telugu: s.telugu.filter(Boolean),
        english: s.english.filter(Boolean),
      })),
      created_by: currentUser,
      last_updated_by: currentUser,
      created_at: now,
      last_updated_at: now
    };
  
    if (!isEnglishText(payload.song_name)) {
      setModalState({ type: "error", message: "⚠️ Song name must be in English only." });
      return;
    }
  
    const isEmptyPayload =
      !payload.song_name ||
      (payload.main_stanza.telugu.every((l) => l.trim() === "") &&
        payload.main_stanza.english.every((l) => l.trim() === "") &&
        payload.stanzas.every(
          (s) =>
            s.telugu.every((l) => l.trim() === "") &&
            s.english.every((l) => l.trim() === "")
        ));
  
    if (isEmptyPayload) {
      setModalState({ type: "error", message: "⚠️ No content to save. Song not added." });
      return;
    }
  
    try {
      await axios.post(`${API_BASE}/songs`, payload);
      setModalState({ type: "success", message: "🎉 Song added successfully!" });
      onSongAdded?.();
      setSongName("");
      setMainStanza({ telugu: [""], english: [""] });
      setStanzas([{ stanza_number: 1, telugu: [""], english: [""] }]);
    } catch (err) {
      setModalState({
        type: "error",
        message: "❌ Failed to add song. Please try again.",
      });
    }
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
                onChange={(e) =>
                  setLineDrafts({ ...lineDrafts, [key]: e.target.value })
                }
                className="flex-1 px-2 py-1 outline-none"
                autoFocus
              />
              <button onClick={() => saveEdit(type, lang, stanzaIdx, idx, key)}>
                <FiPlus className="text-green-600" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-gray-700">{line}</span>
              <button onClick={() => startEdit(key, line)}>
                <FiEdit3 className="text-indigo-500" />
              </button>
              <button onClick={() => deleteLine(type, lang, stanzaIdx, idx)}>
                <FiTrash className="text-red-500" />
              </button>
            </>
          )}
        </div>
      );
    });

  return (
    <div className="bg-white p-6 rounded shadow-md space-y-6">
      <h2 className="text-xl font-semibold text-indigo-700 flex items-center gap-2">
        <FiPlusCircle /> Add a New Song
      </h2>

      <input
        type="text"
        className="w-full border px-4 py-2 rounded"
        placeholder="Song Name (English only)"
        value={songName}
        onChange={(e) => setSongName(e.target.value)}
      />

      {/* Main Stanza */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Main Stanza</h3>
        <div className="grid grid-cols-2 gap-4">
          {["telugu", "english"].map((lang) => (
            <div key={lang}>
              <p className="text-sm text-gray-500 mb-1 capitalize">{lang}</p>
              {renderLines(mainStanza[lang], "main", lang)}
              <button
                className="text-sm text-indigo-600 mt-1"
                onClick={() => addMainLine(lang)}
              >
                + Add {lang} Line
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Reorderable Stanzas */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="stanzas">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
              {stanzas.map((stanza, idx) => (
                <Draggable key={idx} draggableId={`stanza-${idx}`} index={idx}>
                  {(draggable) => (
                    <div
                      {...draggable.draggableProps}
                      ref={draggable.innerRef}
                      className="border-t pt-4"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-gray-700">Stanza {idx + 1}</h4>
                        <div {...draggable.dragHandleProps}>
                          <FiMove className="text-gray-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {["telugu", "english"].map((lang) => (
                          <div key={lang}>
                            <p className="text-sm text-gray-500 mb-1 capitalize">{lang}</p>
                            {renderLines(stanza[lang], "stanza", lang, idx)}
                            <button
                              className="text-sm text-indigo-600 mt-1"
                              onClick={() => addLineToStanza(idx, lang)}
                            >
                              + Add {lang} Line
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button
        className="text-sm text-indigo-700 hover:underline mt-2"
        onClick={handleAddStanza}
      >
        + Add Another Stanza
      </button>

      <button
        onClick={handleSubmit}
        className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
      >
        Submit Song
      </button>

      {/* Modal */}
      {modalState && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm">
            <h2
              className={`text-lg font-semibold ${
                modalState.type === "success" ? "text-green-700" : "text-red-700"
              }`}
            >
              {modalState.type === "success" ? "Song Added" : "Something Went Wrong"}
            </h2>
            <p className="text-sm text-gray-700">{modalState.message}</p>
            <button
              onClick={() => setModalState(null)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddSong;