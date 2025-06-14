import axios from "axios";
import React, { useRef, useEffect } from "react";

const PRESENTATION_BASE = import.meta.env.VITE_PRESENTATION_API;

export default function useSlideHandlers({ slides, currentIndex, slideOps, presentationName }) {
  const slideRefs = useRef([]);

  const {
    addSlide,
    setSlideLines,
    setSlideEditMode,
    markSlideSaved,
    deleteSlide, // ✅ FIXED: make sure this is destructured
  } = slideOps;

  useEffect(() => {
    slideRefs.current = slides.map((_, i) => slideRefs.current[i] || React.createRef());
  }, [slides]);

  const currentRef = slideRefs.current[currentIndex];
  const currentSlide = slides[currentIndex] || {};
  const editMode = currentSlide?.editMode || null;
  const unsaved = currentSlide?.unsaved || false;

  const updateSlideImage = async (captureSlideImage) => {
    if (slideRefs.current[currentIndex]) {
      captureSlideImage(slideRefs.current[currentIndex]);
    }
  };

  const handleDeleteSlide = async (index) => {
    const slide = slides[index];
    if (!presentationName || !slide?.id) {
      alert("Missing presentation name or slide ID.");
      return;
    }
  
    // ✅ Skip backend call if slide was never saved
    if (!slide.savedToBackend) {
      console.log("🗑️ Deleting unsaved slide locally (no backend call)");
      deleteSlide(index);
      return;
    }
  
    try {
      console.log("🗑️ Sending DELETE request for slide: ", slide.id);
      console.log("URL ->", `${import.meta.env.VITE_PRESENTATION_API}/presentations/slide/${presentationName}/${slide.id}`)
      await axios.delete(`${import.meta.env.VITE_PRESENTATION_API}/presentations/slide/${presentationName}/${slide.id}`);
      console.log("✅ Slide deleted from backend");
      deleteSlide(index);
    } catch (err) {
      console.error("❌ Failed to delete slide:", err);
      alert("Could not delete slide from the server.");
    }
  };

// inside useSlideHandlers.js
const addPsalmSlides = (slideLinesArray) => {
  slideLinesArray.forEach((lines) => {
    const index = addSlide(lines);
    setSlideEditMode(index, "stanza");
    markSlideSaved(index);
  });
};

  return {
    slideRefs,
    currentRef,
    editMode,
    unsaved,
    updateSlideImage,
    handleDeleteSlide,
    addPsalmSlides,
  };
}