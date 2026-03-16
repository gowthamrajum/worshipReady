import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";

// Helper to sanitize file names (replaces illegal characters like /, \, :, etc.)
function sanitizeFilename(name) {
  return name.replace(/[\/\\:*?"<>|]/g, "_");
}

// Canvas dimensions (must match CanvasEditor)
const CANVAS_W = 960;
const CANVAS_H = 540;
// PPTX slide dimensions in inches (16:9 WIDE layout)
const PPT_W = 10;
const PPT_H = 5.625;
// Canvas background colour (matches CanvasEditor)
const CANVAS_BG_CSS  = "#4b5c47";
const CANVAS_BG_PPTX = "4b5c47";

/**
 * Renders a single slide's lines to an offscreen HTML5 Canvas and returns a
 * base64 PNG data URL.  This approach:
 *  • Never requires the slide to be visible in the DOM
 *  • Always produces a full 960×540 image regardless of any CSS scale
 *  • Preserves exact font size, position, and colour as seen in the editor
 */
async function renderSlideToImage(lines = []) {
  // Ensure the Anek Telugu font is loaded before drawing
  try {
    await document.fonts.load("bold 20px 'Anek Telugu', sans-serif");
  } catch { /* non-browser — ignore */ }

  const canvas = document.createElement("canvas");
  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = CANVAS_BG_CSS;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  for (const line of lines) {
    if (!line.text) continue;
    ctx.font      = `bold ${line.fontSize}px 'Anek Telugu', sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = line.textAlign || "center";
    // line.y is the vertical CENTRE of the element (translate(-50%,-50%))
    ctx.textBaseline = "middle";
    ctx.fillText(line.text, line.x, line.y);
  }

  return canvas.toDataURL("image/png");
}

export async function generateZipWithPPTAndSession(presentationName, localSlides, currentIndex) {
  try {
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "CANVAS_16x9", width: PPT_W, height: PPT_H });
    pptx.layout = "CANVAS_16x9";

    for (const slide of localSlides) {
      const slideObj = pptx.addSlide();

      if (!slide.lines || slide.lines.length === 0) {
        // Empty slide — just a background
        slideObj.background = { color: CANVAS_BG_PPTX };
        continue;
      }

      // Render the slide lines to an image and embed it — this preserves
      // exact font, Telugu script, colours, spacing, and centering.
      const imgData = await renderSlideToImage(slide.lines);
      slideObj.addImage({ data: imgData, x: 0, y: 0, w: PPT_W, h: PPT_H });
    }

    const pptxBlob = await pptx.write("blob");

    const sessionData = {
      presentationName,
      slides: localSlides,
      currentIndex,
      timestamp: new Date().toISOString(),
    };

    const safeName = sanitizeFilename(presentationName);

    const zip = new JSZip();
    const arrayBuffer = await pptxBlob.arrayBuffer();
    zip.file(`${safeName}.pptx`, arrayBuffer);
    zip.file(`session.json`, JSON.stringify(sessionData, null, 2));

    const zipBlob = await zip.generateAsync({ type: "blob" });
    return zipBlob;
  } catch (err) {
    console.error("❌ Failed to generate ZIP:", err);
    throw err;
  }
}
