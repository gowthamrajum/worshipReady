/**
 * Multi-session manager with 6-hour TTL.
 *
 * Storage layout:
 *   "slide-sessions-index"  → [{ id, name, slideCount, timestamp, expiresAt }]
 *   "slide-session-<id>"    → { presentationName, slides, currentIndex, timestamp }
 *
 * Sessions older than SESSION_TTL_MS are purged on every read.
 */

const INDEX_KEY = "slide-sessions-index";
const SESSION_PREFIX = "slide-session-";
const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function generateId() {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Read the index, purge expired entries, and return the clean list. */
export function getSessionList() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    const now = Date.now();
    const valid = list.filter((entry) => {
      if (now > entry.expiresAt) {
        // Expired — remove its data too
        localStorage.removeItem(SESSION_PREFIX + entry.id);
        return false;
      }
      return true;
    });
    // Write back the cleaned list
    if (valid.length !== list.length) {
      localStorage.setItem(INDEX_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

/** Save (create or update) a session. Returns the session id. */
export function saveSession(id, { presentationName, slides, currentIndex }) {
  const now = Date.now();
  const sessionId = id || generateId();
  const timestamp = new Date().toISOString();
  const expiresAt = now + SESSION_TTL_MS;

  // Save session data
  const sessionData = { presentationName, slides, currentIndex, timestamp };
  localStorage.setItem(SESSION_PREFIX + sessionId, JSON.stringify(sessionData));

  // Update index
  const list = getSessionList();
  const existing = list.findIndex((e) => e.id === sessionId);
  const entry = {
    id: sessionId,
    name: presentationName || "Untitled",
    slideCount: slides?.length || 0,
    timestamp,
    expiresAt,
  };

  if (existing >= 0) {
    list[existing] = entry;
  } else {
    list.unshift(entry); // newest first
  }

  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  return sessionId;
}

/** Load a session's full data by id. Returns null if expired or missing. */
export function loadSession(id) {
  try {
    const raw = localStorage.getItem(SESSION_PREFIX + id);
    if (!raw) return null;
    const data = JSON.parse(raw);

    // Check expiry from index
    const list = getSessionList();
    const entry = list.find((e) => e.id === id);
    if (!entry) {
      // Not in index (expired and purged) — clean up
      localStorage.removeItem(SESSION_PREFIX + id);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/** Delete a single session by id. */
export function deleteSession(id) {
  localStorage.removeItem(SESSION_PREFIX + id);
  const list = getSessionList().filter((e) => e.id !== id);
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

/** Delete all sessions. */
export function clearAllSessions() {
  const list = getSessionList();
  for (const entry of list) {
    localStorage.removeItem(SESSION_PREFIX + entry.id);
  }
  localStorage.removeItem(INDEX_KEY);
}

/** Migrate legacy single-session format to new multi-session format. */
export function migrateLegacySession() {
  try {
    const raw = localStorage.getItem("slide-composer-session");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.slides?.length) {
      localStorage.removeItem("slide-composer-session");
      return null;
    }
    // Save as a new session in the multi-session system
    const id = saveSession(null, data);
    // Remove legacy key
    localStorage.removeItem("slide-composer-session");
    return id;
  } catch {
    localStorage.removeItem("slide-composer-session");
    return null;
  }
}

/** Human-readable time-ago string. */
export function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return new Date(isoString).toLocaleString();
}

/** Human-readable time remaining before expiry. */
export function timeRemaining(expiresAt) {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m left`;
}
