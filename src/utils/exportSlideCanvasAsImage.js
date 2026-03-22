import pptxgen from "pptxgenjs";
import html2canvas from "html2canvas";

/**
 * Exports the slide canvas as a base64 image, or optionally adds it to a PowerPoint and downloads it.
 *
 * @param {RefObject} canvasRef - React ref to the canvas DOM node.
 * @param {string} title - Title used for the PPT file or image label.
 * @param {boolean} download - Whether to generate and download the PPT or just return base64.
 * @returns {Promise<string>} - The base64 data URL of the slide image.
 */
export async function exportSlideCanvasAsImage(canvasRef, title = "Worship Slide", download = true) {
  if (!canvasRef?.current) {
    alert("Canvas not ready!");
    return "";
  }

  try {
    // STEP 1: Clean up selection highlights
    const selectedEls = canvasRef.current.querySelectorAll(".border-yellow-300, .outline, .ring");
    const previousStyles = [];

    selectedEls.forEach((el) => {
      previousStyles.push({
        el,
        border: el.style.border,
        outline: el.style.outline,
        boxShadow: el.style.boxShadow,
      });
      el.style.border = "none";
      el.style.outline = "none";
      el.style.boxShadow = "none";
    });

    // STEP 2: Screenshot the canvas
    const canvasImage = await html2canvas(canvasRef.current, {
      backgroundColor: null,
      scale: 2,
    });

    const dataUrl = canvasImage.toDataURL("image/png");

    // STEP 3: Restore original styles
    previousStyles.forEach(({ el, border, outline, boxShadow }) => {
      el.style.border = border;
      el.style.outline = outline;
      el.style.boxShadow = boxShadow;
    });

    // STEP 4: If requested, download as PowerPoint
    if (download) {
      const pptx = new pptxgen();
      const slide = pptx.addSlide();

      slide.addImage({
        data: dataUrl,
        x: 0,
        y: 0,
        w: 10,
        h: 5.625,
      });

      await pptx.writeFile(`${title}.pptx`);
    }

    // Return the base64 image string either way
    return dataUrl;
  } catch (err) {
    console.error("❌ PPT Export Failed", err);
    alert("Export failed. See console.");
    return "";
  }
}