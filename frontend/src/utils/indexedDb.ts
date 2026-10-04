const DB_NAME = 'RubikGraphDB';
const DB_VERSION = 1;
const STORE_NAME = 'graph_store';
const KEY = 'active_graph';

interface SavedPayload {
  graphJson: string;
  fullSequence: string[];
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveGraphToIndexedDB(graphJson: string, fullSequence: string[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const payload: SavedPayload = {
        graphJson,
        fullSequence,
        updatedAt: Date.now(),
      };
      const req = store.put(payload, KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save graph to IndexedDB:', err);
  }
}

export async function loadGraphFromIndexedDB(): Promise<{ graphJson: string; fullSequence: string[] } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);

      req.onsuccess = () => {
        const result = req.result as SavedPayload | undefined;
        if (result && result.graphJson) {
          resolve({ graphJson: result.graphJson, fullSequence: result.fullSequence || [] });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not load graph from IndexedDB:', err);
    return null;
  }
}

export async function clearGraphFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not clear graph in IndexedDB:', err);
  }
}
