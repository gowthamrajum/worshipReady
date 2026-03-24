/**
 * Static background themes — image-based.
 * Add entries here as you place images in public/themes/<category>/.
 * `src` must match the file path under public/ (served at root by Vite).
 */

export const STATIC_BACKGROUNDS = [
  // ── Palm Sunday ──────────────────────────────────────────────────────────
  { id: "palm_sunday_leafy_leaf", label: "Leafy Leaf",  category: "Palm Sunday", src: "/themes/palm-sunday/leafy-leaf.jpg" },
  { id: "palm_sunday_darky_leaf", label: "Darky Leaf",  category: "Palm Sunday", src: "/themes/palm-sunday/darky-leaf.jpg" },
  { id: "palm_sunday_greeny_leaf", label: "Greeny Leaf",  category: "Palm Sunday", src: "/themes/palm-sunday/greeny-leaf.jpg" },

  // ── Christmas ─────────────────────────────────────────────────────────────
  // { id: "christmas_1", label: "Nativity", category: "Christmas", src: "/themes/christmas/nativity.jpg" },

  // ── Easter ────────────────────────────────────────────────────────────────
  { id: "green_easter", label: "Green Easter",  category: "Easter", src: "/themes/easter/green_easter.jpg" },
  { id: "colorful_easter", label: "Colorful Easter",  category: "Easter", src: "/themes/easter/colorful_easter.jpg" },
  { id: "communion_easter", label: "Communion Easter",  category: "Easter", src: "/themes/easter/communion_easter.jpg" },
  { id: "neon_blank_easter", label: "Neon Blank Easter",  category: "Easter", src: "/themes/easter/neon_blank_easter.jpg" },
  { id: "vibrant_easter", label: "Vibrant Easter",  category: "Easter", src: "/themes/easter/vibrant_easter.jpg" },

  // ── Good Friday ───────────────────────────────────────────────────────────
  { id: "dark_crown", label: "Dark Crown",  category: "Good Friday", src: "/themes/good-friday/dark-crown.jpg" },

  // ── Thanksgiving ──────────────────────────────────────────────────────────
  // { id: "thanksgiving_1", label: "Harvest", category: "Thanksgiving", src: "/themes/thanksgiving/harvest.jpg" },

  // ── New Year ──────────────────────────────────────────────────────────────
  // { id: "new_year_1", label: "Fireworks", category: "New Year", src: "/themes/new-year/fireworks.jpg" },
];
