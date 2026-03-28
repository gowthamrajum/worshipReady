import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import useSlides from "../../hooks/useSlides";
import useSlideHandlers from "../../hooks/useSlideHandlers";
import { useExportHandlers } from "../../hooks/useExportHandlers";
import useSessionManager from "../../hooks/useSessionManager";
import { exportSlideCanvasAsImage } from "../../utils/exportSlideCanvasAsImage";
import { createPresentation as apiCreatePresentation, PRES_API, updateSlideOrder } from "../../api/client";
import { generateZipWithPPTAndSession } from "../../utils/generateZipWithPPTAndSession";
import { downloadJSON } from "../../utils/downloadJSON";
import { saveSession } from "../../utils/sessionManager";
import { FiFilm } from "react-icons/fi";

// Child components
import SongPreview from "../songs/SongPreview";
import ModeSelectors from "../layout/ModeSelectors";
import CanvasEditor from "./CanvasEditor";
import SlideSwitcher from "./SlideSwitcher";
import SlideEditControls from "./SlideEditControls";
import CustomSlides from "../psalms/CustomSlides";
import PsalmsPreview from "../psalms/PsalmsPreview";
import PresentationPrompt from "../modals/PresentationPrompt";
import SessionListScreen from "./SessionListScreen";
import ComposerToolbar from "./ComposerToolbar";
import {
  UnsavedChangesModal,
  EditRequiredModal,
  SaveConfirmationModal,
  ZipProgressModal,
  ZipReadyModal,
} from "./ComposerModals";

const SlideComposer = () => {
  // ── Slide state ──────────────────────────────────────────────────────────
  const {
    slides, currentIndex, currentSlide,
    addSlide, addMultipleSlides, addMultipleSlidesAtEnd,
    setSlideLines, goToSlide, captureSlideImage, setSlideEditMode,
    markSlideSaved, duplicateSlide, reorderSlides, reorderMultipleSlides, deleteSlide,
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
    presentationName: "",
  });

  const { exportAll, saveSlide } = useExportHandlers(
    slideRefs, slides, "", markSlideSaved, markSlideBackendSaved
  );

  // ── Session management ───────────────────────────────────────────────────
  const session = useSessionManager({ restoreSlides, clearSlides });

  // Re-bind handlers that need presentationName (it comes from session)
  const { slideRefs: boundRefs, currentRef: boundRef, editMode: boundEditMode, unsaved: boundUnsaved,
    updateSlideImage: boundUpdateImage, handleDeleteSlide: boundHandleDelete, addPsalmSlides: boundAddPsalm,
  } = useSlideHandlers({
    slides, currentIndex,
    slideOps: { addSlide, addMultipleSlides, setSlideLines, setSlideEditMode, markSlideSaved, deleteSlide },
    presentationName: session.presentationName,
  });

  const { exportAll: boundExportAll, saveSlide: boundSaveSlide } = useExportHandlers(
    boundRefs, slides, session.presentationName, markSlideSaved, markSlideBackendSaved
  );

  // ── Local UI state ───────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState("");
  const [dragMode, setDragMode] = useState("stanza");
  const [pendingSlideIndex, setPendingSlideIndex] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [showNameWarning, setShowNameWarning] = useState(false);
  const [isPreparingZip, setIsPreparingZip] = useState(false);
  const [isZipReady, setIsZipReady] = useState(false);

  // Auto-save whenever slides change
  useEffect(() => {
    session.autoSave(slides, currentIndex);
  }, [slides, currentIndex, session.autoSave]);

  // ── Presentation actions ─────────────────────────────────────────────────

  const getSlideOrder = (slideId) => slides.findIndex((s) => s.id === slideId);

  const handleSlideSwitch = (index) => {
    if (boundUnsaved) {
      setPendingSlideIndex(index);
      setShowUnsavedModal(true);
    } else {
      goToSlide(index);
    }
  };

  const handleCreatePresentation = async () => {
    if (!inputValue.trim()) { setShowNameWarning(true); return; }
    const createdDateTime = new Date().toISOString();
    try {
      await apiCreatePresentation(inputValue.trim(), createdDateTime);
      session.setPresentationName(inputValue.trim());
      session.setActiveSessionId(null);
      session.setShowPrompt(false);
    } catch (err) {
      console.error("Failed to create presentation", err);
      toast.error("Failed to create presentation. Please try again.");
    }
  };

  const handleDuplicate = (index, position = "next") => {
    duplicateSlide(index, (newIndex, newSlide) => {
      goToSlide(newIndex);
      setTimeout(async () => {
        const ref = boundRefs.current[newIndex];
        if (!ref?.current) return;
        const imageBase64 = await exportSlideCanvasAsImage(ref, `Slide-${newIndex + 1}`, false);
        const base64Data = imageBase64.replace(/^data:image\/png;base64,/, "");
        const finalOrder = getSlideOrder(newSlide.id);
        try {
          const response = await fetch(`${PRES_API}/presentations/slide`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              randomId: newSlide.id,
              presentationName: session.presentationName,
              slideOrder: finalOrder + 1,
              slideData: base64Data,
            }),
          });
          if (response.ok) {
            markSlideBackendSaved(newIndex);
            markSlideSaved(newIndex);
          }
        } catch (err) {
          console.error("Failed to save duplicated slide:", err);
        }
      }, 300);
    }, { position });
  };

  const saveAndDownloadSession = () => {
    const now = new Date();
    const sessionData = {
      presentationName: session.presentationName,
      slides,
      currentIndex,
      timestamp: now.toISOString(),
    };
    saveSession(session.activeSessionId, sessionData);
    const filename = `${session.presentationName || "presentation"}-session-${now.toISOString().slice(0, 19)}.json`;
    downloadJSON(sessionData, filename);
    setLastSavedTime(now.toLocaleString());
    setShowSavedModal(true);
  };

  const handleDownloadZip = async () => {
    saveSession(session.activeSessionId, {
      presentationName: session.presentationName,
      slides,
      currentIndex,
    });
    setIsPreparingZip(true);
    try {
      const zipBlob = await generateZipWithPPTAndSession(session.presentationName, slides, currentIndex);
      setIsPreparingZip(false);
      setIsZipReady(true);
      setTimeout(() => {
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${session.presentationName}-bundle.zip`;
        a.click();
        URL.revokeObjectURL(url);
        setIsZipReady(false);
      }, 1000);
    } catch (err) {
      setIsPreparingZip(false);
      toast.error("Failed to generate ZIP. Please try again.");
      console.error("ZIP generation error:", err);
    }
  };

  // ── Render: Session List ─────────────────────────────────────────────────

  if (session.showSessionList) {
    return (
      <SessionListScreen
        sessions={session.sessions}
        onResume={session.resumeSession}
        onDelete={session.handleDeleteSession}
        onCreateNew={session.startNewFromSessionList}
        onLoadFile={session.handleLoadSessionFromFile}
      />
    );
  }

  // ── Render: Create New Prompt ────────────────────────────────────────────

  if (session.showPrompt) {
    return (
      <PresentationPrompt
        inputValue={inputValue}
        setInputValue={setInputValue}
        onCreate={handleCreatePresentation}
        onLoadFile={session.handleLoadSessionFromFile}
      />
    );
  }

  // ── Render: Main Editor ──────────────────────────────────────────────────

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
          <FiFilm className="text-indigo-600" size={24} />
          Editing Presentation: {session.presentationName}
        </h1>
      </div>

      <div className="flex gap-6">
        {/* Left panel: content sources */}
        <div className="w-1/3 h-[calc(100vh-160px)] overflow-y-auto pr-2 space-y-4">
          <SongPreview
            dragMode={dragMode}
            onAddMultipleSlides={(slideLinesArray) => addMultipleSlides(slideLinesArray)}
            onUndoLastBatch={removeSlidesByIds}
          />
          <PsalmsPreview dragMode={dragMode} onAddPsalmSlides={boundAddPsalm} />
          <CustomSlides onAddSlide={addMultipleSlides} />
        </div>

        {/* Right panel: editor + controls */}
        <div className="w-2/3 flex flex-col space-y-4">
          <div className="flex justify-end">
            <SlideEditControls
              onEdit={() => !boundEditMode && setSlideEditMode(currentIndex, "stanza")}
              onSave={() => boundSaveSlide(currentIndex)}
              unsaved={boundUnsaved}
              isEditing={!!boundEditMode}
              hasLines={slides[currentIndex]?.lines.length > 0}
            />
          </div>

          <ModeSelectors
            dragMode={dragMode}
            setDragMode={setDragMode}
            editMode={boundEditMode}
            setEditMode={(mode) => {
              if (!boundEditMode) setShowEditPrompt(true);
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
            editMode={boundEditMode}
            slideRefs={boundRefs}
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
              if (boundUnsaved) {
                setPendingSlideIndex(slides.length);
                setShowUnsavedModal(true);
              } else {
                addSlide();
              }
            }}
            onDuplicate={(index, position = "next") => {
              if (boundUnsaved) {
                setPendingSlideIndex(position === "end" ? slides.length : index + 1);
                setShowUnsavedModal(true);
              } else {
                handleDuplicate(index, position);
              }
            }}
            onDelete={boundHandleDelete}
            onReorder={(from, to) => {
              const updated = [...slides];
              const [moved] = updated.splice(from, 1);
              updated.splice(to, 0, moved);
              reorderSlides(from, to);
              updated.forEach((slide, index) => {
                updateSlideOrder(session.presentationName, slide.id, index)
                  .catch((err) => console.error("Failed to update order:", err));
              });
            }}
            onReorderMultiple={(sortedIndices, targetIndex) => {
              reorderMultipleSlides(sortedIndices, targetIndex);
              // Re-sync backend order after state update settles
              setTimeout(() => {
                slides.forEach((slide, index) => {
                  updateSlideOrder(session.presentationName, slide.id, index)
                    .catch((err) => console.error("Failed to update order:", err));
                });
              }, 0);
            }}
          />

          <ComposerToolbar
            onDiscard={session.discardDraft}
            onSaveDownload={saveAndDownloadSession}
            onDownloadZip={handleDownloadZip}
          />
        </div>
      </div>

      {/* Modals */}
      {showUnsavedModal && (
        <UnsavedChangesModal
          onCancel={() => { setShowUnsavedModal(false); setPendingSlideIndex(null); }}
          onSaveAndContinue={async () => {
            await boundSaveSlide(currentIndex);
            setShowUnsavedModal(false);
            if (typeof pendingSlideIndex === "number") {
              if (pendingSlideIndex >= slides.length) addSlide();
              else goToSlide(pendingSlideIndex);
              setPendingSlideIndex(null);
            }
          }}
        />
      )}

      {showEditPrompt && (
        <EditRequiredModal
          onCancel={() => setShowEditPrompt(false)}
          onEdit={() => { setSlideEditMode(currentIndex, "stanza"); setShowEditPrompt(false); }}
        />
      )}

      {showSavedModal && (
        <SaveConfirmationModal
          lastSavedTime={lastSavedTime}
          onKeepWorking={() => setShowSavedModal(false)}
          onBackToHome={() => { setShowSavedModal(false); session.goBackToHome(); }}
        />
      )}

      {isPreparingZip && <ZipProgressModal />}
      {isZipReady && <ZipReadyModal />}
    </div>
  );
};

export default SlideComposer;
