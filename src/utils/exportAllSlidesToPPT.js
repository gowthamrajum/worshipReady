import pptxgen from "pptxgenjs";

export async function exportAllSlidesToPPT(slideImages, title = "WorshipSlides") {
  const pptx = new pptxgen();
  // Canvas is 960×540 (16:9). Set slide to the matching 16:9 dimensions so the
  // image fills the entire slide with no blank strips or off-centre cropping.
  pptx.defineLayout({ name: "CANVAS_16x9", width: 10, height: 5.625 });
  pptx.layout = "CANVAS_16x9";

  slideImages.forEach((imageData) => {
    if (imageData) {
      pptx.addSlide().addImage({
        data: imageData,
        x: 0,
        y: 0,
        w: 10,
        h: 5.625,
      });
    }
  });

  await pptx.writeFile(`${title}.pptx`);
}