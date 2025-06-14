const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;

const MAX_CONTENT_WIDTH = 800; // Not actively used here, but helpful if textAlign: "left"
const MAX_CONTENT_HEIGHT = 440; // Actual usable vertical space
const SIDE_PADDING = 80;
const LINE_SPACING = 20;

const DEFAULT_FONT_SIZE = 42;
const MIN_FONT_SIZE = 24;

const generateId = () =>
  `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// 🧠 Estimate how much vertical space the lines will take
function measureLines(lines, fontSize) {
  return lines.length * (fontSize + LINE_SPACING);
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
    let totalLines = teluguLines.length + englishLines.length;
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
    const totalHeight = measureLines(allLines, fontSize);
    const startY = (SLIDE_HEIGHT - totalHeight) / 2;

    const slideLines = allLines.map((text, i) => ({
      text,
      x: SLIDE_WIDTH / 2,
      y: startY + i * (fontSize + LINE_SPACING),
      fontSize,
      id: generateId(),
      stanzaId,
      textAlign: "center",
      lineSpacing: LINE_SPACING,
    }));

    slides.push(slideLines);
  }

  return slides;
}
export function layoutVersesForSlide(verses) {
  const slides = [];

  for (let verse of verses) {
    const telugu = `${verse.verse}. ${verse.telugu}`;
    const english = `${verse.verse}. ${verse.english}`;

    let teluguLines = wrapTextIntoLines(telugu, 38);
    let englishLines = wrapTextIntoLines(english, 45);

    let fontSize = DEFAULT_FONT_SIZE;
    let totalLines = teluguLines.length + englishLines.length;
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
    const totalHeight = measureLines(allLines, fontSize);
    const startY = (SLIDE_HEIGHT - totalHeight) / 2;

    const slideLines = allLines.map((text, i) => ({
      text,
      x: SLIDE_WIDTH / 2,
      y: startY + i * (fontSize + LINE_SPACING),
      fontSize,
      id: generateId(),
      stanzaId,
      textAlign: "center",
      lineSpacing: LINE_SPACING,
    }));

    slides.push(slideLines);
  }

  return slides;
}