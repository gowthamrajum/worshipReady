import { exportAllSlidesToPPT } from "../utils/exportAllSlidesToPPT";
import { exportSlideCanvasAsImage } from "../utils/exportSlideCanvasAsImage";
import { saveSlideToBackend, updateSlideOnBackend } from "../api/client";

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

      payload.slideOrder = currentIndex + 1;

      if (slide.savedToBackend) {
        // Try update first; if slide was cleaned up, re-insert
        try {
          await updateSlideOnBackend(payload);
        } catch (putErr) {
          if (putErr.response?.status === 404) {
            await saveSlideToBackend(payload);
          } else {
            throw putErr;
          }
        }
      } else {
        // Try insert; if randomId already exists (duplicate), update instead
        try {
          await saveSlideToBackend(payload);
        } catch (postErr) {
          if (postErr.response?.status === 500 && postErr.response?.data?.includes?.("UNIQUE")) {
            await updateSlideOnBackend(payload);
          } else {
            throw postErr;
          }
        }
        markSlideBackendSaved(currentIndex);
      }

      markSlideSaved(currentIndex);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  return { exportAll, saveSlide };
}