// components/SongSelector.jsx
import React, { useState } from "react";

const SongSelector = ({ songs, query, setQuery, onSongSelect }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);

  const handleSelect = (song) => {
    setSelectedSong(song);
    onSongSelect(song);
    setQuery(song.song_name);
    setIsFocused(false);
  };

  const clearSelection = () => {
    setSelectedSong(null);
    setQuery("");
  };

  const filteredSongs = songs.filter((song) =>
    song.song_name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="w-full relative">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="w-full mb-2 p-2 border rounded"
          placeholder="Search for a song..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          disabled={!!selectedSong}
        />
        {selectedSong && (
          <button
            onClick={clearSelection}
            className="text-red-600 font-bold text-xl"
            title="Clear selection"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown only when typing and no selection */}
      {isFocused && !selectedSong && query.trim() !== "" && (
        <ul className="absolute z-10 bg-white border rounded shadow max-h-64 overflow-y-auto w-full">
          {filteredSongs.length === 0 ? (
            <li className="p-2 text-gray-500">No results found</li>
          ) : (
            filteredSongs.map((song) => (
              <li
                key={song.song_id}
                onClick={() => handleSelect(song)}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                🎵 {song.song_name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default SongSelector;