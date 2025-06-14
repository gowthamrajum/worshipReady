import React, { useState } from "react";
import axios from "axios";
import { FiChevronDown, FiX, FiCopy } from "react-icons/fi";
import { HiOutlineBookOpen, HiOutlineSearch } from "react-icons/hi";
import { layoutVersesForSlide } from "../utils/psalmSlideBuilder";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const PsalmsPreview = ({ dragMode, onAddPsalmSlides }) => {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState("chapter");
  const [chapter, setChapter] = useState("");
  const [startVerse, setStartVerse] = useState("");
  const [endVerse, setEndVerse] = useState("");
  const [verses, setVerses] = useState([]);
  const [error, setError] = useState("");

  const clearInputs = () => {
    setChapter("");
    setStartVerse("");
    setEndVerse("");
    setVerses([]);
    setError("");
  };

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

        res = await axios.get(
          `${API_BASE}/psalms/${chapter}/range?start=${startVerse}&end=${endVerse}`
        );
      }

      setVerses(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setVerses([]);
      setError("Verse(s) not found or failed to load.");
    }
  };

  return (
    <div className="border rounded bg-white shadow">
      <div
        className="flex justify-between items-center bg-indigo-100 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <h3 className="font-semibold text-indigo-700 inline-flex items-center gap-2">
          <HiOutlineBookOpen size={20} />
          Psalms Preview
        </h3>
        <FiChevronDown
          className={`transition-transform duration-300 text-indigo-700 ${
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
        {/* MODE SELECT */}
        <div className="space-x-4">
          <label>
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

        {/* INPUT FIELDS */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            type="number"
            placeholder="Chapter"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          />
          {mode === "range" && (
            <>
              <input
                type="number"
                placeholder="Start Verse"
                value={startVerse}
                onChange={(e) => setStartVerse(e.target.value)}
                className="border px-3 py-2 rounded w-full"
              />
              <input
                type="number"
                placeholder="End Verse"
                value={endVerse}
                onChange={(e) => setEndVerse(e.target.value)}
                className="border px-3 py-2 rounded w-full"
              />
            </>
          )}

          {/* BUTTONS ROW */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchVerses}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              <HiOutlineSearch size={18} />
              Fetch
            </button>

            {verses.length > 0 && (
              <>
                <button
                  onClick={clearInputs}
                  className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  <FiX size={18} />
                  Clear
                </button>

                <button
                  onClick={() => {
                    const layout = layoutVersesForSlide(verses);
                    console.log("🧠 Auto-layout applied:", layout);
                    onAddPsalmSlides(layout);
                  }}
                  className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  <FiCopy size={18} />
                  Copy
                </button>
              </>
            )}
          </div>
        </div>

        {/* ERROR */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* VERSE PREVIEW */}
        {verses.length > 0 && (
          <div className="space-y-2 mt-4">
            {verses.map((v) => (
              <div
                key={v.verse}
                className="border rounded p-2 bg-gray-50 text-sm shadow"
              >
                <p className="font-medium text-gray-700">{v.verse}. {v.telugu}</p>
                <p className="italic text-gray-600">{v.verse}. {v.english}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PsalmsPreview;