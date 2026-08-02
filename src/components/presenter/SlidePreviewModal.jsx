import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";

/**
 * How the picked songs and psalms will actually look once Cantica shows them.
 *
 * The cards render from the SAME envelope the export writes, using the theme and
 * background Cantica applies, and size their text by measuring it — the way
 * Cantica's useFitText does — rather than guessing a font size. So what this
 * shows about which lines land on which slide, and how big they end up, is what
 * the projector will do.
 *
 * It is a close likeness, not a pixel promise: Cantica's Go Live screen spaces
 * lines further apart than a small card can show honestly, so a slide that is
 * tight here has a little more air there.
 */

/** Largest font (px) that fits `deps` into the box, found the way Cantica does. */
function useFitText(deps, { min = 6, max = 400, lineHeight = 1.22 } = {}) {
  const ref = useRef(null);
  const [size, setSize] = useState(24);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const box = el.parentElement;
      if (!box) return;
      const availW = box.clientWidth;
      const availH = box.clientHeight * 0.92;
      if (!availW || !availH) return;
      el.style.lineHeight = String(lineHeight);
      let lo = min;
      let hi = max;
      for (let i = 0; i < 18 && hi - lo > 0.4; i++) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        if (el.scrollWidth <= availW + 1 && el.scrollHeight <= availH + 1) lo = mid;
        else hi = mid;
      }
      el.style.fontSize = `${lo}px`;
      setSize(lo);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ref, size };
}

function SlideCard({ slide, theme, background }) {
  const lines = slide.lines ?? [];
  const { ref } = useFitText([lines.join("\n"), slide.singleLine]);
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-gray-200 shadow-sm"
      style={{ aspectRatio: "16 / 9", background: background?.value ?? "#0a0720" }}
    >
      <div className="absolute inset-0" style={{ background: "#000", opacity: theme?.scrim ?? 0.35 }} />
      {/* Padding lives out here and the fit box below is unpadded — measuring
          against a padded box counts its own padding as free space and the text
          runs off the card. Cantica's stage is built the same way. */}
      <div className="absolute inset-0" style={{ padding: "4% 6%" }}>
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <div
          ref={ref}
          style={{
            display: "inline-block",
            // A single-line slide carries no cap, so its own width stays honest
            // and the fit can shrink it — same reason as Cantica's .oneline.
            maxWidth: slide.singleLine ? "none" : "92%",
            whiteSpace: slide.singleLine ? "pre" : "pre-wrap",
            wordBreak: slide.singleLine ? "normal" : "break-word",
            textAlign: theme?.textAlign ?? "center",
            color: theme?.textColor ?? "#fff",
            fontFamily: theme?.fontFamily,
            fontWeight: 700,
            textTransform: theme?.uppercase ? "uppercase" : "none",
            textShadow: theme?.shadow === false ? "none" : "0 2px 18px rgba(0,0,0,0.65)",
          }}
        >
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        </div>
      </div>
      <span className="absolute top-1 left-1.5 text-[10px] font-semibold text-white/70">
        {slide.label}
      </span>
    </div>
  );
}

export default function SlidePreviewModal({ envelope, onlyItemId = null, onClose }) {
  const service = envelope?.service ?? {};
  const items = (service.items ?? []).filter((it) => !onlyItemId || it.id === onlyItemId);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total = items.reduce((n, it) => n + (it.slides?.length ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b px-5 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            {onlyItemId ? items[0]?.title ?? "Preview" : "Preview"}
          </h2>
          <span className="text-xs text-gray-500">
            {items.length} item{items.length === 1 ? "" : "s"} · {total} slide{total === 1 ? "" : "s"}
          </span>
          <button className="ml-auto text-gray-400 hover:text-gray-700" onClick={onClose} title="Close">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {total === 0 ? (
            <p className="text-sm text-gray-500">Nothing to preview yet.</p>
          ) : (
            items.map((it) => (
              <div key={it.id} className="mb-6 last:mb-0">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{it.title}</span>
                  {it.slot === "offering" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      Offering song
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {it.slides.length} slide{it.slides.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {it.slides.map((s) => (
                    <SlideCard key={s.id} slide={s} theme={service.theme} background={service.background} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t px-5 py-2.5 text-xs text-gray-500">
          Sized by measuring the text, as Cantica does — so the line-per-slide split is exactly
          what you'll get. The Go Live screen spaces lines a little further apart than these
          cards can show.
        </div>
      </div>
    </div>
  );
}
