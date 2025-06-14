import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";

// Helper to sanitize file names (replaces illegal characters like /, \, :, etc.)
function sanitizeFilename(name) {
  return name.replace(/[\/\\:*?"<>|]/g, "_");
}

export async function generateZipWithPPTAndSession(presentationName, localSlides, currentIndex) {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_PRESENTATION_API}/presentations/${encodeURIComponent(presentationName)}/slides`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch slides from backend.");
    }

    const backendSlides = await res.json();

    const pptx = new PptxGenJS();

    // Sort slides by order
    const ordered = backendSlides.sort((a, b) => a.slideOrder - b.slideOrder);

    // Add slides to PPT
    for (const slide of ordered) {
      const slideObj = pptx.addSlide();
      slideObj.background = { color: "000000" };

      slideObj.addImage({
        data: `data:image/png;base64,${slide.slideData}`,
        x: 0,
        y: 0,
        w: 10,
        h: 5.625, // 16:9
      });
    }

    // Generate the PPT blob
    const pptxBlob = await pptx.write("blob");

    // Create session JSON from local state
    const sessionData = {
      presentationName,
      slides: localSlides,
      currentIndex,
      timestamp: new Date().toISOString(),
    };

    // Sanitize the filename
    const safeName = sanitizeFilename(presentationName);

    // Optional: Add timestamp if you want it unique
    // const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    // const safeName = sanitizeFilename(`${presentationName}-${timestamp}`);

    // Build the zip
    const zip = new JSZip();

    // Convert PPTX blob to raw buffer to avoid nested folders
    const arrayBuffer = await pptxBlob.arrayBuffer();
    zip.file(`${safeName}.pptx`, arrayBuffer);
    zip.file(`session.json`, JSON.stringify(sessionData, null, 2));

    // Return the zip blob
    const zipBlob = await zip.generateAsync({ type: "blob" });
    return zipBlob;
  } catch (err) {
    console.error("❌ Failed to generate ZIP:", err);
    throw err;
  }
}