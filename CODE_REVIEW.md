# Code Review — worshipReady

**Branch:** `claude/code-review-1Q8mt`
**Reviewed files:** `src/App.jsx`, `src/components/Tabs.jsx`, `src/components/SlideComposer.jsx`, `src/components/CanvasEditor.jsx`, `src/components/Songs.jsx`, `src/components/Psalms.jsx`, `src/components/AddSong.jsx`, `src/components/SlideSwitcher.jsx`, `src/components/HealthCheck.jsx`, `src/components/usePresentationSetup.js`, `src/components/useSlideHandlers.js`, `src/components/useExportHandlers.js`, `src/hooks/useSlides.js`, `src/hooks/usePersistentSlides.js`, `src/hooks/useKeepAlive.js`, `src/db/slideDb.js`, `src/utils/generateZipWithPPTAndSession.js`, `src/utils/loadSessionFromFile.js`, `vite.config.js`

---

## 1. Bugs

### 1.1 Mismatched `localStorage` Keys — Session Never Shared Between Systems
**Files:** `src/hooks/usePersistentSlides.js:4`, `src/components/SlideComposer.jsx:24`
**Severity:** High

`usePersistentSlides` writes to key `"slide_composer_session"` (underscore), while `SlideComposer.jsx` reads/writes to `"slide-composer-session"` (hyphen). These are two separate keys, so the two systems never share session data. The `useEffect` in `SlideComposer.jsx` (line 209) that is supposed to restore from a saved session reads from `"slide-composer-session"`, but `usePersistentSlides` writes to a different key, creating silent data isolation.

```js
// usePersistentSlides.js
const STORAGE_KEY = "slide_composer_session"; // underscore

// SlideComposer.jsx
localStorage.getItem("slide-composer-session"); // hyphen — different key!
```

**Fix:** Unify to one key across both systems.

---

### 1.2 `addSlide` Returns Stale Index
**File:** `src/hooks/useSlides.js:41`
**Severity:** High

```js
const addSlide = (initialLines = [], callback) => {
  ...
  setCurrentIndex((prev) => prev + 1);
  return slides.length; // ⚠️ stale — reflects state before this call
};
```

`slides.length` is read from the closure at the time of the call, not after state has updated. When `addPsalmSlides` (in `useSlideHandlers.js:59-65`) calls this in a `forEach` loop, the first call returns the correct index, but React batches the state updates; subsequent iterations all read the same stale `slides.length`. This means `setSlideEditMode` and `markSlideSaved` are called with incorrect indices for all but the first psalm slide.

---

### 1.3 `duplicateSlide` Always Appends to End, Not After Current Slide
**File:** `src/hooks/useSlides.js:54`
**Severity:** Medium

```js
const updated = [...slides, copy]; // always appends to end
```

The unsaved-changes modal in `SlideComposer.jsx:459` assumes the duplicate will appear at `currentIndex + 1`:
```js
} else if (pendingSlideIndex === currentIndex + 1) {
  handleDuplicate(currentIndex);
}
```

But `duplicateSlide` always appends to the end. If there are more than two slides, this logic will call the wrong action for the wrong index.

---

### 1.4 `SlideSwitcher.jsx` — Drag-Scroll Variables Reset on Each Render
**File:** `src/components/SlideSwitcher.jsx:24-27`
**Severity:** Medium

```js
let isDown = false;
let startX;
let scrollLeft;
```

These plain `let` variables are declared inside the component function body and reset to their initial values on every re-render. If the component re-renders between `mousedown` and `mousemove` (e.g., due to a state update elsewhere), `isDown` becomes `false` and the drag is silently abandoned. They must use `useRef` to persist across renders.

---

### 1.5 `CanvasEditor.jsx` — Unguarded `JSON.parse` in `handleDrop`
**File:** `src/components/CanvasEditor.jsx:174-175`
**Severity:** Medium

```js
const raw    = e.dataTransfer.getData("text/plain");
const parsed = JSON.parse(raw); // throws if raw is empty or not valid JSON
```

If anything other than the app's own drag source triggers a drop (a browser file, a link, another element), `JSON.parse` throws an uncaught exception that can crash the component. Wrap in a try/catch and validate the result.

---

### 1.6 `CanvasEditor.jsx` — Stanza Drag Position Drift
**File:** `src/components/CanvasEditor.jsx:209-213`
**Severity:** Medium

```js
const x = e.clientX - rect.left - dragInfo.offsetX;  // absolute target position
...
return { ...ln,
  x: ln.x + (x - canvasLines[dragInfo.index].x), // delta = absolute - current pos
  y: ln.y + (y - canvasLines[dragInfo.index].y)
};
```

`x` and `y` are recalculated as absolute target positions each `mousemove`. The delta `x - canvasLines[dragInfo.index].x` is then applied to each sibling line's position. But after the first `mousemove`, `canvasLines[dragInfo.index].x` has already been updated (the state mutated via `setSlideLines`), making the delta computation incorrect on subsequent events. This produces jitter or drift when dragging multi-line stanzas.

---

### 1.7 `slideDb.js` — Incorrect IndexedDB API Usage
**File:** `src/db/slideDb.js:34-35, 42-44`
**Severity:** Medium

```js
await store.put(slideObj); // IDBRequest, not a Promise — await does nothing useful
return tx.complete;        // IDBTransaction.complete is not a standard property
```

`IDBRequest` is not a native Promise. `await store.put(...)` resolves immediately (with the `IDBRequest` object), not when the transaction completes. `tx.complete` is `undefined` in the Web IndexedDB API (it's not a property). The correct pattern is to promisify the `IDBRequest.onsuccess`/`onerror` callbacks or use a library like `idb`. As a result, the error handling in these functions does not work correctly.

---

### 1.8 `CanvasEditor.jsx` — Module-Level DOM Access
**File:** `src/components/CanvasEditor.jsx:9-10`
**Severity:** Low

```js
const _measureCanvas = document.createElement("canvas");
const _measureCtx    = _measureCanvas.getContext("2d");
```

These are evaluated at module import time, before any React component mounts. While the app is a browser-only SPA today, this pattern breaks if the module is ever imported in a non-browser environment (e.g., tests with Node/jsdom without canvas support, or SSR).

---

### 1.9 `useSlideHandlers.js` — Unused Variable `PRESENTATION_BASE`
**File:** `src/components/useSlideHandlers.js:4`
**Severity:** Low

```js
const PRESENTATION_BASE = import.meta.env.VITE_PRESENTATION_API; // declared but unused
```

The `handleDeleteSlide` function accesses `import.meta.env.VITE_PRESENTATION_API` directly instead of using this constant.

---

### 1.10 `usePersistentSlides.js` — No Error Handling in `JSON.parse`
**File:** `src/hooks/usePersistentSlides.js:15`
**Severity:** Low

```js
const parsed = JSON.parse(saved); // throws if localStorage data is corrupted
```

Corrupted localStorage data (e.g., partial write, browser storage quota exceeded mid-write) will throw and crash the hook with an unhandled exception. Wrap in a try/catch.

---

## 2. Code Quality

### 2.1 `usePersistentSlides` Is Effectively Unused
**File:** `src/components/SlideComposer.jsx:39`
**Severity:** Medium

```js
const local = usePersistentSlides([]);
```

Only `local.presentationName` and `local.setPresentationName` are used. The hook's own `slides`, `currentIndex`, and `setSlides` are never consumed — the slides displayed in the UI come entirely from `useSlides`. However, `usePersistentSlides` still runs its `useEffect` on every change and writes its own (always empty) slides to localStorage under its key, doing unnecessary work and potentially overwriting useful data if the key were ever unified.

---

### 2.2 `slideDb.js` Is Dead Code
**File:** `src/db/slideDb.js`
**Severity:** Medium

The IndexedDB wrapper is defined but no component or hook imports it. It is unreachable code.

---

### 2.3 Duplicate `FiDownload` Import in `SlideComposer.jsx`
**File:** `src/components/SlideComposer.jsx:8-19`
**Severity:** Low

`react-icons/fi` is imported twice in the same file. Both imports should be merged into one.

```js
import { FiDownload, FiFilm, FiAlertTriangle } from "react-icons/fi"; // line 8
...
import { FiLoader, FiTrash2, FiUpload, FiCheckCircle } from "react-icons/fi"; // line 19
```

---

### 2.4 `useEffect` Missing `restoreSlides` in Dependency Array
**File:** `src/components/SlideComposer.jsx:209-218`
**Severity:** Low

```js
useEffect(() => {
  ...
  restoreSlides(session.slides, session.currentIndex || 0);
  ...
}, []); // restoreSlides not in deps — ESLint react-hooks/exhaustive-deps violation
```

While the intent is "run once on mount", missing the dependency means ESLint rules are violated and a stale closure could be captured if the function were ever recreated.

---

### 2.5 Duplicate API Calls to `/songs` on Startup
**Files:** `src/components/Songs.jsx:17-26`, `src/components/usePresentationSetup.js:12-17`
**Severity:** Low

Both `Songs.jsx` and `usePresentationSetup.js` independently fetch `${API_BASE}/songs` on mount. When the Slide Composer tab is open alongside Songs, two identical network requests are made unnecessarily.

---

### 2.6 `SlideComposer.jsx` — `onReorder` Uses Stale `slides` Closure
**File:** `src/components/SlideComposer.jsx:357-376`
**Severity:** Low

```js
onReorder={(from, to) => {
  reorderSlides(from, to);            // async state update
  const updated = [...slides];        // ⚠️ stale: still the pre-update array
  const [moved] = updated.splice(from, 1);
  updated.splice(to, 0, moved);
  updated.forEach((slide, index) => {
    fetch(..., { body: JSON.stringify({ slideOrder: index, ... }) })
  });
}}
```

`reorderSlides` schedules a React state update asynchronously. The `const updated = [...slides]` line immediately below reads the old state. The backend receives the new order derived from the old array, which is the same computation as `reorderSlides` does — so the result is actually correct in this specific case. However, it is fragile and confusing: if `reorderSlides` ever changes its implementation, the two computations will diverge silently. The reorder logic should be performed in one place.

---

### 2.7 `Psalms.jsx` — No Validation That `startVerse <= endVerse`
**File:** `src/components/Psalms.jsx:27-29`
**Severity:** Low

The range mode validates that both values are numbers but does not check that `startVerse` is less than or equal to `endVerse`. Invalid ranges will produce confusing empty results from the backend.

---

### 2.8 Inconsistent Error Reporting (`alert()` vs. `react-hot-toast`)
**Files:** `src/components/SlideComposer.jsx:129`, `src/components/useSlideHandlers.js:35`
**Severity:** Low

The app uses `react-hot-toast` consistently in most places, but several error paths fall back to native `alert()`. This creates an inconsistent UX and `alert()` can be suppressed in some browser configurations.

---

## 3. Security

### 3.1 `loadSessionFromFile` — No Schema Validation on Loaded JSON
**File:** `src/utils/loadSessionFromFile.js:13`
**Severity:** Medium

```js
const json = JSON.parse(event.target.result);
onLoad(json); // passed directly to app state
```

`SlideComposer.jsx` checks that `session.slides` exists and is an array, but individual slide objects inside the array are not validated at all. A crafted session file could inject unexpected properties into application state (e.g., into `slides[n].lines`). At minimum, each slide and line object should be validated against an expected shape before being passed to `restoreSlides`.

---

### 3.2 `App.jsx` — No Maximum Length on Username Input
**File:** `src/App.jsx:30-36`
**Severity:** Low

The username input has no `maxLength`. An arbitrarily long name is stored in sessionStorage and rendered in the UI. While not a security vulnerability in the classical sense, it can break the UI layout and could be an issue if the username is ever sent to a backend.

---

### 3.3 `HealthCheck.jsx` — Hard-Coded Backend URLs in Frontend
**File:** `src/components/HealthCheck.jsx:48-54`
**Severity:** Low

The health check component hard-codes the backend URL `https://grey-gratis-ice.onrender.com` directly in JSX, while the rest of the app reads the URL from `import.meta.env.VITE_API_BASE_URL`. This creates an inconsistency: if the backend URL changes, the HealthCheck will silently check the wrong URL while the rest of the app is updated via `.env`.

---

### 3.4 `HealthCheck.jsx` — `url` Property Used But Never Set in `healthCards`
**File:** `src/components/HealthCheck.jsx:99, 107`
**Severity:** Low

```js
const healthCards = [
  { label: "Glitch API", icon: ..., statusKey: "glitch" }, // no `url` property
  ...
];
...
<p className="text-sm text-gray-500 truncate">{url}</p> // always undefined/blank
```

The `healthCards` array does not include a `url` field, but the render function destructures `url` from each card. The result is that the URL display is always empty.

---

## 4. Architecture

### 4.1 Three Overlapping Storage Systems With No Clear Owner
**Files:** `src/hooks/usePersistentSlides.js`, `src/components/SlideComposer.jsx`, `src/db/slideDb.js`

The app has three storage mechanisms that partially overlap:

| System | Key/Store | Status |
|---|---|---|
| `usePersistentSlides` hook | `localStorage["slide_composer_session"]` | Active but mostly unused |
| Direct `localStorage` in `SlideComposer` | `localStorage["slide-composer-session"]` | Active, primary session store |
| `slideDb.js` IndexedDB | `SlideStorageDB/slides` | Defined but never imported |

The inconsistent keys, unused abstraction, and dead IndexedDB code make the persistence layer hard to reason about and maintain. Recommend: pick one storage strategy, remove the others.

---

### 4.2 `useSlides` and `usePersistentSlides` Manage Parallel Slide State
**Files:** `src/hooks/useSlides.js`, `src/hooks/usePersistentSlides.js`

`useSlides` is the authoritative source of slide state (`slides`, `currentIndex`). `usePersistentSlides` manages its own independent copy of these same fields, which is never synchronized with `useSlides`. The import in `SlideComposer.jsx` is:

```js
const local = usePersistentSlides([]);
```

Only `presentationName` is bridged between the two systems. The hook's slide state is orphaned.

---

## Summary

| Severity | Count |
|---|---|
| High | 2 |
| Medium | 6 |
| Low | 10 |

**Top priorities:**
1. Fix the localStorage key mismatch (`"slide_composer_session"` vs `"slide-composer-session"`) — sessions may not restore correctly.
2. Fix `addSlide` returning a stale index — psalm slides get incorrect edit modes.
3. Guard `JSON.parse` in `handleDrop` with a try/catch.
4. Fix `SlideSwitcher` drag-scroll variables to use `useRef`.
5. Fix `slideDb.js` IndexedDB API misuse or remove the dead code.
