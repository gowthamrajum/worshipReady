const DB_NAME = "SlideStorageDB";
const STORE_NAME = "slides";
const DB_VERSION = 1;

let db;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

// Wraps an IDBRequest in a Promise since IDBRequest is not natively thenable.
function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror  = () => reject(request.error);
  });
}

// Wraps an IDBTransaction completion in a Promise.
function promisifyTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(tx.error);
  });
}

// Save or update a slide
export async function saveOrUpdateSlide(slideObj) {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(slideObj); // fire-and-forget on the request; wait for tx to complete
  return promisifyTransaction(tx);
}

// Delete by ID
export async function deleteSlide(id) {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return promisifyTransaction(tx);
}

// Get all slides for a given presentation
export async function getSlides(presentationName) {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const allSlides = await promisifyRequest(store.getAll());
  return allSlides.filter((s) => s.presentationName === presentationName);
}

// Get single slide by ID
export async function getSlideById(id) {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return promisifyRequest(store.get(id));
}
