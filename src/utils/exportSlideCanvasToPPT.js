import pptxgen from "pptxgenjs";
import html2canvas from "html2canvas";

export async function exportSlideCanvasAsImage(canvasRef, title = "Worship Slide") {
  if (!canvasRef?.current) return alert("Canvas not ready!");

  try {
    // STEP 1: Remove any selection borders, outlines, or shadows
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

    // STEP 2: Take clean screenshot
    const canvasImage = await html2canvas(canvasRef.current, {
      backgroundColor: null,
      scale: 2,
    });

    const dataUrl = canvasImage.toDataURL("image/png");

    // STEP 3: Restore previous styles
    previousStyles.forEach(({ el, border, outline, boxShadow }) => {
      el.style.border = border;
      el.style.outline = outline;
      el.style.boxShadow = boxShadow;
    });

    // STEP 4: Add image to PowerPoint
    const pptx = new pptxgen();
    const slide = pptx.addSlide();

    slide.addImage({
      data: dataUrl,
      x: 0,
      y: 0,
      w: 10,      // Full slide width
      h: 5.625,   // 16:9 slide ratio
    });

    await pptx.writeFile(`${title}.pptx`);
  } catch (err) {
    console.error("❌ PPT Export Failed", err);
    alert("Export failed. See console.");
  }
}