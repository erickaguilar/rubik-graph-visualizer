import { create } from 'zustand';
import initWasm, { WasmCubeManager } from './pkg/wasm_core';
import wasmUrl from './pkg/wasm_core_bg.wasm?url';
import {
  saveGraphToIndexedDB,
  loadGraphFromIndexedDB,
  clearGraphFromIndexedDB,
} from './utils/indexedDb';

let wasmInstance: WasmCubeManager | null = null;
let initPromise: Promise<WasmCubeManager> | null = null;

// Thread-safe / Concurrent-safe queue to ensure WebAssembly is called sequentially
let wasmQueue: Promise<any> = Promise.resolve();

async function getWasmManager(): Promise<WasmCubeManager> {
  if (wasmInstance) return wasmInstance;
  if (!initPromise) {
    initPromise = (async () => {
      await initWasm(wasmUrl);
      wasmInstance = new WasmCubeManager();
      return wasmInstance;
    })();
  }
  return initPromise;
}

interface CubeStore {
  moveQueue: string[];
  fullSequence: string[];
  isAnimating: boolean;
  isSavedInDB: boolean;
  animationSpeed: number;
  showLinkLabels: boolean;
  keyboardShortcutsEnabled: boolean;
  onGraphUpdate?: (data: any) => void;
  setOnGraphUpdate: (callback: (data: any) => void) => void;
  addMove: (move: string) => void;
  setAnimating: (animating: boolean) => void;
  setAnimationSpeed: (speed: number) => void;
  setShowLinkLabels: (show: boolean) => void;
  setKeyboardShortcutsEnabled: (enabled: boolean) => void;
  popMove: () => string | undefined;
  commitMove: (move: string) => Promise<void>;
  solveCube: () => Promise<void>;
  resetGraph: () => Promise<void>;
  loadInitialGraph: () => Promise<any>;
  exportGraphJson: () => Promise<string | null>;
  importGraphJson: (jsonStr: string) => Promise<boolean>;
}

export const useCubeStore = create<CubeStore>((set, get) => ({
  moveQueue: [],
  fullSequence: [],
  isAnimating: false,
  isSavedInDB: false,
  animationSpeed: 6.0,
  showLinkLabels: true,
  keyboardShortcutsEnabled: true,
  setOnGraphUpdate: (callback) => set({ onGraphUpdate: callback }),
  addMove: (move) => set((state) => ({ moveQueue: [...state.moveQueue, move] })),
  setAnimating: (isAnimating) => set({ isAnimating }),
  setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
  setShowLinkLabels: (showLinkLabels) => set({ showLinkLabels }),
  setKeyboardShortcutsEnabled: (keyboardShortcutsEnabled) => set({ keyboardShortcutsEnabled }),
  popMove: () => {
    const { moveQueue } = get();
    if (moveQueue.length === 0) return undefined;
    const move = moveQueue[0];
    set({ moveQueue: moveQueue.slice(1) });
    return move;
  },
  loadInitialGraph: async () => {
    const wasm = await getWasmManager();

    // Check if previous graph data was saved in IndexedDB
    const savedData = await loadGraphFromIndexedDB();
    if (savedData && savedData.graphJson) {
      try {
        const restoredGraph = wasm.import_graph(savedData.graphJson);
        set({ fullSequence: savedData.fullSequence || [], isSavedInDB: true });
        return restoredGraph;
      } catch (err) {
        console.warn('Failed to restore graph from IndexedDB, starting fresh:', err);
      }
    }

    set({ isSavedInDB: false });
    return wasm.get_graph(null, 2);
  },
  commitMove: async (move) => {
    const { fullSequence, onGraphUpdate } = get();
    const newSequence = [...fullSequence, move];
    set({ fullSequence: newSequence });

    // Enqueue the Wasm call sequentially to prevent concurrent borrow errors
    wasmQueue = wasmQueue.then(async () => {
      try {
        const wasm = await getWasmManager();
        const responseData = wasm.apply_sequence(newSequence.join(' '));

        // Export and persist graph to IndexedDB
        try {
          const serializedJson = wasm.export_graph();
          await saveGraphToIndexedDB(serializedJson, newSequence);
          set({ isSavedInDB: true });
        } catch (dbErr) {
          console.warn('Could not persist to IndexedDB:', dbErr);
        }

        if (onGraphUpdate) {
          onGraphUpdate(responseData);
        }
      } catch (e) {
        console.error('Failed to commit move to Wasm graph', e);
      }
    });

    return wasmQueue;
  },
  solveCube: async () => {
    const { fullSequence, addMove } = get();

    wasmQueue = wasmQueue.then(async () => {
      try {
        const wasm = await getWasmManager();
        const response = wasm.solve(fullSequence.join(' '));

        if (response.error && response.moves.length === 0) {
          alert(response.error);
          return;
        }

        // Add each solving move to the animation queue
        response.moves.forEach((move: string) => {
          addMove(move);
        });
      } catch (e) {
        console.error('Failed to find solution with Wasm', e);
        alert('Error finding solution with WebAssembly solver.');
      }
    });

    return wasmQueue;
  },
  resetGraph: async () => {
    wasmQueue = wasmQueue.then(async () => {
      try {
        const wasm = await getWasmManager();
        await clearGraphFromIndexedDB();
        const initialView = wasm.clear_graph();

        set({ fullSequence: [], moveQueue: [], isSavedInDB: false });

        const { onGraphUpdate } = get();
        if (onGraphUpdate) {
          onGraphUpdate(initialView);
        }
      } catch (e) {
        console.error('Failed to reset graph:', e);
      }
    });

    return wasmQueue;
  },
  exportGraphJson: async () => {
    try {
      const wasm = await getWasmManager();
      return wasm.export_graph();
    } catch (e) {
      console.error('Failed to export graph:', e);
      return null;
    }
  },
  importGraphJson: async (jsonStr: string) => {
    try {
      const wasm = await getWasmManager();
      const restored = wasm.import_graph(jsonStr);
      await saveGraphToIndexedDB(jsonStr, []);
      set({ fullSequence: [], moveQueue: [], isSavedInDB: true });

      const { onGraphUpdate } = get();
      if (onGraphUpdate) {
        onGraphUpdate(restored);
      }
      return true;
    } catch (e) {
      console.error('Failed to import graph:', e);
      return false;
    }
  },
}));
