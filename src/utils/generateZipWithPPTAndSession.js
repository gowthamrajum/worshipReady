import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";
import { STATIC_BACKGROUNDS } from "./staticBackgrounds";

function sanitizeFilename(name) {
  return name.replace(/[\/\\:*?"<>|]/g, "_");
}

// Canvas dimensions (must match CanvasEditor)
const CANVAS_W = 960;
const CANVAS_H = 540;
// PPTX slide dimensions in inches (16:9)
const PPT_W = 10;
const PPT_H = 5.625;
// Default background colour
const CANVAS_BG_CSS = "#4b5c47";

const _imgCache = new Map();

async function loadImage(src) {
  if (_imgCache.has(src)) return _imgCache.get(src);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => { _imgCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

const RENDER_SCALE = 2;

/**
 * Renders the background (colour + optional image/theme) to a JPEG data URL.
 * Cached so the same background is only rendered once.
 */
const _bgDataCache = new Map();

async function renderBackground(bgColor, bgImage, bgTheme) {
  const cacheKey = `${bgColor}|${bgImage || ""}|${bgTheme || ""}`;
  if (_bgDataCache.has(cacheKey)) return _bgDataCache.get(cacheKey);

  const canvas = document.createElement("canvas");
  canvas.width  = CANVAS_W * RENDER_SCALE;
  canvas.height = CANVAS_H * RENDER_SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(RENDER_SCALE, RENDER_SCALE);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const themeSrc = bgTheme ? STATIC_BACKGROUNDS.find((b) => b.id === bgTheme)?.src : null;
  const imageSrc = themeSrc || bgImage;

  if (imageSrc) {
    try {
      const img   = await loadImage(imageSrc);
      const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
    } catch { /* image failed */ }
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  _bgDataCache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Renders ONLY the text lines onto a transparent PNG at 2× resolution.
 * Font face and size are rendered exactly as on the editor canvas.
 * Returns null if there are no visible text lines.
 */
function renderTextOverlay(lines = []) {
  const visibleLines = lines.filter((l) => l.text);
  if (!visibleLines.length) return null;

  const canvas = document.createElement("canvas");
  canvas.width  = CANVAS_W * RENDER_SCALE;
  canvas.height = CANVAS_H * RENDER_SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(RENDER_SCALE, RENDER_SCALE);

  for (const line of visibleLines) {
    ctx.font         = `bold ${line.fontSize}px 'Anek Telugu', sans-serif`;
    ctx.fillStyle    = line.color || "#ffffff";
    ctx.textAlign    = line.textAlign || "center";
    ctx.textBaseline = "middle";
    if (line.outlineColor) {
      ctx.strokeStyle = line.outlineColor;
      ctx.lineWidth   = (line.outlineSize || 1.5) * 2;
      ctx.lineJoin    = "round";
      ctx.strokeText(line.text, line.x, line.y);
    }
    ctx.fillText(line.text, line.x, line.y);
  }

  return canvas.toDataURL("image/png");
}

/**
 * Opens a PPTX blob (ZIP), finds duplicate images in ppt/media/ by comparing
 * raw bytes, removes duplicates, and rewrites slide .rels to point to the
 * surviving copy.  Returns a new ArrayBuffer.
 */
async function deduplicatePptxImages(pptxBlob) {
  const zip = await JSZip.loadAsync(pptxBlob);

  // 1. Collect all media files
  const mediaFiles = {};
  for (const path of Object.keys(zip.files)) {
    if (path.startsWith("ppt/media/")) {
      mediaFiles[path] = await zip.files[path].async("uint8array");
    }
  }

  // 2. Group by file size (cheap pre-filter)
  const sizeToFiles = new Map();
  for (const [path, bytes] of Object.entries(mediaFiles)) {
    const key = bytes.length;
    if (!sizeToFiles.has(key)) sizeToFiles.set(key, []);
    sizeToFiles.get(key).push(path);
  }

  // 3. Within same-size groups, exact-compare bytes to find true duplicates
  const renameMap = {};
  let removed = 0;

  for (const group of sizeToFiles.values()) {
    if (group.length <= 1) continue;

    const subgroups = [];
    for (const path of group) {
      let matched = false;
      for (const sg of subgroups) {
        const ref = mediaFiles[sg[0]];
        const cur = mediaFiles[path];
        if (ref.length === cur.length && ref.every((b, i) => b === cur[i])) {
          sg.push(path);
          matched = true;
          break;
        }
      }
      if (!matched) subgroups.push([path]);
    }

    for (const sg of subgroups) {
      if (sg.length <= 1) continue;
      const keep = sg[0];
      for (let i = 1; i < sg.length; i++) {
        renameMap[sg[i]] = keep;
        zip.remove(sg[i]);
        removed++;
      }
    }
  }

  if (removed === 0) return await pptxBlob.arrayBuffer();

  // 4. Rewrite slide .rels to point duplicates → kept file
  for (const path of Object.keys(zip.files)) {
    if (!path.startsWith("ppt/slides/_rels/") || !path.endsWith(".rels")) continue;

    let xml = await zip.files[path].async("string");
    let changed = false;
    for (const [dupePath, keepPath] of Object.entries(renameMap)) {
      const dupeRef = `../media/${dupePath.replace("ppt/media/", "")}`;
      const keepRef = `../media/${keepPath.replace("ppt/media/", "")}`;
      if (xml.includes(dupeRef)) {
        xml = xml.split(dupeRef).join(keepRef);
        changed = true;
      }
    }
    if (changed) zip.file(path, xml);
  }

  // 5. Clean up [Content_Types].xml — remove Override entries for deleted files
  if (zip.files["[Content_Types].xml"]) {
    let ct = await zip.files["[Content_Types].xml"].async("string");
    let ctChanged = false;
    for (const dupePath of Object.keys(renameMap)) {
      const partName = `/${dupePath}`;
      const regex = new RegExp(
        `<Override[^>]*PartName="${partName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*/?>`,
        "g"
      );
      const newCt = ct.replace(regex, "");
      if (newCt !== ct) { ct = newCt; ctChanged = true; }
    }
    if (ctChanged) zip.file("[Content_Types].xml", ct);
  }

  return await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

export async function generateZipWithPPTAndSession(presentationName, localSlides, currentIndex) {
  try {
    // Pre-load font for canvas rendering
    try { await document.fonts.load("bold 40px 'Anek Telugu', sans-serif"); } catch { /* ignore */ }

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "CANVAS_16x9", width: PPT_W, height: PPT_H });
    pptx.layout = "CANVAS_16x9";

    for (const slide of localSlides) {
      const slideObj = pptx.addSlide();
      const bgColor  = slide.backgroundColor || CANVAS_BG_CSS;
      const bgImage  = slide.backgroundImage || null;
      const bgTheme  = slide.backgroundTheme || null;
      const hasImage = !!(bgImage || bgTheme);
      const hasText  = slide.lines?.some((l) => l.text);

      if (!hasText && !hasImage) {
        // Empty slide — solid colour, no images at all
        slideObj.background = { color: bgColor.replace("#", "") };
        continue;
      }

      // Layer 1: Background image (cached JPEG — deduped in post-processing)
      const bgData = await renderBackground(bgColor, bgImage, bgTheme);
      slideObj.addImage({ data: bgData, x: 0, y: 0, w: PPT_W, h: PPT_H });

      // Layer 2: Text overlay (transparent PNG — exact font rendering)
      const textData = renderTextOverlay(slide.lines || []);
      if (textData) {
        slideObj.addImage({ data: textData, x: 0, y: 0, w: PPT_W, h: PPT_H });
      }
    }

    const pptxBlob = await pptx.write("blob");

    // Post-process: deduplicate identical background images
    const deduped = await deduplicatePptxImages(pptxBlob);

    const sessionData = {
      presentationName,
      slides: localSlides,
      currentIndex,
      timestamp: new Date().toISOString(),
    };

    const safeName = sanitizeFilename(presentationName);
    const zip      = new JSZip();
    const deflate = { compression: "DEFLATE", compressionOptions: { level: 9 } };
    zip.file(`${safeName}.pptx`, deduped, deflate);
    zip.file("session.json",     JSON.stringify(sessionData, null, 2), deflate);

    return await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
  } catch (err) {
    console.error("Failed to generate ZIP:", err);
    throw err;
  }
}
