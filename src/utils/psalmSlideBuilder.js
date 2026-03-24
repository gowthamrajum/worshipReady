const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;

const MAX_CONTENT_HEIGHT = 440; // used for font-fitting check
const DEFAULT_FONT_SIZE = 42;
const MIN_FONT_SIZE = 24;

// Dynamic spacing constants (same as buildSongSlideLines)
const TARGET_FILL   = 0.85;
const MIN_SP_FACTOR = 1.4;
const MAX_SP_FACTOR = 2.5;

const generateId = () =>
  `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// Estimate vertical space for font-fitting checks (uses a fixed 1.5× lineheight)
function measureLines(lines, fontSize) {
  return lines.length * (fontSize * 1.5);
}

// Dynamic spacing: fill TARGET_FILL of slide height, clamped to [1.4×, 2.5×] fontSize
function calcSpacing(fontSize, n) {
  if (n <= 1) return fontSize * 1.5;
  const targetH = SLIDE_HEIGHT * TARGET_FILL;
  const dynamic = (targetH - fontSize) / (n - 1);
  return Math.min(fontSize * MAX_SP_FACTOR, Math.max(fontSize * MIN_SP_FACTOR, dynamic));
}

// 🔄 Wrap long lines into smaller chunks by character count
function wrapTextIntoLines(text, maxCharsPerLine = 45) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (let word of words) {
    const tryLine = current.length ? `${current} ${word}` : word;
    if (tryLine.length <= maxCharsPerLine) {
      current = tryLine;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// 🎯 Main function to lay out formatted lines for each verse pair
export function splitVersesIntoSlides(verses) {
  const slides = [];

  for (let verse of verses) {
    const telugu = `${verse.verse}. ${verse.telugu}`;
    const english = `${verse.verse}. ${verse.english}`;

    let teluguLines = wrapTextIntoLines(telugu, 38);
    let englishLines = wrapTextIntoLines(english, 45);

    let fontSize = DEFAULT_FONT_SIZE;
    let fits = false;

    // 📉 Shrink font size until it fits within max content height
    while (!fits && fontSize >= MIN_FONT_SIZE) {
      const totalHeight = measureLines([...teluguLines, ...englishLines], fontSize);
      if (totalHeight <= MAX_CONTENT_HEIGHT) {
        fits = true;
        break;
      }
      fontSize -= 2;
    }

    const stanzaId = `stanza-${generateId()}`;
    const allLines = [...teluguLines, ...englishLines];
    const spacing = calcSpacing(fontSize, allLines.length);
    const blockH  = (allLines.length - 1) * spacing + fontSize;
    // startY = vertical center of first element (y = center, matching CanvasEditor)
    const startY  = (SLIDE_HEIGHT - blockH) / 2 + fontSize / 2;

    const slideLines = allLines.map((text, i) => ({
      text,
      x: SLIDE_WIDTH / 2,
      y: Math.round(startY + i * spacing),
      fontSize,
      id: generateId(),
      stanzaId,
      textAlign: "center",
      lineSpacing: spacing,
    }));

    slides.push(slideLines);
  }

  return slides;
}

// Alias kept for backward compatibility
export const layoutVersesForSlide = splitVersesIntoSlides;