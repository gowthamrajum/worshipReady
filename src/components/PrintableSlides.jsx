// src/components/PrintableSlides.jsx
import React from "react";

const PrintableSlides = React.forwardRef(({ slides }, ref) => {
  return (
    <div ref={ref}>
      {slides.map((slide, index) => (
        <div
          key={index}
          style={{
            width: "960px",
            height: "540px",
            backgroundColor: slide.backgroundColor || "#4b5c47",
            position: "relative",
            marginBottom: "30px",
            pageBreakAfter: "always",
          }}
        >
          {slide.backgroundImage && (
            <img src={slide.backgroundImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          )}
          {slide.lines.map((line) => (
            <div
              key={line.id}
              style={{
                position: "absolute",
                left: `${line.x}px`,
                top: `${line.y}px`,
                fontSize: `${line.fontSize}px`,
                fontWeight: "bold",
                fontFamily: "'Anek Telugu', sans-serif",
                color: line.color || "white",
                transform: "translate(-50%, -50%)",
                width: "800px",
                textAlign: line.textAlign || "center",
              }}
            >
              {line.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

export default PrintableSlides;