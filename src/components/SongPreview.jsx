import React, { useState, useEffect } from "react";
import axios from "axios";
import { FiChevronDown } from "react-icons/fi";
import { HiMusicNote, HiOutlineDocumentText } from "react-icons/hi";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const SongPreview = ({ dragMode }) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyrics, setLyrics] = useState([]);
  const [expandedStanzas, setExpandedStanzas] = useState({});

  useEffect(() => {
    axios
      .get(`${API_BASE}/songs`)
      .then((res) => setSongs(res.data))
      .catch((err) => console.error("Error fetching songs:", err));
  }, []);

  const fetchLyrics = async (song) => {
    try {
      const res = await axios.get(`${API_BASE}/songs/${song.song_id}`);
      const { main_stanza, stanzas } = res.data;

      const allLyrics = [
        {
          id: `main`,
          label: `Main Stanza: ${main_stanza.english?.[0] || "Untitled"}`,
          telugu: main_stanza.telugu ?? [],
          english: main_stanza.english ?? [],
        },
        ...stanzas.map((s, i) => ({
          id: `stanza-${i + 1}`,
          label: s.english?.[0] || `Stanza ${i + 1}`,
          telugu: s.telugu ?? [],
          english: s.english ?? [],
        })),
      ];

      setSelectedSong(song);
      setLyrics(allLyrics);
      setExpandedStanzas({});
    } catch (err) {
      console.error("Failed to load lyrics:", err);
    }
  };

  const toggleStanza = (id) => {
    setExpandedStanzas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const clearSelection = () => {
    setSelectedSong(null);
    setLyrics([]);
    setQuery("");
    setExpandedStanzas({});
  };

  const filteredSongs = songs.filter((s) =>
    s.song_name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="border rounded bg-white shadow">
      <div
        className="flex justify-between items-center bg-yellow-100 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-yellow-700 inline-flex items-center gap-2">
          <HiMusicNote size={20} />
          Song Preview
        </h3>
        <FiChevronDown
          className={`transition-transform duration-300 text-yellow-700 ${
            expanded ? "rotate-180" : ""
          }`}
          size={20}
        />
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? "opacity-100 py-4" : "max-h-0 opacity-0 py-0"
        } px-4 space-y-4`}
      >
        <input
          type="text"
          placeholder="Search for a song..."
          className="w-full border rounded px-4 py-2 focus:outline-none focus:ring"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedSong(null);
            setLyrics([]);
          }}
        />

        {query && !selectedSong && (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {filteredSongs.map((song) => (
              <li
                key={song.song_id}
                onClick={() => fetchLyrics(song)}
                className="cursor-pointer p-2 bg-indigo-50 rounded hover:bg-indigo-100 flex items-center gap-2"
              >
                <HiMusicNote className="text-indigo-700" size={18} />
                {song.song_name}
              </li>
            ))}
          </ul>
        )}

        {selectedSong && lyrics.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800 inline-flex items-center gap-2">
                <HiOutlineDocumentText size={18} />
                {selectedSong.song_name}
              </h4>
              <button
                onClick={clearSelection}
                className="text-red-500 text-sm underline"
              >
                Clear
              </button>
            </div>

            {lyrics.map((stanza) => {
              const allLines = [...stanza.telugu, ...stanza.english];
              return (
                <div
                  key={stanza.id}
                  className="border rounded shadow-sm"
                  draggable={dragMode === "stanza"}
                  onDragStart={(e) => {
                    if (dragMode === "stanza") {
                      e.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({
                          type: "stanza",
                          label: stanza.label,
                          lines: allLines,
                          breakIndex: stanza.telugu.length,
                        })
                      );
                    }
                  }}
                >
                  <div
                    className="flex justify-between items-center bg-gray-100 px-3 py-2 cursor-pointer"
                    onClick={() => toggleStanza(stanza.id)}
                  >
                    <span className="font-semibold text-gray-700 text-sm">
                      {stanza.label}
                    </span>
                    <FiChevronDown
                      className={`transition-transform duration-300 text-gray-600 ${
                        expandedStanzas[stanza.id] ? "rotate-180" : ""
                      }`}
                      size={18}
                    />
                  </div>

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden px-3 ${
                      expandedStanzas[stanza.id]
                        ? "max-h-[1000px] opacity-100 py-2"
                        : "max-h-0 opacity-0 py-0"
                    }`}
                  >
                    {dragMode === "line" ? (
                      <>
                        {stanza.telugu.map((line, j) => (
                          <div
                            key={`telugu-${j}`}
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData(
                                "text/plain",
                                JSON.stringify({ type: "line", text: line })
                              )
                            }
                            className="p-2 border rounded bg-white hover:bg-blue-100 cursor-move mt-1"
                          >
                            {line}
                          </div>
                        ))}
                        <div className="my-2" />
                        {stanza.english.map((line, j) => (
                          <div
                            key={`english-${j}`}
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData(
                                "text/plain",
                                JSON.stringify({ type: "line", text: line })
                              )
                            }
                            className="p-2 border rounded bg-white hover:bg-blue-100 cursor-move mt-1"
                          >
                            {line}
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="p-2 bg-green-100 rounded text-sm space-y-1">
                        {stanza.telugu.map((line, j) => (
                          <div key={`tel-${j}`}>{line}</div>
                        ))}
                        <div className="my-2" />
                        {stanza.english.map((line, j) => (
                          <div key={`eng-${j}`}>{line}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SongPreview;