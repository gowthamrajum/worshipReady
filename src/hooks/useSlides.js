import { useState } from "react";
import html2canvas from "html2canvas";

const generateId = () =>
  `slide-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

const useSlides = () => {
  const [slides, setSlides] = useState([
    {
      id: generateId(),
      lines: [],
      editMode: null,
      unsaved: false,
      savedToBackend: false,
      backgroundColor: "#4b5c47",
      backgroundImage: null,
      backgroundTheme: null,
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideImages, setSlideImages] = useState([]);

  const currentSlide = slides[currentIndex];

  const addSlide = (initialLines = [], callback) => {
    const cur = slides[currentIndex];
    const newSlide = {
      id: generateId(),
      lines: initialLines,
      editMode: null,
      unsaved: false,
      backgroundColor: cur?.backgroundColor || "#4b5c47",
      backgroundImage: cur?.backgroundImage || null,
      backgroundTheme: cur?.backgroundTheme || null,
      savedToBackend: false,
    };

    setSlides((prev) => {
      const updated = [...prev, newSlide];
      setTimeout(() => {
        if (typeof callback === "function") callback(updated.length - 1);
      }, 0);
      return updated;
    });

    setCurrentIndex((prev) => prev + 1);
    // Removed stale return value — callers must use the callback for the real index.
  };

  // Adds multiple slides at once in a single state update, each with editMode "stanza".
  // Inserts them immediately AFTER the current slide (not at the end) so new slides
  // appear in context rather than at the far right of the slide strip.
  // Returns the array of newly-created slide IDs so the caller can track the batch for undo.
  const addMultipleSlides = (slideLinesArray) => {
    if (!slideLinesArray.length) return [];
    const insertAt = currentIndex + 1;
    // Generate IDs before the state updater so we can return them synchronously.
    const cur = slides[currentIndex];
    const newSlides = slideLinesArray.map((lines) => ({
      id: generateId(),
      lines,
      editMode: "stanza",
      unsaved: false,
      savedToBackend: false,
      backgroundColor: cur?.backgroundColor || "#4b5c47",
      backgroundImage: cur?.backgroundImage || null,
      backgroundTheme: cur?.backgroundTheme || null,
    }));
    setSlides((prev) => {
      const updated = [...prev];
      updated.splice(insertAt, 0, ...newSlides);
      return updated;
    });
    setCurrentIndex(insertAt);
    return newSlides.map((s) => s.id);
  };

  // Adds multiple slides at the END of the list (used by workflow auto-inserts
  // so they always append regardless of which slide the user is viewing).
  const addMultipleSlidesAtEnd = (slideLinesArray) => {
    if (!slideLinesArray.length) return [];
    const cur = slides[slides.length - 1] || slides[currentIndex];
    const newSlides = slideLinesArray.map((lines) => ({
      id: generateId(),
      lines,
      editMode: "stanza",
      unsaved: false,
      savedToBackend: false,
      backgroundColor: cur?.backgroundColor || "#4b5c47",
      backgroundImage: cur?.backgroundImage || null,
      backgroundTheme: cur?.backgroundTheme || null,
    }));
    const endIndex = slides.length; // index of first new slide after append
    setSlides((prev) => [...prev, ...newSlides]);
    setCurrentIndex(endIndex);
    return newSlides.map((s) => s.id);
  };

  // Removes slides by their IDs — used to undo a batch "Move My Selection" that may
  // have been inserted in the middle of the list (not necessarily at the end).
  const removeSlidesByIds = (ids) => {
    if (!ids?.length) return;
    setSlides((prev) => {
      const filtered = prev.filter((s) => !ids.includes(s.id));
      if (filtered.length === 0) {
        return [{ id: generateId(), lines: [], editMode: null, unsaved: false, savedToBackend: false }];
      }
      return filtered;
    });
    setCurrentIndex((prev) => Math.max(0, prev - ids.length));
  };

  const duplicateSlide = (index, callback, { position = "next" } = {}) => {
    const copy = {
      ...slides[index],
      id: generateId(),
      lines: slides[index].lines.map((l) => ({ ...l })),
      editMode: null,
      unsaved: false,
      savedToBackend: false,
    };

    const insertAt = position === "end" ? slides.length : index + 1;
    setSlides((prev) => {
      const updated = [...prev];
      updated.splice(insertAt, 0, copy);
      return updated;
    });
    setCurrentIndex(insertAt);
    setTimeout(() => callback?.(insertAt, copy), 0);
  };

  const deleteSlide = (index) => {
    const updated = [...slides];
    updated.splice(index, 1);

    if (updated.length === 0) {
      updated.push({
        id: generateId(),
        lines: [],
        editMode: null,
        unsaved: false,
        savedToBackend: false,
      });
      setCurrentIndex(0);
    } else if (currentIndex >= updated.length) {
      setCurrentIndex(updated.length - 1);
    }

    setSlides(updated);
  };

  const reorderSlides = (from, to) => {
    setSlides((prevSlides) => {
      const updated = [...prevSlides];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });

    setCurrentIndex(to);
  };

  // Move a group of slides (sorted indices) so they land at targetIndex.
  const reorderMultipleSlides = (sortedIndices, targetIndex) => {
    const selectedSet = new Set(sortedIndices);
    setSlides((prev) => {
      const selected = sortedIndices.map((i) => prev[i]);
      const remaining = prev.filter((_, i) => !selectedSet.has(i));
      // Each selected slide removed before targetIndex shifts it left by 1.
      const removedBefore = sortedIndices.filter((i) => i < targetIndex).length;
      const insertAt = Math.min(remaining.length, Math.max(0, targetIndex - removedBefore));
      const result = [...remaining];
      result.splice(insertAt, 0, ...selected);
      return result;
    });
    const removedBefore = sortedIndices.filter((i) => i < targetIndex).length;
    setCurrentIndex(Math.max(0, targetIndex - removedBefore));
  };

  const setSlideLines = (index, newLines) => {
    setSlides((prev) =>
      prev.map((slide, i) =>
        i === index ? { ...slide, lines: newLines, unsaved: true } : slide
      )
    );
  };

  const setSlideBackground = (index, { backgroundColor, backgroundImage, backgroundTheme } = {}) => {
    setSlides((prev) =>
      prev.map((slide, i) => {
        if (i !== index) return slide;
        const updated = { ...slide };
        if (backgroundColor  !== undefined) updated.backgroundColor  = backgroundColor;
        if (backgroundImage  !== undefined) updated.backgroundImage  = backgroundImage;
        if (backgroundTheme  !== undefined) updated.backgroundTheme  = backgroundTheme;
        return updated;
      })
    );
  };

  const setAllSlidesBackground = (props) => {
    setSlides((prev) =>
      prev.map((slide) => {
        const updated = { ...slide };
        if (props.backgroundColor  !== undefined) updated.backgroundColor  = props.backgroundColor;
        if (props.backgroundImage  !== undefined) updated.backgroundImage  = props.backgroundImage;
        if (props.backgroundTheme  !== undefined) updated.backgroundTheme  = props.backgroundTheme;
        return updated;
      })
    );
  };

  const resetAllBackgrounds = () => {
    setSlides((prev) =>
      prev.map((slide) => ({
        ...slide,
        backgroundColor: "#4b5c47",
        backgroundImage: null,
        backgroundTheme: null,
      }))
    );
  };

  const setSlideEditMode = (index, mode) => {
    setSlides((prev) =>
      prev.map((slide, i) =>
        i === index ? { ...slide, editMode: mode } : slide
      )
    );
  };

  const markSlideSaved = (index) => {
    setSlides((prev) =>
      prev.map((slide, i) =>
        i === index ? { ...slide, unsaved: false, editMode: null } : slide
      )
    );
  };

  const markSlideBackendSaved = (index) => {
    setSlides((prev) =>
      prev.map((slide, i) =>
        i === index ? { ...slide, savedToBackend: true } : slide
      )
    );
  };

  const goToSlide = (index) => {
    if (index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  };

  const captureSlideImage = async (canvasRef) => {
    if (!canvasRef?.current) return;
    try {
      const clone = canvasRef.current.cloneNode(true);
      // Strip any CSS scale transform so html2canvas captures the full 960×540
      // logical canvas, not the visually-shrunk version.
      clone.style.transform = "none";
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = `${canvasRef.current.offsetWidth}px`;
      container.style.height = `${canvasRef.current.offsetHeight}px`;
      container.style.backgroundColor =
        window.getComputedStyle(canvasRef.current).backgroundColor || "#fff";

      container.appendChild(clone);
      document.body.appendChild(container);

      const boundaryEls = clone.querySelectorAll(
        ".border-yellow-300, .outline, .ring"
      );
      boundaryEls.forEach((el) => {
        el.style.border = "none";
        el.style.outline = "none";
        el.style.boxShadow = "none";
      });

      await new Promise((r) => setTimeout(r, 300));

      const canvasImage = await html2canvas(clone, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });

      const dataUrl = canvasImage.toDataURL("image/png");

      setSlideImages((prev) => {
        const updated = [...prev];
        updated[currentIndex] = dataUrl;
        return updated;
      });

      document.body.removeChild(container);
    } catch (err) {
      console.error("Capture failed:", err);
    }
  };

  /**
   * Removes the last `n` slides that were added (used to undo a batch "Move My
   * Selection" operation).  Always keeps at least one empty slide.
   */
  const removeLastNSlides = (n) => {
    if (!n || n <= 0) return;
    setSlides((prev) => {
      const trimmed = prev.slice(0, Math.max(0, prev.length - n));
      if (trimmed.length === 0) {
        return [{ id: generateId(), lines: [], editMode: null, unsaved: false, savedToBackend: false }];
      }
      return trimmed;
    });
    setCurrentIndex((prev) => Math.max(0, prev - n));
  };

  const clearSlides = () => {
    setSlides([
      {
        id: generateId(),
        lines: [],
        editMode: null,
        unsaved: false,
        savedToBackend: false,
        backgroundColor: "#4b5c47",
        backgroundImage: null,
        backgroundTheme: null,
      },
    ]);
    setCurrentIndex(0);
    setSlideImages([]);
  };

  const restoreSlides = (loadedSlides = [], index = 0) => {
    setSlides(loadedSlides);
    setCurrentIndex(index);
  };

  return {
    slides,
    currentIndex,
    currentSlide,
    addSlide,
    addMultipleSlides,
    addMultipleSlidesAtEnd,
    duplicateSlide,
    deleteSlide,
    reorderSlides,
    reorderMultipleSlides,
    goToSlide,
    setSlideLines,
    setSlideBackground,
    setAllSlidesBackground,
    resetAllBackgrounds,
    setSlideEditMode,
    markSlideSaved,
    markSlideBackendSaved,
    captureSlideImage,
    slideImages,
    clearSlides,
    restoreSlides,
    removeLastNSlides,
    removeSlidesByIds,
  };
};

export default useSlides;
