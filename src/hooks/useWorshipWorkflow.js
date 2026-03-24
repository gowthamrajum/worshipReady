import { useState, useCallback, useEffect, useRef } from "react";
import WORKFLOW_STEPS, {
  saveWorkflowState,
  loadWorkflowState,
  clearWorkflowState,
} from "../utils/worshipWorkflow";
import { buildSongSlideLines, ensureFontLoaded } from "../utils/buildSongSlideLines";

const WF_ENABLED_KEY = "worship-workflow-enabled";

/**
 * Manages the worship service workflow state machine.
 *
 * Returns:
 *   enabled        — whether the workflow is active
 *   toggleEnabled  — flip the beta toggle
 *   currentStep    — index into WORKFLOW_STEPS (null = finished/off)
 *   currentStepDef — the step definition object
 *   pendingModal   — "auto" | "psalm" | null — which modal to show
 *   handleStepConfirm  — user confirmed auto/psalm step
 *   handleStepSkip     — user skipped a step
 *   notifySongAdded    — call after a song is added to slides
 *   resetWorkflow      — start over
 *   totalSteps         — WORKFLOW_STEPS.length
 */
export default function useWorshipWorkflow(addMultipleSlides, addOfferingsSlide) {
  const [enabled, setEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(WF_ENABLED_KEY);
      return stored === "true"; // default off
    } catch {
      return false;
    }
  });

  const [stepIndex, setStepIndex] = useState(() => {
    const saved = loadWorkflowState();
    return saved?.stepIndex ?? 0;
  });

  // What modal to show right now: "auto" | "psalm" | null
  const [pendingModal, setPendingModal] = useState(null);
  // Whether the very first step has been fired on initial load
  const initialFired = useRef(false);

  const totalSteps = WORKFLOW_STEPS.length;
  const currentStepDef = stepIndex < totalSteps ? WORKFLOW_STEPS[stepIndex] : null;
  const finished = stepIndex >= totalSteps;

  // Persist on every step change
  useEffect(() => {
    if (enabled) saveWorkflowState({ stepIndex });
  }, [stepIndex, enabled]);

  // Persist toggle
  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(WF_ENABLED_KEY, String(next)); } catch { /* */ }
      if (!next) {
        clearWorkflowState();
        setPendingModal(null);
      }
      return next;
    });
  }, []);

  /**
   * Advance to next step and evaluate it.
   * - "auto" → show WorkflowModal
   * - "prompt" → show psalm modal
   * - "song" → do nothing (wait for user to add song)
   */
  const evaluateStep = useCallback((idx) => {
    if (!enabled || idx >= totalSteps) {
      setPendingModal(null);
      return;
    }
    const step = WORKFLOW_STEPS[idx];
    if (step.type === "auto") {
      setPendingModal("auto");
    } else if (step.type === "prompt") {
      setPendingModal("psalm");
    } else {
      // "song" — user needs to pick a song, no modal
      setPendingModal(null);
    }
  }, [enabled, totalSteps]);

  /** Fire the current step when workflow is first ready + enabled */
  const fireInitialStep = useCallback(() => {
    if (!enabled || initialFired.current) return;
    if (stepIndex >= totalSteps) return;
    initialFired.current = true;
    evaluateStep(stepIndex);
  }, [enabled, stepIndex, totalSteps, evaluateStep]);

  /** Build and insert slide lines for an auto step */
  const insertAutoSlide = useCallback(async (step) => {
    if (step.slideKey === "offerings" && addOfferingsSlide) {
      addOfferingsSlide();
      return;
    }
    if (!step.slide) return;
    await ensureFontLoaded();
    const lines = buildSongSlideLines(step.slide);
    if (lines.length > 0) {
      addMultipleSlides([lines]);
    }
  }, [addMultipleSlides, addOfferingsSlide]);

  /** User confirmed the auto-insert modal */
  const handleStepConfirm = useCallback(async (psalmLines) => {
    setPendingModal(null);
    const step = WORKFLOW_STEPS[stepIndex];
    if (!step) return;

    if (step.type === "auto") {
      await insertAutoSlide(step);
    } else if (step.type === "prompt" && psalmLines) {
      // psalmLines is an array of text strings from WorkflowPsalmModal
      await ensureFontLoaded();
      const lines = buildSongSlideLines(psalmLines);
      if (lines.length > 0) addMultipleSlides([lines]);
    }

    const next = stepIndex + 1;
    setStepIndex(next);
    // Evaluate next step after a brief delay to let slides render
    setTimeout(() => evaluateStep(next), 300);
  }, [stepIndex, insertAutoSlide, addMultipleSlides, evaluateStep]);

  /** User skipped a step */
  const handleStepSkip = useCallback(() => {
    setPendingModal(null);
    const next = stepIndex + 1;
    setStepIndex(next);
    setTimeout(() => evaluateStep(next), 300);
  }, [stepIndex, evaluateStep]);

  /** Call this after user adds a song via SongPreview */
  const notifySongAdded = useCallback(() => {
    if (!enabled || finished) return;
    const step = WORKFLOW_STEPS[stepIndex];
    if (step?.type !== "song") return; // not expecting a song right now
    const next = stepIndex + 1;
    setStepIndex(next);
    setTimeout(() => evaluateStep(next), 500);
  }, [enabled, finished, stepIndex, evaluateStep]);

  const resetWorkflow = useCallback(() => {
    setStepIndex(0);
    setPendingModal(null);
    initialFired.current = false;
    clearWorkflowState();
  }, []);

  /**
   * Directly fill the first (empty) slide with Praise & Worship lines
   * and advance workflow to step 1 — no modal needed.
   * Called by SlideComposer on fresh presentation create.
   */
  const prefillFirstSlide = useCallback(async (setSlideLines) => {
    if (!enabled) return;
    const step = WORKFLOW_STEPS[0];
    if (!step?.slide) return;

    await ensureFontLoaded();
    const lines = buildSongSlideLines(step.slide);
    if (lines.length > 0) {
      setSlideLines(0, lines);
    }
    // Advance past step 0 (P&W) to step 1 (Song 1)
    setStepIndex(1);
    initialFired.current = true;
    saveWorkflowState({ stepIndex: 1 });
  }, [enabled]);

  return {
    enabled,
    toggleEnabled,
    currentStep: finished ? null : stepIndex,
    currentStepDef: finished ? null : currentStepDef,
    pendingModal: enabled ? pendingModal : null,
    handleStepConfirm,
    handleStepSkip,
    notifySongAdded,
    fireInitialStep,
    resetWorkflow,
    prefillFirstSlide,
    totalSteps,
  };
}
