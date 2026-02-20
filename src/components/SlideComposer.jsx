import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import useSlides from "../hooks/useSlides";
import usePresentationSetup from "./usePresentationSetup";
import useSlideHandlers from "./useSlideHandlers";
import { useExportHandlers } from "./useExportHandlers";
import { exportSlideCanvasAsImage } from "../utils/exportSlideCanvasAsImage";
import { FiDownload, FiFilm, FiLoader, FiTrash2, FiUpload, FiCheckCircle } from "react-icons/fi";
import { generateZipWithPPTAndSession } from "../utils/generateZipWithPPTAndSession";
import { loadSessionFile } from "../utils/loadSessionFromFile";
import SongPreview from "./SongPreview";
import ModeSelectors from "./ModeSelectors";
import CanvasEditor from "./CanvasEditor";
import SlideSwitcher from "./SlideSwitcher";
import SlideEditControls from "./SlideEditControls";
import CustomSlides from "./CustomSlides";
import PsalmsPreview from "./PsalmsPreview";
import PresentationPrompt from "./PresentationPrompt";
import { downloadJSON } from "../utils/downloadJSON";

const getSavedSessionMeta = () => {
  try {
    const raw = localStorage.getItem("slide-composer-session");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.timestamp) return null;
    return {
      exists: true,
      timestamp: new Date(data.timestamp).toLocaleString(),
    };
  } catch (err) {
    console.warn("Invalid saved session:", err);
    return null;
  }
};

const SlideComposer = () => {
  const sessionMeta = getSavedSessionMeta();

  // No longer initialised from usePersistentSlides — that hook used a different
  // localStorage key ("slide_composer_session" vs "slide-composer-session") so it
  // never actually shared state with the main session restore logic below.
  const [presentationName, setPresentationName] = useState("");
  const [showPrompt, setShowPrompt] = useState(true);
  const [showResumePrompt, setShowResumePrompt] = useState(!!sessionMeta?.exists);
  const [inputValue, setInputValue] = useState("");
  const [dragMode, setDragMode] = useState("stanza");
  const [pendingSlideIndex, setPendingSlideIndex] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [showNameWarning, setShowNameWarning] = useState(false);

  const {
    slides,
    currentIndex,
    currentSlide,
    addSlide,
    addMultipleSlides,
    setSlideLines,
    goToSlide,
    captureSlideImage,
    setSlideEditMode,
    markSlideSaved,
    duplicateSlide,
    reorderSlides,
    deleteSlide,
    markSlideBackendSaved,
    restoreSlides,
    clearSlides,
  } = useSlides();

  const {
    songs, query, setQuery, lyrics, fetchLyrics, selectedSong,
  } = usePresentationSetup();

  const {
    slideRefs,
    currentRef,
    editMode,
    unsaved,
    updateSlideImage,
    handleDeleteSlide,
    addPsalmSlides,
  } = useSlideHandlers({
    slides,
    currentIndex,
    slideOps: {
      addSlide,
      addMultipleSlides,
      setSlideLines,
      setSlideEditMode,
      markSlideSaved,
      deleteSlide,
    },
    presentationName,
  });

  const { exportAll, saveSlide } = useExportHandlers(
    slideRefs,
    slides,
    presentationName,
    markSlideSaved,
    markSlideBackendSaved
  );
  const [isPreparingZip, setIsPreparingZip] = useState(false);
  const [isZipReady, setIsZipReady] = useState(false);

  const getSlideOrder = (slideId) => slides.findIndex((s) => s.id === slideId);

  const handleSlideSwitch = (index) => {
    if (unsaved) {
      setPendingSlideIndex(index);
      setShowUnsavedModal(true);
    } else {
      goToSlide(index);
    }
  };

  const handleCreatePresentation = async () => {
    if (!inputValue.trim()) {
      setShowNameWarning(true);
      return;
    }
    const createdDateTime = new Date().toISOString();
    try {
      await fetch(`${import.meta.env.VITE_PRESENTATION_API}/presentations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentationName: inputValue.trim(), createdDateTime }),
      });
      setPresentationName(inputValue.trim());
      setShowPrompt(false);
    } catch (err) {
      console.error("Failed to create presentation", err);
      toast.error("Failed to create presentation. Please try again.");
    }
  };

  const handleDuplicate = (index) => {
    duplicateSlide(index, (newIndex, newSlide) => {

      goToSlide(newIndex); // Go to the new slide so the DOM gets updated

      setTimeout(async () => {
        const ref = slideRefs.current[newIndex];
        if (!ref?.current) {
          console.warn("Slide ref not available yet for capture");
          return;
        }

        const imageBase64 = await exportSlideCanvasAsImage(ref, `Slide-${newIndex + 1}`, false);
        const base64Data = imageBase64.replace(/^data:image\/png;base64,/, "");
        const finalOrder = getSlideOrder(newSlide.id);

        try {
          const response = await fetch(`${import.meta.env.VITE_PRESENTATION_API}/presentations/slide`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              randomId: newSlide.id,
              presentationName,
              slideOrder: finalOrder + 1,
              slideData: base64Data,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            console.error("Failed to save slide (HTTP error):", response.status, errText);
          } else {
            markSlideBackendSaved(newIndex);
            markSlideSaved(newIndex);
          }
        } catch (err) {
          console.error("Failed to save duplicated slide (fetch error):", err);
        }
      }, 300); // Let DOM render before capturing
    });
  };

  const handleLoadSessionFromFile = () => {
    loadSessionFile((session) => {
      if (!session?.slides || !Array.isArray(session.slides)) {
        toast.error("Invalid session file.");
        return;
      }

      restoreSlides(session.slides, session.currentIndex || 0);
      setPresentationName(session.presentationName || "Untitled");
      setShowPrompt(false);
      setShowResumePrompt(false);
      localStorage.setItem("slide-composer-session", JSON.stringify(session));
    });
  };

  const saveAndDownloadSession = () => {
    const now = new Date();
    const sessionData = {
      presentationName,
      slides,
      currentIndex,
      timestamp: now.toISOString(),
    };
    localStorage.setItem("slide-composer-session", JSON.stringify(sessionData));

    const filename = `${presentationName || "presentation"}-session-${now.toISOString().slice(0, 19)}.json`;
    downloadJSON(sessionData, filename);

    setLastSavedTime(now.toLocaleString());
    setShowSavedModal(true);
  };

  // Restore session from localStorage on first mount.
  useEffect(() => {
    const saved = localStorage.getItem("slide-composer-session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.slides?.length > 0) {
          restoreSlides(session.slides, session.currentIndex || 0);
          setPresentationName(session.presentationName || "Untitled");
          setShowPrompt(false);
        }
      } catch (err) {
        console.warn("Failed to restore session:", err);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = (index) => handleDeleteSlide(index);

  const discardDraft = () => {
    localStorage.removeItem("slide-composer-session");
    clearSlides();
    setPresentationName("");
    setShowPrompt(true);
  };

  if (showResumePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded shadow w-full max-w-md space-y-4 text-center">
          <h2 className="text-xl font-semibold text-gray-800">Resume Previous Session?</h2>
          {sessionMeta?.timestamp && (
            <p className="text-sm text-gray-600">
              You last saved on <strong>{sessionMeta.timestamp}</strong>
            </p>
          )}
          <div className="flex flex-col gap-3 mt-4">
          <button
            onClick={() => {
              setShowResumePrompt(false);
              setShowPrompt(false);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Continue Editing
          </button>

          <button
            onClick={discardDraft}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Create New
          </button>

          <button
            onClick={handleLoadSessionFromFile}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            <FiUpload />
            Load From File
          </button>
        </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-gray-700 mb-4 flex items-center gap-2">
        <FiFilm className="text-indigo-600" size={24} />
        Editing Presentation: {presentationName}
      </h1>

      <div className="flex gap-6">
        <div className="w-1/3 h-[calc(100vh-160px)] overflow-y-auto pr-2 space-y-4">
          <SongPreview lyrics={lyrics} dragMode={dragMode} onAddSlide={addSlide} />
          <PsalmsPreview dragMode={dragMode} onAddPsalmSlides={addPsalmSlides} />
          <CustomSlides />
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
            dragMode={dragMode}
            editMode={editMode}
            selectedSong={selectedSong}
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
              if (unsaved) {
                setPendingSlideIndex(slides.length);
                setShowUnsavedModal(true);
              } else {
                addSlide();
              }
            }}
            onDuplicate={(index) => {
              if (unsaved) {
                setPendingSlideIndex(index + 1);
                setShowUnsavedModal(true);
              } else {
                handleDuplicate(index);
              }
            }}
            onDelete={handleDelete}
            onReorder={(from, to) => {
              // Compute the new order from the current slides snapshot before
              // scheduling the state update, so both operations use the same array.
              const updated = [...slides];
              const [moved] = updated.splice(from, 1);
              updated.splice(to, 0, moved);

              reorderSlides(from, to); // schedule local state update

              updated.forEach((slide, index) => {
                fetch(`${import.meta.env.VITE_PRESENTATION_API}/presentations/update-order`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    presentationName,
                    randomId: slide.id,
                    slideOrder: index,
                  }),
                }).catch((err) => console.error("Failed to update order:", err));
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
              setIsPreparingZip(true);

              try {
                const zipBlob = await generateZipWithPPTAndSession(
                  presentationName,
                  slides,
                  currentIndex
                );

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
            <p className="text-sm text-gray-600">
              You have unsaved changes on this slide. Please save before continuing.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => {
                  setShowUnsavedModal(false);
                  setPendingSlideIndex(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await saveSlide(currentIndex);
                  setShowUnsavedModal(false);
                  if (typeof pendingSlideIndex === "number") {
                    if (pendingSlideIndex >= slides.length) {
                      addSlide();
                    } else if (pendingSlideIndex === currentIndex + 1) {
                      handleDuplicate(currentIndex);
                    } else {
                      goToSlide(pendingSlideIndex);
                    }
                    setPendingSlideIndex(null);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save & Continue
              </button>
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
              <button
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                onClick={() => setShowEditPrompt(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                onClick={() => {
                  setSlideEditMode(currentIndex, "stanza");
                  setShowEditPrompt(false);
                }}
              >
                Edit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md text-center space-y-4">
            <h2 className="text-lg font-semibold text-green-700">Slides Saved</h2>
            <p className="text-sm text-gray-600">
              Slides saved locally at <strong>{lastSavedTime}</strong>
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Keep Working
              </button>
              <button
              onClick={() => {
                setShowSavedModal(false);
                setShowPrompt(false);
                setShowResumePrompt(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Home
            </button>

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
            <div className="flex justify-center text-green-600">
              <FiCheckCircle size={36} />
            </div>
            <h2 className="text-xl font-semibold text-green-700">ZIP is Ready!</h2>
            <p className="text-sm text-gray-600">
              Your presentation and session have been bundled and will download now.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideComposer;
