import React, { useState, useEffect, useRef } from "react";
import { FiCheck, FiSkipForward } from "react-icons/fi";

/**
 * Time-sensitive auto-dismiss modal for worship workflow steps.
 * Visually shrinks + fades as the timer counts down, then auto-confirms.
 */
export default function WorkflowModal({
  stepLabel,
  stepIndex,
  totalSteps,
  timer = 5,
  onConfirm,
  onSkip,
}) {
  const [remaining, setRemaining] = useState(timer);
  const intervalRef = useRef(null);

  useEffect(() => {
    setRemaining(timer);
    if (timer <= 0) return;

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimeout(() => onConfirm(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [timer, stepLabel]);

  const handleConfirm = () => {
    clearInterval(intervalRef.current);
    onConfirm();
  };

  const handleSkip = () => {
    clearInterval(intervalRef.current);
    onSkip();
  };

  // Scale: 1 → 0.85 as timer counts down.  Opacity: 1 → 0.5.
  const fraction = timer > 0 ? remaining / timer : 1;
  const scale = 0.85 + 0.15 * fraction;
  const opacity = 0.5 + 0.5 * fraction;
  const bgOpacity = 0.2 + 0.3 * fraction;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9998] transition-all duration-700"
      style={{ backgroundColor: `rgba(0,0,0,${bgOpacity})` }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-xs overflow-hidden transition-all duration-700 ease-in-out"
        style={{ transform: `scale(${scale})`, opacity }}
      >
        {/* Countdown ring */}
        <div className="flex flex-col items-center pt-5 pb-2">
          <div className="relative w-16 h-16 mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15.5"
                fill="none" stroke="#e5e7eb" strokeWidth="2.5"
              />
              <circle
                cx="18" cy="18" r="15.5"
                fill="none" stroke="#3b82f6" strokeWidth="2.5"
                strokeDasharray="97.4"
                strokeDashoffset={97.4 * (1 - fraction)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-blue-600">
              {remaining}
            </span>
          </div>

          {/* Step badge */}
          <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full mb-2">
            Step {stepIndex + 1} of {totalSteps}
          </span>

          <h3 className="text-base font-bold text-gray-800 mb-0.5 text-center px-4">
            {stepLabel}
          </h3>
          <p className="text-[10px] text-gray-400 mb-3">
            Auto-adding this slide…
          </p>
        </div>

        {/* Actions */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition border-r border-gray-100"
          >
            <FiCheck size={14} />
            Add Now
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
          >
            <FiSkipForward size={14} />
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
