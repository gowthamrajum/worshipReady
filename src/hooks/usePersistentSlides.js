import { useState, useEffect } from "react";

const STORAGE_KEY = "slide_composer_session";

export default function usePersistentSlides(initialSlides = []) {
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [presentationName, setPresentationName] = useState("");

  // Load from localStorage on first mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.slides) setSlides(parsed.slides);
        if (parsed.currentIndex != null) setCurrentIndex(parsed.currentIndex);
        if (parsed.presentationName) setPresentationName(parsed.presentationName);
      } else {
        setSlides(initialSlides);
      }
    } catch (err) {
      console.warn("usePersistentSlides: failed to restore from localStorage:", err);
      setSlides(initialSlides);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    const session = {
      slides,
      currentIndex,
      presentationName,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [slides, currentIndex, presentationName]);

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSlides(initialSlides);
    setCurrentIndex(0);
    setPresentationName("");
  };

  return {
    slides,
    setSlides,
    currentIndex,
    setCurrentIndex,
    presentationName,
    setPresentationName,
    clearSession,
  };
}
