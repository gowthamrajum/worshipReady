import axios from "axios";
import React, { useRef, useEffect } from "react";

export default function useSlideHandlers({ slides, currentIndex, slideOps, presentationName }) {
  const slideRefs = useRef([]);

  const {
    addMultipleSlides,
    setSlideLines,
    setSlideEditMode,
    markSlideSaved,
    deleteSlide,
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

    // Skip backend call if slide was never saved to backend
    if (!slide.savedToBackend) {
      console.log("Deleting unsaved slide locally (no backend call)");
      deleteSlide(index);
      return;
    }

    try {
      await axios.delete(
        `${import.meta.env.VITE_PRESENTATION_API}/presentations/slide/${presentationName}/${slide.id}`
      );
      console.log("Slide deleted from backend");
      deleteSlide(index);
    } catch (err) {
      console.error("Failed to delete slide:", err);
      alert("Could not delete slide from the server.");
    }
  };

  // Uses addMultipleSlides to batch-add all slides in a single state update,
  // avoiding the stale-index bug that occurred when addSlide was called in a loop.
  const addPsalmSlides = (slideLinesArray) => {
    addMultipleSlides(slideLinesArray);
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
