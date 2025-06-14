import React, { useEffect, useState } from "react";
import axios from "axios";
import SlideCanvas from "./SlideCanvas";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const CreatePresentation = () => {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedObject, setSelectedObject] = useState(null);
  const [fontSizeOverride, setFontSizeOverride] = useState(null);

  // Fetch all songs on load
  useEffect(() => {
    axios.get(`${API_BASE}/songs`)
      .then(res => setSongs(res.data))
      .catch(console.error);
  }, []);

  // Fetch song details and prepare slides
  const fetchSongDetails = (song) => {
    axios.get(`${API_BASE}/songs/${song.song_id}`).then(res => {
      const { main_stanza, stanzas } = res.data;

      const newSlides = [];

      // First slide = main stanza
      newSlides.push({
        id: Date.now(),
        lines: [
          ...main_stanza.telugu.map(t => ({ type: "telugu", text: t })),
          ...main_stanza.english.map(t => ({ type: "english", text: t }))
        ]
      });

      // Remaining stanzas
      stanzas.forEach((stanza) => {
        newSlides.push({
          id: Date.now() + Math.random(),
          lines: [
            ...stanza.telugu.map(t => ({ type: "telugu", text: t })),
            ...stanza.english.map(t => ({ type: "english", text: t }))
          ]
        });
        newSlides.push({
          id: Date.now() + Math.random(),
          lines: [
            ...main_stanza.telugu.map(t => ({ type: "telugu", text: t })),
            ...main_stanza.english.map(t => ({ type: "english", text: t }))
          ]
        });
      });

      setSlides(newSlides);
      setSelectedSong(song);
      setCurrentSlide(0);
      setSelectedObject(null);
    });
  };

  // Scroll between slides with mouse wheel
  useEffect(() => {
    const handleWheel = (e) => {
      if (!slides.length) return;
      if (e.deltaY > 0 && currentSlide < slides.length - 1) {
        setCurrentSlide((prev) => prev + 1);
      } else if (e.deltaY < 0 && currentSlide > 0) {
        setCurrentSlide((prev) => prev - 1);
      }
    };
    window.addEventListener("wheel", handleWheel);
    return () => window.removeEventListener("wheel", handleWheel);
  }, [currentSlide, slides]);

  const changeFontSize = (delta) => {
    if (!selectedObject) return;
    const newSize = selectedObject.fontSize + delta;
    if (newSize < 10 || newSize > 100) return;

    setFontSizeOverride({ target: selectedObject, size: newSize });
  };

  return (
    <div className="w-screen h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* 🔍 Top Search Bar */}
      <div className="p-4 bg-white shadow z-10 flex flex-col gap-2">
        <input
          type="text"
          placeholder="Search for a song..."
          className="border rounded px-4 py-2 w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* 🔎 Search Results Dropdown */}
        {query.trim() && (
          <div className="max-h-[300px] overflow-y-auto w-full bg-white border rounded shadow">
            <ul>
              {songs
                .filter((s) => s.song_name.toLowerCase().includes(query.toLowerCase()))
                .map((song) => (
                  <li
                    key={song.song_id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      fetchSongDetails(song);
                      setQuery("");
                    }}
                  >
                    🎵 {song.song_name}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {/* 🖼️ Slide Preview Fullscreen */}
      <div className="flex-1 overflow-auto flex justify-center items-center bg-gray-200">
        {slides.length > 0 ? (
          <SlideCanvas
            slideData={slides[currentSlide].lines}
            onObjectSelected={setSelectedObject}
            fontSizeOverride={fontSizeOverride}
          />
        ) : (
          <p className="text-gray-500">Search & select a song to build slides.</p>
        )}
      </div>

      {/* 🛠️ Font Size Controls */}
      {selectedObject && (
        <div className="flex justify-center items-center py-3 bg-white shadow-inner gap-4">
          <span className="text-gray-700">Font Size: {selectedObject.fontSize}px</span>
          <button
            onClick={() => changeFontSize(-2)}
            className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
          >
            A-
          </button>
          <button
            onClick={() => changeFontSize(2)}
            className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
          >
            A+
          </button>
        </div>
      )}
    </div>
  );
};

export default CreatePresentation;