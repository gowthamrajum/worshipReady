// src/components/Songs.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiSearch, FiPlus } from "react-icons/fi";
import AddSong from "./AddSong";
import SongTable from "./SongTable";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Songs() {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Search");
  const [modalOpen, setModalOpen] = useState(false);
  const [previewSong, setPreviewSong] = useState(null);

  const fetchSongs = () => {
    axios
      .get(`${API_BASE}/songs`)
      .then((res) => setSongs(res.data))
      .catch((err) => console.error("Error fetching songs:", err));
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  const handlePreview = (songId) => {
    axios
      .get(`${API_BASE}/songs/${songId}`)
      .then((res) => {
        setPreviewSong(res.data);
        setModalOpen(true);
      })
      .catch((err) => console.error("Error loading song preview:", err));
  };

  const closeModal = () => {
    setModalOpen(false);
    setPreviewSong(null);
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Tabs */}
      <div className="flex space-x-4 border-b pb-2">
        {["Search", "Add"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-md font-medium ${
              activeTab === tab
                ? "bg-indigo-200 text-indigo-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab === "Search" && <FiSearch />}
            {tab === "Add" && <FiPlus />}
            {tab}
          </button>
        ))}
      </div>

      {/* Search Tab */}
      {activeTab === "Search" && (
        <>
          <input
            type="text"
            placeholder="Search for a song..."
            className="w-full border rounded px-4 py-2 mt-2 focus:outline-none focus:ring"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SongTable
            songs={songs}
            query={query}
            onPreview={handlePreview}
            fetchSongs={fetchSongs}
          />
        </>
      )}

      {/* Add Song */}
      {activeTab === "Add" && <AddSong onSongAdded={fetchSongs} />}

      {/* Preview Modal */}
      {modalOpen && previewSong && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-3xl w-full overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4">
              {previewSong.song_name}
            </h2>

            {/* Main Stanza */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-600">
                Main Stanza
              </h3>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="font-medium text-sm text-gray-500">Telugu</p>
                  {previewSong.main_stanza.telugu.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-500">English</p>
                  {previewSong.main_stanza.english.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Stanzas */}
            {previewSong.stanzas.map((stanza, index) => (
              <div key={index} className="mb-6">
                <h4 className="text-md font-semibold mb-2">
                  Stanza {index + 1}
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

            {/* Close Button */}
            <div className="text-right mt-6">
              <button
                onClick={closeModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}