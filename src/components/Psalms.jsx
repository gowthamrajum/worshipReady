import React, { useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Psalms() {
  const [mode, setMode] = useState("chapter");
  const [chapter, setChapter] = useState("");
  const [startVerse, setStartVerse] = useState("");
  const [endVerse, setEndVerse] = useState("");
  const [verses, setVerses] = useState([]);
  const [error, setError] = useState("");

  const fetchVerses = async () => {
    if (!chapter || isNaN(chapter)) {
      setError("Please enter a valid chapter number.");
      setVerses([]);
      return;
    }

    try {
      let res;

      if (mode === "chapter") {
        res = await axios.get(`${API_BASE}/psalms/${chapter}`);
      } else {
        if (!startVerse || !endVerse || isNaN(startVerse) || isNaN(endVerse)) {
          setError("Please enter a valid verse range.");
          setVerses([]);
          return;
        }

        if (parseInt(startVerse, 10) > parseInt(endVerse, 10)) {
          setError("Beginning verse must be less than or equal to ending verse.");
          setVerses([]);
          return;
        }

        res = await axios.get(
          `${API_BASE}/psalms/${chapter}/range?start=${startVerse}&end=${endVerse}`
        );
      }

      setVerses(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setVerses([]);
      setError("Verses not found or failed to load.");
    }
  };

  return (
    <div>
      {/* Book Title */}
      <h1 className="text-2xl font-bold mb-4 text-indigo-700">Book of Psalms</h1>

      {/* Selection Mode */}
      <div className="mb-4">
        <label className="mr-4">
          <input
            type="radio"
            name="mode"
            value="chapter"
            checked={mode === "chapter"}
            onChange={() => setMode("chapter")}
            className="mr-2"
          />
          Chapter
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            value="range"
            checked={mode === "range"}
            onChange={() => setMode("range")}
            className="mr-2"
          />
          Verse Range
        </label>
      </div>

      {/* Input Fields */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <input
          type="number"
          placeholder="Chapter"
          className="border px-4 py-2 rounded w-48"
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
        />

        {mode === "range" && (
          <>
            <input
              type="number"
              placeholder="Beginning Verse"
              className="border px-4 py-2 rounded w-48"
              value={startVerse}
              onChange={(e) => setStartVerse(e.target.value)}
            />
            <input
              type="number"
              placeholder="Ending Verse"
              className="border px-4 py-2 rounded w-48"
              value={endVerse}
              onChange={(e) => setEndVerse(e.target.value)}
            />
          </>
        )}

        <button
          onClick={fetchVerses}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Results */}
      {verses.length > 0 && (
        <div className="mt-4 space-y-4">
          <h2 className="text-xl font-bold text-indigo-700">
            Psalms Chapter {chapter} {mode === "range" && `(Verses ${startVerse}–${endVerse})`}
          </h2>

          {verses.map((verse) => (
            <div key={verse.id || `${verse.chapter}:${verse.verse}`} className="border border-gray-300 rounded p-4 bg-gray-50">
              <div className="text-sm text-gray-600 mb-1">
                Verse {verse.verse}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="text-gray-800 font-medium">{verse.telugu}</p>
                <p className="text-gray-700 italic">{verse.english}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
