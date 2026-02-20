// Validates that a parsed session object has the expected shape before it is
// applied to app state.  Individual slide and line objects are checked so that
// a crafted JSON file cannot inject unexpected data into the presentation.
function isValidSession(json) {
  if (!json || typeof json !== "object") return false;
  if (!Array.isArray(json.slides)) return false;

  for (const slide of json.slides) {
    if (!slide || typeof slide !== "object") return false;
    if (typeof slide.id !== "string") return false;
    if (!Array.isArray(slide.lines)) return false;

    for (const line of slide.lines) {
      if (!line || typeof line !== "object") return false;
      if (typeof line.text !== "string") return false;
      if (typeof line.x !== "number" || typeof line.y !== "number") return false;
      if (typeof line.fontSize !== "number") return false;
    }
  }

  return true;
}

export function loadSessionFile(onLoad) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let json;
      try {
        json = JSON.parse(event.target.result);
      } catch (err) {
        alert("Invalid session file. Please select a valid JSON file.");
        console.error("Error parsing session file:", err);
        return;
      }

      if (!isValidSession(json)) {
        alert("Session file has an unexpected structure and cannot be loaded.");
        console.error("Session validation failed:", json);
        return;
      }

      onLoad(json);
    };

    reader.readAsText(file);
  });

  input.click();
}
