import { exportAllSlidesToPPT } from "../utils/exportAllSlidesToPPT";
import { exportSlideCanvasAsImage } from "../utils/exportSlideCanvasAsImage";
import axios from "axios";
const PRESENTATION_BASE = import.meta.env.VITE_PRESENTATION_API;

export function useExportHandlers(slideRefs, slides, presentationName, markSlideSaved, markSlideBackendSaved) {
  const exportAll = async () => {
    const images = [];
    for (let i = 0; i < slideRefs.current.length; i++) {
      const ref = slideRefs.current[i];
      if (ref?.current) {
        const dataUrl = await exportSlideCanvasAsImage(ref, `Slide-${i + 1}`, true);
        images.push(dataUrl);
      }
    }
    await exportAllSlidesToPPT(images, presentationName || "WorshipSlides");
  };

  const saveSlide = async (currentIndex) => {
    const ref = slideRefs.current[currentIndex];
    if (!ref?.current) return;

    try {
      const imageBase64 = await exportSlideCanvasAsImage(ref, `Slide-${currentIndex + 1}`, false);
      const base64Data = imageBase64.replace(/^data:image\/png;base64,/, "");
      const slide = slides[currentIndex];

      const payload = {
        randomId: slide.id,
        presentationName: presentationName || "MyPresentation",
        slideData: base64Data,
      };

      if (slide.savedToBackend) {
        await axios.put(`${PRESENTATION_BASE}/presentations/slide`, payload);
      } else {
        payload.slideOrder = currentIndex + 1;
        await axios.post(`${PRESENTATION_BASE}/presentations/slide`, payload);
        markSlideBackendSaved(currentIndex);
      }

      markSlideSaved(currentIndex);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  return { exportAll, saveSlide };
}