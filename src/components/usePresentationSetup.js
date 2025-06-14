import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function usePresentationSetup() {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyrics, setLyrics] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/songs`)
      .then((res) => setSongs(res.data))
      .catch((err) => console.error("Error fetching songs:", err));
  }, []);

  const fetchLyrics = (song) => {
    axios.get(`${API_BASE}/songs/${song.song_id}`).then((res) => {
      const { main_stanza, stanzas } = res.data;
      const allLyrics = [
        { label: "Main Stanza", lines: [...main_stanza.telugu, ...main_stanza.english] },
        ...stanzas.map((s, i) => ({
          label: `Stanza ${i + 1}`,
          lines: [...s.telugu, ...s.english],
        })),
      ];
      setLyrics(allLyrics);
      setSelectedSong(song);
    });
  };

  return { songs, query, setQuery, lyrics, fetchLyrics, selectedSong };
}