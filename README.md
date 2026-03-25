# Worship Ready

A worship presentation web app built for Telugu Christian churches. Create, edit, and export bilingual (Telugu + English) slide presentations for Sunday services — complete with songs, psalms, sermon titles, offerings, and a guided worship workflow.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

### Slide Composer
- **Visual canvas editor** (960x540) with drag-and-drop text placement
- **Auto font-fitting** — binary-search algorithm sizes text to fit the slide
- **Dynamic line spacing** — fills 85% of slide height with even distribution
- **Stanza & line editing modes** — move, resize, recolor, align text
- **Background studio** — solid colors, uploaded images, or seasonal themes (Easter, Palm Sunday, Good Friday)
- **Text outline/stroke** support for readability over images
- **Slide thumbnails** with drag-to-reorder
- **Duplicate, delete, and navigate** slides with keyboard arrow nudging

### Song Management
- **Search, add, edit, and delete** songs with bilingual Telugu/English lyrics
- **Quick Add** — paste raw lyrics and auto-parse into structured stanzas (with AI fallback)
- **Drag mode** — drag individual lines or full stanzas onto the canvas
- **Arrange mode** — select stanzas, set a recurring chorus, reorder with drag-and-drop, then batch-insert slides
- **Undo** — reverse the last batch move

### Psalms
- **Fetch by chapter** or verse range from the backend API
- **Auto-layout** — verses are word-wrapped and positioned for the 960x540 canvas
- **Psalm slide builder** — inserts formatted "Responsive Reading" title slides with Telugu ordinals (e.g., "ఇరవై మూడవ కీర్తన")

### Worship Workflow (Beta)
A **guided step-by-step flow** for a typical Telugu church service:

| Step | Type | Description |
|------|------|-------------|
| Praise & Worship | Auto | Title slide inserted automatically |
| Song 1-6 | Song | Waits for you to add a song |
| Responsive Reading | Prompt | Asks for psalm chapter + verse range |
| Sunday School | Auto | Title slide |
| Sermon | Auto | Title slide |
| Offerings | Auto | QR code + bilingual text |
| Announcements | Auto | Title slide |
| Benediction | Auto | Title slide |
| Thank You All | Auto | Closing slide |

Auto-steps show a countdown modal and insert the slide for you. Song steps wait until you add a song before advancing. The entire workflow state persists in localStorage — resume where you left off.

### Export
- **Download ZIP** — bundled `.pptx` + `session.json` for backup/restore
- **Save & Download Session** — JSON file for resuming later
- **Load from File** — restore a previous session from JSON
- **Backend sync** — slides are saved/updated on the presentation API in real time

### Custom Slides
Pre-built slides for common service elements:
- Praise & Worship, Sermon, Sunday School, Communion, Announcements, Benediction, Offerings (with QR code), Thank You Note
- **Add your own** custom text slides
- **Psalm Reading** — modal with chapter/verse input and live preview

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build | Vite 6 |
| Styling | Tailwind CSS 3.4 |
| Drag & Drop | @hello-pangea/dnd |
| PPT Export | pptxgenjs |
| ZIP Bundling | JSZip |
| Screenshots | html2canvas |
| HTTP | Axios |
| Notifications | react-hot-toast |
| Font | Anek Telugu (Telugu + Latin) |

---

## Project Structure

```
src/
├── api/
│   └── client.js                 # Centralized API client (all endpoints + env vars)
│
├── config/
│   └── canvas.js                 # Shared constants (960x540, font limits, colors)
│
├── constants/
│   └── psalms.js                 # Psalm verse counts (1-150), ordinal builders, validation
│
├── components/
│   ├── slides/                   # Slide editor and canvas
│   │   ├── SlideComposer.jsx     # Main orchestrator (675 lines)
│   │   ├── CanvasEditor.jsx      # Live 960x540 canvas with drag/drop
│   │   ├── CanvasToolbar.jsx     # Right-panel: backdrop, type, scale controls
│   │   ├── SlideSwitcher.jsx     # Thumbnail strip with reorder
│   │   ├── SlideEditControls.jsx # Edit/Save toggle
│   │   └── PrintableSlides.jsx   # Print-optimized layout
│   │
│   ├── songs/                    # Song CRUD and preview
│   │   ├── Songs.jsx             # Song library with tabs (Search/Add/Quick Add)
│   │   ├── SongPreview.jsx       # Drag + Arrange modes for adding to canvas
│   │   ├── SongTable.jsx         # Paginated table with sort, filter, Excel export
│   │   ├── AddSong.jsx           # Full song entry form with reCAPTCHA
│   │   ├── QuickAddSong.jsx      # Paste-and-parse with AI fallback
│   │   ├── EditSong.jsx          # Inline editor with undo/redo
│   │   └── DeleteSong.jsx        # Password-protected deletion
│   │
│   ├── psalms/                   # Psalm fetching and slide generation
│   │   ├── Psalms.jsx            # Chapter/verse search
│   │   ├── PsalmsPreview.jsx     # Fetch + auto-layout + copy to canvas
│   │   └── CustomSlides.jsx      # Pre-built service slides + psalm modal
│   │
│   ├── modals/                   # All modal/dialog components
│   │   ├── ConfirmModal.jsx      # Reusable delete confirmation
│   │   ├── BgThemeModal.jsx      # Background theme picker (seasonal categories)
│   │   ├── WorkflowModal.jsx     # Auto-dismiss countdown modal
│   │   ├── WorkflowPsalmModal.jsx# Psalm input for workflow steps
│   │   ├── PresentationPrompt.jsx# New presentation name input
│   │   └── LanguageEditorModal.jsx# Draggable iframe to lekhini.org
│   │
│   └── layout/                   # Structural UI
│       ├── Tabs.jsx              # Main tab navigation + keep-alive ping
│       ├── ModeSelectors.jsx     # Drag mode + Edit mode toggles
│       └── HealthCheck.jsx       # API endpoint status dashboard
│
├── hooks/
│   ├── useSlides.js              # Core slide state (add, delete, reorder, backgrounds)
│   ├── useSlideHandlers.js       # Slide refs, backend delete, psalm batch add
│   ├── useExportHandlers.js      # PPT export + backend save/update
│   ├── useWorshipWorkflow.js     # Workflow state machine with localStorage persistence
│   └── useKeepAlive.js           # Periodic ping to keep Render.com backend awake
│
├── utils/
│   ├── buildSongSlideLines.js    # Text -> positioned line objects (binary-search font fit)
│   ├── psalmSlideBuilder.js      # Verse pairs -> slide layouts with word wrapping
│   ├── exportSlideCanvasAsImage.js # html2canvas -> PNG base64
│   ├── exportAllSlidesToPPT.js   # Multiple slides -> PPTX
│   ├── generateZipWithPPTAndSession.js # PPTX + session JSON -> ZIP (with image dedup)
│   ├── downloadJSON.js           # Trigger browser download of JSON
│   ├── loadSessionFromFile.js    # File input -> parsed session
│   ├── staticBackgrounds.js      # Theme image registry (Palm Sunday, Easter, etc.)
│   └── worshipWorkflow.js        # Workflow step definitions + localStorage helpers
│
├── App.jsx                       # Entry: username gate -> Tabs
├── main.jsx                      # ReactDOM render
└── index.css                     # Tailwind directives + custom animations
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- A running backend API (see [Environment Variables](#environment-variables))

### Installation

```bash
git clone <repository-url>
cd worshipReady
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Backend API base URL (songs, psalms, health)
VITE_API_BASE_URL=http://localhost:5000

# Presentation API base URL (slides, presentations)
VITE_PRESENTATION_API=http://localhost:5000

# Optional: Google reCAPTCHA v2 site key (protects song creation)
VITE_RECAPTCHA_SITE_KEY=

# Password required to delete songs
VITE_DELETE_PASSWORD=your-secret-password
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. Hot-reloads on file changes.

### Production Build

```bash
npm run build
npm run preview    # preview the built app locally
```

Output goes to `dist/`.

---

## API Endpoints

The app expects a backend providing these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/songs` | List all songs |
| `GET` | `/songs/:id` | Get song with stanzas |
| `POST` | `/songs` | Create song (accepts `x-recaptcha-token` header) |
| `PUT` | `/songs/:id` | Update song |
| `DELETE` | `/songs/:id` | Delete song |
| `POST` | `/songs/parse-lyrics` | AI lyrics parser (optional) |
| `GET` | `/psalms/:chapter` | Get all verses in a chapter |
| `GET` | `/psalms/:chapter/range?start=X&end=Y` | Get verse range |
| `POST` | `/presentations` | Create presentation record |
| `POST` | `/presentations/slide` | Save slide image |
| `PUT` | `/presentations/slide` | Update slide image |
| `DELETE` | `/presentations/slide/:name/:id` | Delete slide |
| `PUT` | `/presentations/update-order` | Reorder slides |
| `GET` | `/ping` | Health check / keep-alive |

---

## How It Works

### Slide Layout Engine

The app uses an offscreen `<canvas>` to measure text widths with the **Anek Telugu** font, then runs a binary search to find the largest font size that fits within the 800px element width. For multi-line stanzas, it also caps the font by vertical space (90% of slide height). Line spacing is dynamically calculated to fill 85% of the slide, clamped between 1.4x and 2.5x the font size.

### Session Persistence

The current presentation (all slides, backgrounds, positions, text) is saved to `localStorage` under `slide-composer-session`. On page reload, you're prompted to resume or start fresh. You can also export/import sessions as JSON files.

### Worship Workflow

The workflow is a state machine defined in `src/utils/worshipWorkflow.js`. Each step is either:
- **auto** — inserts a slide after a countdown timer
- **song** — waits for `notifySongAdded()` before advancing
- **prompt** — shows a modal (e.g., psalm chapter input) and waits for user response

State is persisted to localStorage so the workflow survives page refreshes.

### PPT Export

Slides are rendered in two layers:
1. **Background** — color + optional image/theme, rendered to JPEG
2. **Text overlay** — rendered to transparent PNG with exact font metrics

Both layers are composited into a PPTX using `pptxgenjs`. A post-processing step deduplicates identical background images in the ZIP to reduce file size.

---

## Seasonal Themes

Background themes are registered in `src/utils/staticBackgrounds.js` and stored as images in `public/themes/`:

```
public/themes/
├── palm-sunday/    # Leafy Leaf, Darky Leaf, Greeny Leaf
├── easter/         # Green, Colorful, Communion, Neon Blank, Vibrant
└── good-friday/    # Dark Crown
```

To add a new theme, place the image in the appropriate category folder and add an entry to `staticBackgrounds.js`.

---

## Font

The app uses [Anek Telugu](https://fonts.google.com/specimen/Anek+Telugu) (SemiBold) for all slide text. The font file is bundled at `public/fonts/AnekTelugu-SemiBold.ttf` and loaded via CSS `@font-face`.

---

## License

MIT
