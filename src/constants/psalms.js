// Psalm verse counts and ordinal builders — shared across CustomSlides,
// WorkflowPsalmModal, and any future psalm-related components.

// prettier-ignore
export const PSALM_VERSE_COUNT = [
  0, // index 0 unused
  6,12,8,8,12,10,17,9,20,18,    // 1-10
  7,8,6,7,5,11,15,50,14,9,      // 11-20
  13,31,6,10,22,12,14,9,11,12,  // 21-30
  24,11,22,22,28,12,40,22,13,17,// 31-40
  13,11,5,26,17,11,9,14,20,23,  // 41-50
  19,9,6,7,23,13,11,11,17,12,   // 51-60
  8,12,11,10,13,20,7,35,36,5,   // 61-70
  24,20,28,23,10,12,20,72,13,19,// 71-80
  16,8,18,12,13,17,7,18,52,17,  // 81-90
  16,15,5,23,11,13,12,9,9,5,    // 91-100
  8,28,22,35,45,48,43,13,31,7,  // 101-110
  10,10,9,8,18,19,2,29,176,7,   // 111-120
  8,9,4,8,5,6,5,6,8,8,          // 121-130
  3,18,3,3,21,26,9,8,24,13,     // 131-140
  10,7,12,15,21,10,20,14,9,6,   // 141-150
];

export function getMaxVerse(chapter) {
  return PSALM_VERSE_COUNT[chapter] || 0;
}

// English word-form ordinal builder
const ENG_ONES_ORD = ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth"];
const ENG_TEENS_ORD = ["Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth"];
const ENG_TENS_ORD = ["", "", "Twentieth", "Thirtieth", "Fortieth", "Fiftieth", "Sixtieth", "Seventieth", "Eightieth", "Ninetieth"];
const ENG_TENS_PFX = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

export function getOrdinal(n) {
  if (n >= 1 && n <= 9) return ENG_ONES_ORD[n];
  if (n >= 10 && n <= 19) return ENG_TEENS_ORD[n - 10];
  if (n >= 20 && n <= 99) {
    const t = Math.floor(n / 10), o = n % 10;
    return o === 0 ? ENG_TENS_ORD[t] : `${ENG_TENS_PFX[t]} ${ENG_ONES_ORD[o]}`;
  }
  if (n === 100) return "Hundredth";
  if (n >= 101 && n <= 150) {
    const r = n - 100;
    if (r <= 9) return `Hundred and ${ENG_ONES_ORD[r]}`;
    if (r <= 19) return `Hundred and ${ENG_TEENS_ORD[r - 10]}`;
    const t = Math.floor(r / 10), o = r % 10;
    return o === 0 ? `Hundred and ${ENG_TENS_ORD[t]}` : `Hundred and ${ENG_TENS_PFX[t]} ${ENG_ONES_ORD[o]}`;
  }
  return `${n}th`;
}

// Telugu ordinal builder
const TEL_ONES = ["", "\u0C2E\u0C4A\u0C26\u0C1F\u0C3F", "\u0C30\u0C46\u0C02\u0C21\u0C35", "\u0C2E\u0C42\u0C21\u0C35", "\u0C28\u0C3E\u0C32\u0C41\u0C17\u0C35", "\u0C10\u0C26\u0C35", "\u0C06\u0C30\u0C35", "\u0C0F\u0C21\u0C35", "\u0C0E\u0C28\u0C3F\u0C2E\u0C3F\u0C26\u0C35", "\u0C24\u0C4A\u0C2E\u0C4D\u0C2E\u0C3F\u0C26\u0C35"];
const TEL_TEENS = ["\u0C2A\u0C26\u0C35", "\u0C2A\u0C26\u0C15\u0C4A\u0C02\u0C21\u0C35", "\u0C2A\u0C28\u0C4D\u0C28\u0C46\u0C02\u0C21\u0C35", "\u0C2A\u0C26\u0C2E\u0C42\u0C21\u0C35", "\u0C2A\u0C27\u0C4D\u0C28\u0C3E\u0C32\u0C41\u0C17\u0C35", "\u0C2A\u0C26\u0C3F\u0C39\u0C47\u0C28\u0C35", "\u0C2A\u0C26\u0C39\u0C3E\u0C30\u0C35", "\u0C2A\u0C26\u0C3F\u0C39\u0C47\u0C21\u0C35", "\u0C2A\u0C27\u0C4D\u0C27\u0C46\u0C28\u0C3F\u0C2E\u0C3F\u0C26\u0C35", "\u0C2A\u0C02\u0C26\u0C4A\u0C2E\u0C4D\u0C2E\u0C3F\u0C26\u0C35"];
const TEL_TENS_ORD = ["", "", "\u0C07\u0C30\u0C35\u0C2F\u0C4D\u0C2F\u0C35", "\u0C2E\u0C41\u0C2A\u0C4D\u0C2A\u0C2F\u0C4D\u0C2F\u0C35", "\u0C28\u0C32\u0C2D\u0C2F\u0C4D\u0C2F\u0C35", "\u0C0F\u0C2D\u0C2F\u0C4D\u0C2F\u0C35", "\u0C05\u0C30\u0C35\u0C2F\u0C4D\u0C2F\u0C35", "\u0C21\u0C46\u0C2C\u0C4D\u0C2C\u0C2F\u0C4D\u0C2F\u0C35", "\u0C0E\u0C28\u0C2D\u0C2F\u0C4D\u0C2F\u0C35", "\u0C24\u0C4A\u0C02\u0C2D\u0C2F\u0C4D\u0C2F\u0C35"];
const TEL_TENS_PFX = ["", "", "\u0C07\u0C30\u0C35\u0C48", "\u0C2E\u0C41\u0C2A\u0C4D\u0C2A\u0C48", "\u0C28\u0C32\u0C2D\u0C48", "\u0C0F\u0C2D\u0C48", "\u0C05\u0C30\u0C35\u0C48", "\u0C21\u0C46\u0C2C\u0C4D\u0C2D\u0C48", "\u0C0E\u0C28\u0C2D\u0C48", "\u0C24\u0C4A\u0C02\u0C2D\u0C48"];
const TEL_COMPOUND_ONES = ["", "\u0C12\u0C15\u0C1F\u0C35", "\u0C30\u0C46\u0C02\u0C21\u0C35", "\u0C2E\u0C42\u0C21\u0C35", "\u0C28\u0C3E\u0C32\u0C41\u0C17\u0C35", "\u0C10\u0C26\u0C35", "\u0C06\u0C30\u0C35", "\u0C0F\u0C21\u0C35", "\u0C0E\u0C28\u0C3F\u0C2E\u0C3F\u0C26\u0C35", "\u0C24\u0C4A\u0C2E\u0C4D\u0C2E\u0C3F\u0C26\u0C35"];

export function getTeluguOrdinal(n) {
  if (n >= 1 && n <= 9) return TEL_ONES[n];
  if (n >= 10 && n <= 19) return TEL_TEENS[n - 10];
  if (n >= 20 && n <= 99) {
    const t = Math.floor(n / 10), o = n % 10;
    return o === 0 ? TEL_TENS_ORD[t] : `${TEL_TENS_PFX[t]} ${TEL_COMPOUND_ONES[o]}`;
  }
  if (n === 100) return "\u0C28\u0C42\u0C30\u0C35";
  if (n >= 101 && n <= 150) {
    const r = n - 100;
    if (r <= 9) return `\u0C28\u0C42\u0C1F ${TEL_COMPOUND_ONES[r]}`;
    if (r <= 19) return `\u0C28\u0C42\u0C1F ${TEL_TEENS[r - 10]}`;
    const t = Math.floor(r / 10), o = r % 10;
    return o === 0 ? `\u0C28\u0C42\u0C1F ${TEL_TENS_ORD[t]}` : `\u0C28\u0C42\u0C1F ${TEL_TENS_PFX[t]} ${TEL_COMPOUND_ONES[o]}`;
  }
  return `${n}\u0C35`;
}

export function validatePsalmInput(chapter, verseStart, verseEnd) {
  const ch = parseInt(chapter, 10);
  if (!ch || ch < 1 || ch > 150) return "Psalm chapter must be 1\u2013150";
  const max = getMaxVerse(ch);
  const vs = verseStart ? parseInt(verseStart, 10) : null;
  const ve = verseEnd ? parseInt(verseEnd, 10) : null;
  if (vs && !ve) return "Please enter the ending verse";
  if (!vs && ve) return "Please enter the starting verse";
  if (vs && ve) {
    if (vs < 1) return "Starting verse must be at least 1";
    if (ve < vs) return "Ending verse must be \u2265 starting verse";
    if (vs > max) return `Psalm ${ch} only has ${max} verses`;
    if (ve > max) return `Psalm ${ch} only has ${max} verses (max ${max})`;
  }
  return null;
}

export function buildPsalmLines(chapter, verseStart, verseEnd) {
  const teluguPsalm = `${getTeluguOrdinal(chapter)} \u0C15\u0C40\u0C30\u0C4D\u0C24\u0C28`;
  const englishPsalm = `${getOrdinal(chapter)} Psalm`;

  const hasRange = verseStart && verseEnd;

  const teluguLine = hasRange
    ? `${teluguPsalm} : ${verseStart}-${verseEnd} \u0C35\u0C1A\u0C28\u0C3E\u0C32\u0C41`
    : teluguPsalm;

  const englishLine = hasRange
    ? `${englishPsalm} : ${verseStart}-${verseEnd}th Verse`
    : englishPsalm;

  return [
    "\u0C09\u0C24\u0C4D\u0C24\u0C30-\u0C2A\u0C4D\u0C30\u0C24\u0C4D\u0C2F\u0C41\u0C24\u0C4D\u0C24\u0C30 \u0C35\u0C3E\u0C15\u0C4D\u0C2F \u0C2A\u0C20\u0C28\u0C02",
    "Responsive Reading",
    teluguLine,
    englishLine,
  ];
}
