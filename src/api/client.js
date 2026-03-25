import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE_URL;
export const PRES_API = import.meta.env.VITE_PRESENTATION_API;
export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
export const DELETE_PASSWORD = import.meta.env.VITE_DELETE_PASSWORD;

// Songs
export const fetchSongs          = ()       => axios.get(`${API_BASE}/songs`);
export const fetchSongList       = (page = 1, limit = 20, search = "") =>
  axios.get(`${API_BASE}/songs/list`, { params: { page, limit, search } });
export const fetchSong           = (id)     => axios.get(`${API_BASE}/songs/${id}`);
export const createSong          = (data, headers = {}) => axios.post(`${API_BASE}/songs`, data, { headers });
export const updateSong          = (id, data) => axios.put(`${API_BASE}/songs/${id}`, data);
export const deleteSong          = (id)     => axios.delete(`${API_BASE}/songs/${id}`);
export const parseLyricsAI       = (rawLyrics, headers = {}) => axios.post(`${API_BASE}/songs/parse-lyrics`, { rawLyrics }, { headers });

// Psalms
export const fetchPsalmChapter   = (ch)     => axios.get(`${API_BASE}/psalms/${ch}`);
export const fetchPsalmRange     = (ch, start, end) => axios.get(`${API_BASE}/psalms/${ch}/range?start=${start}&end=${end}`);

// Presentations
export const createPresentation  = (name, dateTime) =>
  fetch(`${PRES_API}/presentations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presentationName: name, createdDateTime: dateTime }),
  });

export const saveSlideToBackend  = (payload) => axios.post(`${PRES_API}/presentations/slide`, payload);
export const updateSlideOnBackend = (payload) => axios.put(`${PRES_API}/presentations/slide`, payload);
export const deleteSlideFromBackend = (presName, slideId) =>
  axios.delete(`${PRES_API}/presentations/slide/${presName}/${slideId}`);

export const deleteAllSlidesForPresentation = async (presName, slides) => {
  const backendSlides = slides.filter((s) => s.savedToBackend && s.id);
  await Promise.allSettled(
    backendSlides.map((s) => deleteSlideFromBackend(presName, s.id))
  );
};

export const updateSlideOrder    = (presName, slideId, order) =>
  fetch(`${PRES_API}/presentations/update-order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presentationName: presName, randomId: slideId, slideOrder: order }),
  });

// Health / Keep-alive
export const ping = () => fetch(`${API_BASE}/ping`);
