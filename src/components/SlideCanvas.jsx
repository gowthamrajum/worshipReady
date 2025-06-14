import React, { useEffect, useRef } from "react";
import  * as fabric  from "fabric";

const SlideCanvas = ({
  slideData = [],
  width = 960,
  height = 540,
  onObjectSelected,
  fontSizeOverride,
}) => {
  const canvasRef = useRef();
  const fabricCanvas = useRef();

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#4b5c47",
      selection: true,
    });

    fabricCanvas.current = canvas;

    const totalLines = slideData.length;
    const lineHeight = 60;
    const totalHeight = totalLines * lineHeight;
    const startY = (height - totalHeight) / 2;

    slideData.forEach((line, idx) => {
      const fontSize = line.type === "telugu" ? 32 : 24;
      const fontFamily =
        line.type === "telugu"
          ? "Baloo Tammudu 2, Gautami, sans-serif"
          : "Noto Sans, sans-serif";

      const textbox = new fabric.Textbox(line.text, {
        left: width / 2,
        top: startY + idx * lineHeight,
        width: width * 0.8,
        fontSize,
        fontFamily,
        fill: "white",
        textAlign: "center",
        originX: "center",
        editable: true,
      });

      canvas.add(textbox);
    });

    canvas.on("selection:created", (e) => {
      onObjectSelected(e.selected[0]);
    });

    canvas.on("selection:updated", (e) => {
      onObjectSelected(e.selected[0]);
    });

    canvas.on("selection:cleared", () => {
      onObjectSelected(null);
    });

    canvas.renderAll();

    return () => {
      canvas.dispose();
    };
  }, [slideData]);

  // Update font size when changed externally
  useEffect(() => {
    if (fabricCanvas.current && fontSizeOverride?.target) {
      fontSizeOverride.target.set("fontSize", fontSizeOverride.size);
      fabricCanvas.current.renderAll();
    }
  }, [fontSizeOverride]);

  return (
    <div className="flex justify-center mt-6">
      <canvas ref={canvasRef} className="border shadow-lg rounded" />
    </div>
  );
};

export default SlideCanvas;