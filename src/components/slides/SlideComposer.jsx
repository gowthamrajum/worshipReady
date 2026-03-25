import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import useSlides from "../../hooks/useSlides";
import useSlideHandlers from "../../hooks/useSlideHandlers";
import { useExportHandlers } from "../../hooks/useExportHandlers";
import { exportSlideCanvasAsImage } from "../../utils/exportSlideCanvasAsImage";
import { createPresentation as apiCreatePresentation, PRES_API, updateSlideOrder, deleteAllSlidesForPresentation } from "../../api/client";
import { FiDownload, FiFilm, FiLoader, FiTrash2, FiUpload, FiCheckCircle, FiClock, FiLayers } from "react-icons/fi";
import { generateZipWithPPTAndSession } from "../../utils/generateZipWithPPTAndSession";
import { loadSessionFile } from "../../utils/loadSessionFromFile";
import SongPreview from "../songs/SongPreview";
import ModeSelectors from "../layout/ModeSelectors";
import CanvasEditor from "./CanvasEditor";
import SlideSwitcher from "./SlideSwitcher";
import SlideEditControls from "./SlideEditControls";
import CustomSlides from "../psalms/CustomSlides";
import PsalmsPreview from "../psalms/PsalmsPreview";
import PresentationPrompt from "../modals/PresentationPrompt";
import { downloadJSON } from "../../utils/downloadJSON";
import {
  getSessionList,
  saveSession,
  loadSession,
  deleteSession,
  migrateLegacySession,
  timeAgo,
  timeRemaining,
} from "../../utils/sessionManager";

const SlideComposer = () => {
  // Current active session ID (null = no session loaded yet)
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [presentationName, setPresentationName] = useState("");
  const [showPrompt, setShowPrompt] = useState(true);
  const [showSessionList, setShowSessionList] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [dragMode, setDragMode] = useState("stanza");
  const [pendingSlideIndex, setPendingSlideIndex] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [showNameWarning, setShowNameWarning] = useState(false);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState(null); // session entry to confirm-delete

  const {
    slides, currentIndex, currentSlide,
    addSlide, addMultipleSlides, addMultipleSlidesAtEnd,
    setSlideLines, goToSlide, captureSlideImage, setSlideEditMode,
    markSlideSaved, duplicateSlide, reorderSlides, deleteSlide,
    markSlideBackendSaved, restoreSlides, clearSlides,
    removeLastNSlides, removeSlidesByIds,
    setSlideBackground, setAllSlidesBackground, resetAllBackgrounds,
  } = useSlides();

  const {
    slideRefs, currentRef, editMode, unsaved,
    updateSlideImage, handleDeleteSlide, addPsalmSlides,
  } = useSlideHandlers({
    slides, currentIndex,
    slideOps: { addSlide, addMultipleSlides, setSlideLines, setSlideEditMode, markSlideSaved, deleteSlide },
    presentationName,
  });

  const { exportAll, saveSlide } = useExportHandlers(
    slideRefs, slides, presentationName, markSlideSaved, markSlideBackendSaved
  );
  const [isPreparingZip, setIsPreparingZip] = useState(false);
  const [isZipReady, setIsZipReady] = useState(false);

  // ── Session management ─────────────────────────────────────────────────────

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

  // Auto-save to session manager whenever slides change
  useEffect(() => {
    if (!presentationName || showPrompt || showSessionList) return;
    const id = saveSession(activeSessionId, { presentationName, slides, currentIndex });
    if (!activeSessionId) setActiveSessionId(id);
  }, [slides, currentIndex, presentationName, showPrompt, showSessionList]);

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
    // Load session data to find backend-saved slides
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

  // ── Presentation actions ───────────────────────────────────────────────────

  const getSlideOrder = (slideId) => slides.findIndex((s) => s.id === slideId);

  const handleSlideSwitch = (index) => {
    if (unsaved) { setPendingSlideIndex(index); setShowUnsavedModal(true); }
    else goToSlide(index);
  };

  const handleCreatePresentation = async () => {
    if (!inputValue.trim()) { setShowNameWarning(true); return; }
    const createdDateTime = new Date().toISOString();
    try {
      await apiCreatePresentation(inputValue.trim(), createdDateTime);
      setPresentationName(inputValue.trim());
      setActiveSessionId(null); // will be assigned on first auto-save
      setShowPrompt(false);
    } catch (err) {
      console.error("Failed to create presentation", err);
      toast.error("Failed to create presentation. Please try again.");
    }
  };

  const handleDuplicate = (index, position = "next") => {
    duplicateSlide(index, (newIndex, newSlide) => {
      goToSlide(newIndex);
      setTimeout(async () => {
        const ref = slideRefs.current[newIndex];
        if (!ref?.current) return;
        const imageBase64 = await exportSlideCanvasAsImage(ref, `Slide-${newIndex + 1}`, false);
        const base64Data = imageBase64.replace(/^data:image\/png;base64,/, "");
        const finalOrder = getSlideOrder(newSlide.id);
        try {
          const response = await fetch(`${PRES_API}/presentations/slide`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ randomId: newSlide.id, presentationName, slideOrder: finalOrder + 1, slideData: base64Data }),
          });
          if (response.ok) { markSlideBackendSaved(newIndex); markSlideSaved(newIndex); }
        } catch (err) { console.error("Failed to save duplicated slide:", err); }
      }, 300);
    }, { position });
  };

  const handleLoadSessionFromFile = () => {
    loadSessionFile((session) => {
      if (!session?.slides || !Array.isArray(session.slides)) { toast.error("Invalid session file."); return; }
      restoreSlides(session.slides, session.currentIndex || 0);
      setPresentationName(session.presentationName || "Untitled");
      setActiveSessionId(null);
      setShowPrompt(false);
      setShowSessionList(false);
    });
  };

  const saveAndDownloadSession = () => {
    const now = new Date();
    const sessionData = { presentationName, slides, currentIndex, timestamp: now.toISOString() };
    saveSession(activeSessionId, sessionData);
    const filename = `${presentationName || "presentation"}-session-${now.toISOString().slice(0, 19)}.json`;
    downloadJSON(sessionData, filename);
    setLastSavedTime(now.toLocaleString());
    setShowSavedModal(true);
  };

  const handleDelete = (index) => handleDeleteSlide(index);

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

  // ── Session List Screen ────────────────────────────────────────────────────

  if (showSessionList) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4 text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FiLayers size={20} />
              Your Sessions
            </h2>
            <p className="text-indigo-200 text-xs mt-1">
              Sessions auto-expire after 6 hours. Pick one to resume or start fresh.
            </p>
          </div>

          <div className="max-h-[50vh] overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                No saved sessions found.
              </div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 hover:bg-gray-50 transition group"
                >
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => resumeSession(s.id)}>
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <FiLayers size={10} /> {s.slideCount} slides
                      </span>
                      <span className="flex items-center gap-1">
                        <FiClock size={10} /> {timeAgo(s.timestamp)}
                      </span>
                      <span className="text-amber-500 font-medium">{timeRemaining(s.expiresAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => resumeSession(s.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700 transition shrink-0"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => setDeleteSessionTarget(s)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete session"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 flex flex-col gap-2 border-t">
            <button
              onClick={startNewFromSessionList}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition text-sm"
            >
              Create New Presentation
            </button>
            <button
              onClick={handleLoadSessionFromFile}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition text-sm"
            >
              <FiUpload size={14} />
              Load From File
            </button>
          </div>
        </div>

        {/* Delete Session Warning Modal */}
        {deleteSessionTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
              <div className="px-6 pt-6 pb-4 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FiTrash2 size={22} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Delete Session?</h3>
                <p className="text-sm text-gray-500">
                  <strong>"{deleteSessionTarget.name}"</strong> with {deleteSessionTarget.slideCount} slide{deleteSessionTarget.slideCount !== 1 ? "s" : ""} will be permanently removed.
                </p>
                <p className="text-xs text-red-500 font-semibold mt-2">
                  This cannot be undone.
                </p>
              </div>
              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => setDeleteSessionTarget(null)}
                  className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition border-r border-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteSession(deleteSessionTarget.id);
                    setDeleteSessionTarget(null);
                  }}
                  className="flex-1 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Create New Prompt ──────────────────────────────────────────────────────

  if (showPrompt) {
    return (
      <PresentationPrompt
        inputValue={inputValue}
        setInputValue={setInputValue}
        onCreate={handleCreatePresentation}
        onLoadFile={handleLoadSessionFromFile}
      />
    );
  }

  // ── Main Editor ────────────────────────────────────────────────────────────

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
          <FiFilm className="text-indigo-600" size={24} />
          Editing Presentation: {presentationName}
        </h1>
      </div>

      <div className="flex gap-6">
        <div className="w-1/3 h-[calc(100vh-160px)] overflow-y-auto pr-2 space-y-4">
          <SongPreview
            dragMode={dragMode}
            onAddMultipleSlides={(slideLinesArray) => addMultipleSlides(slideLinesArray)}
            onUndoLastBatch={removeSlidesByIds}
          />
          <PsalmsPreview dragMode={dragMode} onAddPsalmSlides={addPsalmSlides} />
          <CustomSlides onAddSlide={addMultipleSlides} />
        </div>

        <div className="w-2/3 flex flex-col space-y-4">
          <div className="flex justify-end">
            <SlideEditControls
              onEdit={() => !editMode && setSlideEditMode(currentIndex, "stanza")}
              onSave={() => saveSlide(currentIndex)}
              unsaved={unsaved}
              isEditing={!!editMode}
              hasLines={slides[currentIndex]?.lines.length > 0}
            />
          </div>

          <ModeSelectors
            dragMode={dragMode}
            setDragMode={setDragMode}
            editMode={editMode}
            setEditMode={(mode) => {
              if (!editMode) setShowEditPrompt(true);
              else setSlideEditMode(currentIndex, mode);
            }}
          />

          <CanvasEditor
            slides={slides}
            currentIndex={currentIndex}
            setSlideLines={setSlideLines}
            setSlideEditMode={setSlideEditMode}
            setSlideBackground={setSlideBackground}
            setAllSlidesBackground={setAllSlidesBackground}
            resetAllBackgrounds={resetAllBackgrounds}
            dragMode={dragMode}
            editMode={editMode}
            slideRefs={slideRefs}
            captureSlideImage={captureSlideImage}
            onPrev={() => handleSlideSwitch(currentIndex - 1)}
            onNext={() => handleSlideSwitch(currentIndex + 1)}
          />

          <SlideSwitcher
            currentIndex={currentIndex}
            slides={slides}
            goToSlide={handleSlideSwitch}
            onNext={() => handleSlideSwitch(currentIndex + 1)}
            onPrev={() => handleSlideSwitch(currentIndex - 1)}
            onAdd={() => {
              if (unsaved) { setPendingSlideIndex(slides.length); setShowUnsavedModal(true); }
              else addSlide();
            }}
            onDuplicate={(index, position = "next") => {
              if (unsaved) {
                setPendingSlideIndex(position === "end" ? slides.length : index + 1);
                setShowUnsavedModal(true);
              } else handleDuplicate(index, position);
            }}
            onDelete={handleDelete}
            onReorder={(from, to) => {
              const updated = [...slides];
              const [moved] = updated.splice(from, 1);
              updated.splice(to, 0, moved);
              reorderSlides(from, to);
              updated.forEach((slide, index) => {
                updateSlideOrder(presentationName, slide.id, index)
                  .catch((err) => console.error("Failed to update order:", err));
              });
            }}
           />

          <div className="flex justify-end gap-4">
            <button
              onClick={discardDraft}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              <FiTrash2 />
              Discard Draft
            </button>

            <button
              onClick={saveAndDownloadSession}
              className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              <FiDownload />
              Save & Download Session
            </button>

            <button
              onClick={async () => {
                saveSession(activeSessionId, { presentationName, slides, currentIndex });
                setIsPreparingZip(true);
                try {
                  const zipBlob = await generateZipWithPPTAndSession(presentationName, slides, currentIndex);
                  setIsPreparingZip(false);
                  setIsZipReady(true);
                  setTimeout(() => {
                    const url = URL.createObjectURL(zipBlob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${presentationName}-bundle.zip`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setIsZipReady(false);
                  }, 1000);
                } catch (err) {
                  setIsPreparingZip(false);
                  toast.error("Failed to generate ZIP. Please try again.");
                  console.error("ZIP generation error:", err);
                }
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              <FiDownload />
              Download ZIP (PPT + Session)
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md text-center space-y-4">
            <h2 className="text-lg font-semibold text-red-600">Unsaved Changes</h2>
            <p className="text-sm text-gray-600">You have unsaved changes on this slide. Please save before continuing.</p>
            <div className="flex justify-center gap-4 mt-4">
              <button onClick={() => { setShowUnsavedModal(false); setPendingSlideIndex(null); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
              <button
                onClick={async () => {
                  await saveSlide(currentIndex);
                  setShowUnsavedModal(false);
                  if (typeof pendingSlideIndex === "number") {
                    if (pendingSlideIndex >= slides.length) addSlide();
                    else goToSlide(pendingSlideIndex);
                    setPendingSlideIndex(null);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >Save & Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Required Modal */}
      {showEditPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm">
            <h2 className="text-lg font-semibold text-yellow-700">Editing Required</h2>
            <p className="text-gray-600 text-sm">Click "Edit Now" to enable slide editing.</p>
            <div className="flex justify-center gap-4">
              <button className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400" onClick={() => setShowEditPrompt(false)}>Cancel</button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={() => { setSlideEditMode(currentIndex, "stanza"); setShowEditPrompt(false); }}>Edit Now</button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md text-center space-y-4">
            <h2 className="text-lg font-semibold text-green-700">Slides Saved</h2>
            <p className="text-sm text-gray-600">Slides saved locally at <strong>{lastSavedTime}</strong></p>
            <div className="flex justify-center gap-4 mt-4">
              <button onClick={() => setShowSavedModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Keep Working</button>
              <button
                onClick={() => {
                  setShowSavedModal(false);
                  refreshSessionList();
                  const list = getSessionList();
                  if (list.length > 0) { setShowSessionList(true); setShowPrompt(false); }
                  else { setShowSessionList(false); setShowPrompt(true); }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >Back to Home</button>
            </div>
          </div>
        </div>
      )}

      {isPreparingZip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg flex items-center gap-4">
            <FiLoader className="animate-spin text-blue-500" size={24} />
            <span className="text-gray-700 font-medium">Preparing ZIP file...</span>
          </div>
        </div>
      )}

      {isZipReady && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center space-y-4 max-w-sm">
            <div className="flex justify-center text-green-600"><FiCheckCircle size={36} /></div>
            <h2 className="text-xl font-semibold text-green-700">ZIP is Ready!</h2>
            <p className="text-sm text-gray-600">Your presentation and session have been bundled and will download now.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideComposer;
