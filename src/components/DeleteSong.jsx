import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const DELETE_PASSWORD = import.meta.env.VITE_DELETE_PASSWORD;

const DeleteSong = ({ onSongDeleted }) => {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyrics, setLyrics] = useState(null);
  const [modal, setModal] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    axios
      .get(`${API_BASE}/songs`)
      .then((res) => setSongs(res.data))
      .catch((err) => console.error("Error loading songs:", err));
  }, []);

  useEffect(() => {
    if (modal && modal.type !== "confirm") {
      const timeout = setTimeout(() => setModal(null), 10000);
      return () => clearTimeout(timeout);
    }
  }, [modal]);

  const loadSong = (song) => {
    setSelectedSong(song);
    axios
      .get(`${API_BASE}/songs/${song.song_id}`)
      .then((res) => setLyrics(res.data))
      .catch((err) => console.error("Error loading lyrics:", err));
  };

  const handleDelete = async () => {
    if (passwordInput !== DELETE_PASSWORD) {
      setModal({ type: "error", message: "❌ Incorrect password." });
      return;
    }

    try {
      await axios.delete(`${API_BASE}/songs/${selectedSong.song_id}`);
      setModal({ type: "success", message: "✅ Song deleted successfully!" });
      setSelectedSong(null);
      setLyrics(null);
      setQuery("");
      setPasswordInput("");
      onSongDeleted?.();
    } catch (err) {
      console.error("Error deleting song:", err);
      setModal({ type: "error", message: "❌ Failed to delete the song." });
    }
  };

  return (
    <div className="space-y-6">
      <input
        type="text"
        placeholder="Search song to delete..."
        className="w-full border rounded px-4 py-2"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedSong(null);
          setLyrics(null);
        }}
      />

      {query && (
        <ul className="space-y-2">
          {songs
            .filter((s) =>
              s.song_name.toLowerCase().includes(query.toLowerCase())
            )
            .map((song) => (
              <li
                key={song.song_id}
                onClick={() => loadSong(song)}
                className="cursor-pointer p-2 bg-red-50 rounded hover:bg-red-100"
              >
                🗑️ {song.song_name}
              </li>
            ))}
        </ul>
      )}

      {lyrics && (
        <div className="bg-white border rounded p-4 space-y-4 shadow">
          <h2 className="text-lg font-semibold text-red-600">
            {lyrics.song_name}
          </h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-500">Telugu</p>
              {lyrics.main_stanza.telugu.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <div>
              <p className="font-medium text-gray-500">English</p>
              {lyrics.main_stanza.english.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          {lyrics.stanzas.map((stanza, idx) => (
            <div key={idx} className="text-sm">
              <h4 className="font-semibold text-gray-600 mt-4 mb-1">
                Stanza {idx + 1}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {stanza.telugu.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <div>
                  {stanza.english.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() =>
              setModal({
                type: "confirm",
                message: "Enter password to confirm deletion",
              })
            }
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mt-4"
          >
            Delete Song
          </button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm">
            <h2
              className={`text-lg font-semibold ${
                modal.type === "error"
                  ? "text-red-700"
                  : modal.type === "success"
                  ? "text-green-700"
                  : "text-yellow-700"
              }`}
            >
              {modal.type === "confirm"
                ? "Confirm Deletion"
                : modal.type === "success"
                ? "Deleted"
                : "Error"}
            </h2>
            <p className="text-sm text-gray-700">{modal.message}</p>

            {modal.type === "confirm" ? (
              <>
                <input
                  type="password"
                  placeholder="Enter password"
                  className="border rounded px-3 py-2 w-full"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={() => {
                      setModal(null);
                      setPasswordInput("");
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Confirm Delete
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setModal(null)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteSong;