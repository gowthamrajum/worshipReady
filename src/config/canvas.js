// Shared canvas/slide constants used across the app.
// Any file that references slide dimensions, font limits, or default
// background colour should import from here instead of hardcoding values.

export const CANVAS_WIDTH  = 960;
export const CANVAS_HEIGHT = 540;

// PPTX slide dimensions in inches (16:9)
export const PPT_WIDTH  = 10;
export const PPT_HEIGHT = 5.625;

export const MAX_TEXT_WIDTH  = 800;  // element width on the canvas
export const MAX_TEXT_HEIGHT = CANVAS_HEIGHT * 0.9;

export const FONT_FAMILY = "'Anek Telugu', sans-serif";

// Font size limits (toolbar + auto-fit)
export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 70;

// Toolbar-specific limits (tighter range for manual editing)
export const TOOLBAR_MIN_FONT = 25;
export const TOOLBAR_MAX_FONT = 70;

// Line spacing limits
export const MIN_LINE_SPACING = 20;
export const MAX_LINE_SPACING = 150;

// Dynamic spacing constants
export const LINE_HEIGHT_FACTOR = 1.5;
export const TARGET_FILL        = 0.85;
export const MIN_SP_FACTOR      = 1.4;
export const MAX_SP_FACTOR      = 2.5;

// Default slide background colour
export const DEFAULT_BG_COLOR = "#4b5c47";

// Render scale for export (2x resolution)
export const RENDER_SCALE = 2;
