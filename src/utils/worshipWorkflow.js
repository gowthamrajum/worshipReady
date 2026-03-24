/**
 * Worship Service Workflow — step definitions.
 *
 * Each step has:
 *   type    : "auto" | "song" | "prompt"
 *   label   : display name for the step indicator
 *   slide   : for "auto" steps — the slide text lines to insert
 *   prompt  : for "prompt" steps — what to ask the user (e.g. psalm input)
 *   timer   : seconds the auto-insert modal stays visible before auto-confirming
 */

const WORKFLOW_STEPS = [
  // 0 — Praise & Worship (auto on load)
  {
    type: "auto",
    label: "Praise & Worship",
    slide: ["స్తుతి ఆరాధన", "Praise & Worship"],
    timer: 4,
  },
  // 1 — Song 1
  { type: "song", label: "Song 1" },
  // 2 — Praise & Worship
  {
    type: "auto",
    label: "Praise & Worship",
    slide: ["స్తుతి ఆరాధన", "Praise & Worship"],
    timer: 4,
  },
  // 3 — Song 2
  { type: "song", label: "Song 2" },
  // 4 — Praise & Worship
  {
    type: "auto",
    label: "Praise & Worship",
    slide: ["స్తుతి ఆరాధన", "Praise & Worship"],
    timer: 4,
  },
  // 5 — Song 3
  { type: "song", label: "Song 3" },
  // 6 — Responsive Reading (prompt for psalm)
  {
    type: "prompt",
    label: "Responsive Reading",
    promptType: "psalm",
    timer: 0, // no auto-dismiss — user must respond or skip
  },
  // 7 — Song 4
  { type: "song", label: "Song 4" },
  // 8 — Praise & Worship
  {
    type: "auto",
    label: "Praise & Worship",
    slide: ["స్తుతి ఆరాధన", "Praise & Worship"],
    timer: 4,
  },
  // 9 — Song 5
  { type: "song", label: "Song 5" },
  // 10 — Sunday School
  {
    type: "auto",
    label: "Sunday School",
    slide: ["ఆదివార బడి", "Sunday School"],
    timer: 4,
  },
  // 11 — Sermon
  {
    type: "auto",
    label: "Sermon",
    slide: ["వాక్యోపదేశం", "Sermon"],
    timer: 4,
  },
  // 12 — Offerings
  {
    type: "auto",
    label: "Offerings",
    slide: null, // special — handled by handleAddOfferingsSlide
    slideKey: "offerings",
    timer: 4,
  },
  // 13 — Song 6
  { type: "song", label: "Song 6" },
  // 14 — Announcements
  {
    type: "auto",
    label: "Announcements",
    slide: ["Announcements"],
    timer: 4,
  },
  // 15 — Benediction
  {
    type: "auto",
    label: "Benediction",
    slide: ["Benediction", "ఆశీర్వాదం"],
    timer: 4,
  },
  // 16 — Thank You All
  {
    type: "auto",
    label: "Thank You All",
    slide: ["అందరికీ వందనాలు", "Greetings to all"],
    timer: 4,
  },
];

export default WORKFLOW_STEPS;

/** Persistence key */
export const WF_STORAGE_KEY = "worship-workflow-state";

/** Save workflow state */
export function saveWorkflowState(state) {
  try {
    localStorage.setItem(WF_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** Load workflow state */
export function loadWorkflowState() {
  try {
    const raw = localStorage.getItem(WF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Clear workflow state */
export function clearWorkflowState() {
  try {
    localStorage.removeItem(WF_STORAGE_KEY);
  } catch { /* ignore */ }
}
