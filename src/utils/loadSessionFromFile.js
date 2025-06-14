export function loadSessionFile(onLoad) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
  
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          onLoad(json);
        } catch (err) {
          alert("Invalid session file. Please select a valid JSON file.");
          console.error("Error parsing session file:", err);
        }
      };
  
      reader.readAsText(file);
    });
  
    input.click();
  }