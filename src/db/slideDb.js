const DB_NAME = "SlideStorageDB";
const STORE_NAME = "slides";
const DB_VERSION = 1;

let db;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject("❌ Failed to open IndexedDB");

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

// ✅ Save or update a slide
export async function saveOrUpdateSlide(slideObj) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.put(slideObj);
  return tx.complete;
}

// ✅ Delete by ID
export async function deleteSlide(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.delete(id);
  return tx.complete;
}

// ✅ Get all slides for a given presentation
export async function getSlides(presentationName) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const allSlides = await store.getAll();
  return allSlides.filter((s) => s.presentationName === presentationName);
}

// ✅ Get single slide by ID
export async function getSlideById(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return await store.get(id);
}