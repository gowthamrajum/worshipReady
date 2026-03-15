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
// Scale factors
const SX = PPT_W / CANVAS_W; // 0.010417 in/px
const SY = PPT_H / CANVAS_H; // 0.010417 in/px
// Canvas background colour (matches CanvasEditor)
const CANVAS_BG = "4b5c47";

export async function generateZipWithPPTAndSession(presentationName, localSlides, currentIndex) {
  try {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";

    for (const slide of localSlides) {
      const slideObj = pptx.addSlide();
      slideObj.background = { color: CANVAS_BG };

      if (!slide.lines || slide.lines.length === 0) continue;

      for (const line of slide.lines) {
        if (!line.text) continue;

        // Font size: canvas px → PPTX pt
        // At slide scale: fontSize_pt = fontSize_px * SY * 72
        const fontSize_pt = Math.round(line.fontSize * SY * 72);

        // y is the VERTICAL CENTRE of the element (CanvasEditor uses translate(-50%,-50%))
        // Top of element in px = line.y - line.fontSize/2
        // Convert to inches
        const topPx = line.y - line.fontSize / 2;
        const y_in  = Math.max(0, topPx * SY);
        // Give the text box enough height to render the line without clipping
        const h_in  = line.fontSize * SY * 1.6;

        slideObj.addText(line.text, {
          x:        0,
          y:        y_in,
          w:        PPT_W,
          h:        h_in,
          fontSize: fontSize_pt,
          color:    "FFFFFF",
          align:    line.textAlign || "center",
          fontFace: "Arial",  // Anek Telugu is not embedded in PPTX viewers
          bold:     true,
          valign:   "top",
          wrap:     true,
        });
      }
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