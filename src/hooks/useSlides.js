import { useState } from "react";
import html2canvas from "html2canvas";

const generateId = () =>
  `slide-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

const useSlides = () => {
  const [slides, setSlides] = useState([
    {
      id: generateId(),
      lines: [],
      editMode: null,
      unsaved: false,
      savedToBackend: false,
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideImages, setSlideImages] = useState([]);

  const currentSlide = slides[currentIndex];

  const addSlide = (initialLines = [], callback) => {
    const newSlide = {
      id: generateId(),
      lines: initialLines,
      editMode: null,
      unsaved: false,
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
    return slides.length; // or return updated.length - 1 if needed
  };

  const duplicateSlide = (index, callback) => {
    const copy = {
      ...slides[index],
      id: generateId(),
      lines: slides[index].lines.map((l) => ({ ...l })),
      editMode: null,
      unsaved: false,
      savedToBackend: false,
    };

    const updated = [...slides, copy];
    setSlides(updated);
    setCurrentIndex(updated.length - 1);
    setTimeout(() => callback?.(updated.length - 1, copy), 0);
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

  const setSlideLines = (index, newLines) => {
    setSlides((prev) =>
      prev.map((slide, i) =>
        i === index ? { ...slide, lines: newLines, unsaved: true } : slide
      )
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

  const clearSlides = () => {
    setSlides([
      {
        id: generateId(),
        lines: [],
        editMode: null,
        unsaved: false,
        savedToBackend: false,
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
    duplicateSlide,
    deleteSlide,
    reorderSlides,
    goToSlide,
    setSlideLines,
    setSlideEditMode,
    markSlideSaved,
    markSlideBackendSaved,
    captureSlideImage,
    slideImages,
    clearSlides,
    restoreSlides,
  };
};

export default useSlides;