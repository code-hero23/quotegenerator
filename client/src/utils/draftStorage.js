/**
 * Hybrid Draft Storage:
 * - Uses localStorage for synchronous, instant initial load of form metadata & text.
 * - Uses IndexedDB for persisting actual File / Blob attachments across tab closes & refreshes.
 */

const LOCAL_STORAGE_KEY = 'cookscape_quote_draft';
const DB_NAME = 'CookscapeDraftDB';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const DRAFT_RECORD_KEY = 'active_quote_draft';

function openDraftDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Synchronous read from localStorage for instant initial render.
 */
export function getSyncDraft() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.warn('Failed to read draft from localStorage:', err);
    return null;
  }
}

/**
 * Synchronously write lightweight metadata to localStorage.
 */
export function saveSyncDraft(data) {
  try {
    const payload = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    // Strip raw File objects before stringifying for localStorage
    const cleanPayload = {
      ...payload,
      unitPages: (payload.unitPages || []).map(p => ({
        ...p,
        file: null,
        // Only keep remote URLs, skip temporary blob URLs that expire across restarts
        previewUrl: p.filePath ? p.previewUrl : null
      })),
      accessoryPages: (payload.accessoryPages || []).map(p => ({
        ...p,
        file: null,
        previewUrl: p.filePath ? p.previewUrl : null
      })),
      snipFiles: Object.entries(payload.snipFiles || {}).reduce((acc, [vid, pages]) => {
        acc[vid] = (Array.isArray(pages) ? pages : [pages]).map(p => ({
          ...p,
          file: null,
          previewUrl: p.filePath ? p.previewUrl : null
        }));
        return acc;
      }, {})
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanPayload));
  } catch (err) {
    console.warn('Failed to save draft to localStorage:', err);
  }
}

/**
 * Asynchronously save full draft including File/Blob objects to IndexedDB.
 */
export async function saveIndexedDBDraft(data) {
  try {
    const db = await openDraftDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        ...data,
        updatedAt: new Date().toISOString()
      }, DRAFT_RECORD_KEY);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Non-fatal if IndexedDB fails
    console.warn('IndexedDB draft save error:', err);
  }
}

/**
 * Asynchronously restore files and attachments from IndexedDB.
 */
export async function loadIndexedDBDraft() {
  try {
    const db = await openDraftDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(DRAFT_RECORD_KEY);

      req.onsuccess = () => {
        const result = req.result;
        if (!result) return resolve(null);

        // Re-generate working blob preview URLs for restored files
        if (Array.isArray(result.unitPages)) {
          result.unitPages = result.unitPages.map(p => {
            if (p.file instanceof Blob && !p.filePath) {
              return { ...p, previewUrl: URL.createObjectURL(p.file) };
            }
            return p;
          });
        }

        if (Array.isArray(result.accessoryPages)) {
          result.accessoryPages = result.accessoryPages.map(p => {
            if (p.file instanceof Blob && !p.filePath) {
              return { ...p, previewUrl: URL.createObjectURL(p.file) };
            }
            return p;
          });
        }

        if (result.snipFiles && typeof result.snipFiles === 'object') {
          const restoredSnips = {};
          Object.entries(result.snipFiles).forEach(([vid, pages]) => {
            restoredSnips[vid] = (Array.isArray(pages) ? pages : [pages]).map(p => {
              if (p.file instanceof Blob && !p.filePath) {
                return { ...p, previewUrl: URL.createObjectURL(p.file) };
              }
              return p;
            });
          });
          result.snipFiles = restoredSnips;
        }

        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB draft load error:', err);
    return null;
  }
}

/**
 * Completely clear drafts from both localStorage and IndexedDB.
 */
export async function clearAllDrafts() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    const db = await openDraftDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(DRAFT_RECORD_KEY);
  } catch (err) {
    console.warn('Failed to clear full draft storage:', err);
  }
}
