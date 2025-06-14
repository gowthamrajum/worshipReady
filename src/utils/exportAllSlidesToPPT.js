import pptxgen from "pptxgenjs";

export async function exportAllSlidesToPPT(slideImages, title = "WorshipSlides") {
  const pptx = new pptxgen();

  slideImages.forEach((imageData) => {
    if (imageData) {
      pptx.addSlide().addImage({
        data: imageData,
        x: 0,
        y: 0,
        w: 10,         // Full width
        h: 5.625,      // 16:9 aspect
      });
    }
  });

  await pptx.writeFile(`${title}.pptx`);
}