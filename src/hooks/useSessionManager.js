import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { deleteAllSlidesForPresentation } from "../api/client";
import { loadSessionFile } from "../utils/loadSessionFromFile";
import {
  getSessionList,
  saveSession,
  loadSession,
  deleteSession,
  migrateLegacySession,
} from "../utils/sessionManager";

export default function useSessionManager({ restoreSlides, clearSlides }) {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [presentationName, setPresentationName] = useState("");
  const [showPrompt, setShowPrompt] = useState(true);
  const [showSessionList, setShowSessionList] = useState(false);
  const [sessions, setSessions] = useState([]);

  const refreshSessionList = useCallback(() => {
    setSessions(getSessionList());
  }, []);

  // On mount: migrate legacy session, then check for available sessions
  useEffect(() => {
    migrateLegacySession();
    const list = getSessionList();
    setSessions(list);
    if (list.length > 0) {
      setShowSessionList(true);
      setShowPrompt(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save whenever slides change (called by the parent via autoSave)
  const autoSave = useCallback(
    (slides, currentIndex) => {
      if (!presentationName || showPrompt || showSessionList) return;
      const id = saveSession(activeSessionId, { presentationName, slides, currentIndex });
      if (!activeSessionId) setActiveSessionId(id);
    },
    [activeSessionId, presentationName, showPrompt, showSessionList]
  );

  const resumeSession = (id) => {
    const data = loadSession(id);
    if (!data) {
      toast.error("Session expired or corrupted.");
      refreshSessionList();
      return;
    }
    restoreSlides(data.slides, data.currentIndex || 0);
    setPresentationName(data.presentationName || "Untitled");
    setActiveSessionId(id);
    setShowSessionList(false);
    setShowPrompt(false);
  };

  const handleDeleteSession = async (id) => {
    const data = loadSession(id);
    if (data?.presentationName && data?.slides?.length) {
      try {
        await deleteAllSlidesForPresentation(data.presentationName, data.slides);
      } catch (err) {
        console.error("Failed to clean up backend slides:", err);
      }
    }
    deleteSession(id);
    refreshSessionList();
    if (id === activeSessionId) {
      setActiveSessionId(null);
      clearSlides();
      setPresentationName("");
    }
  };

  const startNewFromSessionList = () => {
    setActiveSessionId(null);
    clearSlides();
    setPresentationName("");
    setShowSessionList(false);
    setShowPrompt(true);
  };

  const handleLoadSessionFromFile = () => {
    loadSessionFile((session) => {
      if (!session?.slides || !Array.isArray(session.slides)) {
        toast.error("Invalid session file.");
        return;
      }
      restoreSlides(session.slides, session.currentIndex || 0);
      setPresentationName(session.presentationName || "Untitled");
      setActiveSessionId(null);
      setShowPrompt(false);
      setShowSessionList(false);
    });
  };

  const discardDraft = () => {
    if (activeSessionId) deleteSession(activeSessionId);
    setActiveSessionId(null);
    clearSlides();
    setPresentationName("");
    refreshSessionList();
    const list = getSessionList();
    if (list.length > 0) {
      setShowSessionList(true);
      setShowPrompt(false);
    } else {
      setShowSessionList(false);
      setShowPrompt(true);
    }
  };

  const goBackToHome = () => {
    refreshSessionList();
    const list = getSessionList();
    if (list.length > 0) {
      setShowSessionList(true);
      setShowPrompt(false);
    } else {
      setShowSessionList(false);
      setShowPrompt(true);
    }
  };

  return {
    activeSessionId,
    presentationName,
    setPresentationName,
    showPrompt,
    setShowPrompt,
    showSessionList,
    sessions,
    autoSave,
    resumeSession,
    handleDeleteSession,
    startNewFromSessionList,
    handleLoadSessionFromFile,
    discardDraft,
    goBackToHome,
    setActiveSessionId,
  };
}
