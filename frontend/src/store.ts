import { create } from 'zustand';
import initWasm, { WasmCubeManager } from './pkg/wasm_core';
import wasmUrl from './pkg/wasm_core_bg.wasm?url';
import {
  saveGraphToIndexedDB,
  loadGraphFromIndexedDB,
  clearGraphFromIndexedDB,
} from './utils/indexedDb';
import { getInverseMove } from './utils/scramble';

export interface SolveRecord {
  id: string;
  timeMs: number;
  formattedTime: string;
  moves: number;
  tps: number;
  scramble?: string;
  date: string;
}

const STORAGE_KEY_SOLVES = 'rubik_speedcubing_solves';

export function formatTimer(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((ms % 1000) / 10);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');

  if (minutes > 0) {
    return `${minutes}:${pad(seconds)}.${pad(hundredths)}`;
  }
  return `${seconds}.${pad(hundredths)}`;
}

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
  // Move execution & Undo/Redo
  moveQueue: string[];
  moveMetaQueue: Array<'normal' | 'undo' | 'redo'>;
  currentMoveMeta: 'normal' | 'undo' | 'redo';
  fullSequence: string[];
  redoStack: string[];
  isAnimating: boolean;
  isSolving: boolean;
  cubeResetTrigger: number;
  isSavedInDB: boolean;
  animationSpeed: number;
  showLinkLabels: boolean;
  keyboardShortcutsEnabled: boolean;

  // Scramble & Challenge / Speedcubing
  isChallengeMode: boolean;
  currentScramble: string | null;
  timerStatus: 'idle' | 'inspecting' | 'solving' | 'solved';
  inspectionTimeLeft: number;
  solveStartTime: number;
  solveTimeMs: number;
  moveCount: number;
  tps: number;
  solveHistory: SolveRecord[];

  // Graph listener
  onGraphUpdate?: (data: any) => void;
  setOnGraphUpdate: (callback: (data: any) => void) => void;

  // Actions
  addMove: (move: string) => void;
  undo: () => void;
  redo: () => void;
  applyScramble: (moves: string[]) => Promise<void>;
  setAnimating: (animating: boolean) => void;
  setAnimationSpeed: (speed: number) => void;
  setShowLinkLabels: (show: boolean) => void;
  setKeyboardShortcutsEnabled: (enabled: boolean) => void;
  setChallengeMode: (enabled: boolean) => void;
  setTimerStatus: (status: 'idle' | 'inspecting' | 'solving' | 'solved') => void;
  setInspectionTimeLeft: (time: number) => void;
  setSolveTimeMs: (ms: number) => void;
  startInspection: () => void;
  startSolving: () => void;
  stopSolving: () => void;
  resetChallenge: () => void;
  clearSolveHistory: () => void;
  popMove: () => string | undefined;
  commitMove: (move: string) => Promise<void>;
  solveCube: () => Promise<void>;
  resetGraph: () => Promise<void>;
  loadInitialGraph: () => Promise<any>;
  exportGraphJson: () => Promise<string | null>;
  importGraphJson: (jsonStr: string) => Promise<boolean>;
}

export const useCubeStore = create<CubeStore>((set, get) => {
  // Load saved solves from localStorage
  let initialSolves: SolveRecord[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOLVES);
    if (raw) initialSolves = JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read solve history from localStorage', e);
  }

  return {
    moveQueue: [],
    moveMetaQueue: [],
    currentMoveMeta: 'normal',
    fullSequence: [],
    redoStack: [],
    isAnimating: false,
    isSolving: false,
    cubeResetTrigger: 0,
    isSavedInDB: false,
    animationSpeed: 6.0,
    showLinkLabels: true,
    keyboardShortcutsEnabled: true,

    // Challenge Mode & Speedcubing
    isChallengeMode: false,
    currentScramble: null,
    timerStatus: 'idle',
    inspectionTimeLeft: 15,
    solveStartTime: 0,
    solveTimeMs: 0,
    moveCount: 0,
    tps: 0,
    solveHistory: initialSolves,

    setOnGraphUpdate: (callback) => set({ onGraphUpdate: callback }),
    setAnimating: (isAnimating) => set({ isAnimating }),
    setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
    setShowLinkLabels: (showLinkLabels) => set({ showLinkLabels }),
    setKeyboardShortcutsEnabled: (keyboardShortcutsEnabled) => set({ keyboardShortcutsEnabled }),
    setChallengeMode: (isChallengeMode) => set({ isChallengeMode }),
    setTimerStatus: (timerStatus) => set({ timerStatus }),
    setInspectionTimeLeft: (inspectionTimeLeft) => set({ inspectionTimeLeft }),
    setSolveTimeMs: (solveTimeMs) => {
      const { moveCount } = get();
      const elapsedSec = solveTimeMs / 1000;
      const tps = elapsedSec > 0.1 ? Number((moveCount / elapsedSec).toFixed(2)) : 0;
      set({ solveTimeMs, tps });
    },

    addMove: (move) =>
      set((state) => ({
        moveQueue: [...state.moveQueue, move],
        moveMetaQueue: [...state.moveMetaQueue, 'normal'],
      })),

    undo: () => {
      const { fullSequence, moveQueue, isAnimating, isSolving } = get();
      if (fullSequence.length === 0 || isAnimating || isSolving || moveQueue.length > 0) return;
      const lastMove = fullSequence[fullSequence.length - 1];
      const invMove = getInverseMove(lastMove);
      set((state) => ({
        moveQueue: [...state.moveQueue, invMove],
        moveMetaQueue: [...state.moveMetaQueue, 'undo'],
      }));
    },

    redo: () => {
      const { redoStack, moveQueue, isAnimating, isSolving } = get();
      if (redoStack.length === 0 || isAnimating || isSolving || moveQueue.length > 0) return;
      const nextMove = redoStack[redoStack.length - 1];
      set((state) => ({
        moveQueue: [...state.moveQueue, nextMove],
        moveMetaQueue: [...state.moveMetaQueue, 'redo'],
      }));
    },

    applyScramble: async (moves) => {
      const scrambleStr = moves.join(' ');
      
      wasmQueue = wasmQueue.then(async () => {
        try {
          const wasm = await getWasmManager();
          const cleanView = wasm.clear_graph();
          await clearGraphFromIndexedDB();

          const { onGraphUpdate } = get();
          if (onGraphUpdate) {
            onGraphUpdate(cleanView);
          }
        } catch (e) {
          console.error('Failed to reset graph for scramble:', e);
        }

        // Reset the 3D model and enqueue the scramble from clean solved identity
        set((state) => ({
          cubeResetTrigger: state.cubeResetTrigger + 1,
          fullSequence: [],
          moveQueue: [...moves],
          moveMetaQueue: moves.map(() => 'normal' as const),
          redoStack: [],
          currentScramble: scrambleStr,
          isSavedInDB: false,
          isSolving: false,
          timerStatus: 'idle',
          inspectionTimeLeft: 15,
          moveCount: 0,
          solveTimeMs: 0,
          tps: 0,
        }));
      });

      return wasmQueue;
    },

    startInspection: () => {
      set({
        timerStatus: 'inspecting',
        inspectionTimeLeft: 15,
        solveStartTime: 0,
        solveTimeMs: 0,
        moveCount: 0,
        tps: 0,
      });
    },

    startSolving: () => {
      set({
        timerStatus: 'solving',
        solveStartTime: performance.now(),
        solveTimeMs: 0,
        moveCount: 0,
        tps: 0,
      });
    },

    stopSolving: () => {
      set({ timerStatus: 'idle', isSolving: false });
    },

    resetChallenge: () => {
      set({
        timerStatus: 'idle',
        inspectionTimeLeft: 15,
        solveStartTime: 0,
        solveTimeMs: 0,
        moveCount: 0,
        tps: 0,
        isSolving: false,
      });
    },

    clearSolveHistory: () => {
      localStorage.removeItem(STORAGE_KEY_SOLVES);
      set({ solveHistory: [] });
    },

    popMove: () => {
      const { moveQueue, moveMetaQueue } = get();
      if (moveQueue.length === 0) return undefined;
      const move = moveQueue[0];
      const meta = moveMetaQueue[0] || 'normal';
      set({
        moveQueue: moveQueue.slice(1),
        moveMetaQueue: moveMetaQueue.slice(1),
        currentMoveMeta: meta,
      });
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

    commitMove: async (completedMove) => {
      const {
        currentMoveMeta,
        fullSequence,
        redoStack,
        onGraphUpdate,
        timerStatus,
        solveStartTime,
        moveCount,
        currentScramble,
        solveHistory,
        moveQueue,
      } = get();

      let newSequence: string[] = [];
      let newRedo: string[] = redoStack;

      if (currentMoveMeta === 'undo') {
        const undoneMove = fullSequence[fullSequence.length - 1];
        newSequence = fullSequence.slice(0, -1);
        newRedo = [...redoStack, undoneMove];
      } else if (currentMoveMeta === 'redo') {
        const redoneMove = redoStack[redoStack.length - 1];
        newRedo = redoStack.slice(0, -1);
        newSequence = [...fullSequence, redoneMove];
      } else {
        // Normal move
        newSequence = [...fullSequence, completedMove];
        newRedo = []; // clear redo history on new manual move
      }

      // Handle Challenge Mode timer transitions
      let updatedTimerStatus = timerStatus;
      let updatedStartTime = solveStartTime;
      let updatedMoveCount = moveCount;

      if (timerStatus === 'inspecting') {
        // First turn immediately triggers the timer!
        updatedTimerStatus = 'solving';
        updatedStartTime = performance.now();
        updatedMoveCount = 1;
      } else if (timerStatus === 'solving') {
        updatedMoveCount = moveCount + 1;
      }

      set({
        fullSequence: newSequence,
        redoStack: newRedo,
        timerStatus: updatedTimerStatus,
        solveStartTime: updatedStartTime,
        moveCount: updatedMoveCount,
      });

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

          // Check if cube is solved in Speedcubing mode or Solver
          if (newSequence.length > 0) {
            const isSolved = wasm.is_solved(newSequence.join(' '));
            if (isSolved) {
              if (updatedTimerStatus === 'solving') {
                const finalTimeMs = performance.now() - updatedStartTime;
                const elapsedSec = finalTimeMs / 1000;
                const finalTps = elapsedSec > 0 ? Number((updatedMoveCount / elapsedSec).toFixed(2)) : 0;

                const record: SolveRecord = {
                  id: Date.now().toString(),
                  timeMs: Math.round(finalTimeMs),
                  formattedTime: formatTimer(finalTimeMs),
                  moves: updatedMoveCount,
                  tps: finalTps,
                  scramble: currentScramble || undefined,
                  date: new Date().toLocaleTimeString(),
                };

                const newHistory = [record, ...solveHistory];
                try {
                  localStorage.setItem(STORAGE_KEY_SOLVES, JSON.stringify(newHistory));
                } catch (e) {
                  console.warn('Failed to save solve to localStorage:', e);
                }

                set({
                  timerStatus: 'solved',
                  solveTimeMs: Math.round(finalTimeMs),
                  tps: finalTps,
                  solveHistory: newHistory,
                });
              }

              // If animation queue has finished all moves, clean fullSequence back to solved
              if (moveQueue.length === 0) {
                set({ fullSequence: [], redoStack: [], isSolving: false });
              }
            }
          }
        } catch (e) {
          console.error('Failed to commit move to Wasm graph', e);
        }
      });

      return wasmQueue;
    },

    solveCube: async () => {
      const { fullSequence, addMove, isAnimating, moveQueue, isSolving } = get();
      if (isAnimating || moveQueue.length > 0 || isSolving || fullSequence.length === 0) {
        return;
      }

      set({ isSolving: true });

      wasmQueue = wasmQueue.then(async () => {
        try {
          const wasm = await getWasmManager();
          const response = wasm.solve(fullSequence.join(' '));

          if (response.error && response.moves.length === 0) {
            set({ isSolving: false });
            alert(response.error);
            return;
          }

          // Add each solving move to the animation queue
          response.moves.forEach((move: string) => {
            addMove(move);
          });
        } catch (e) {
          set({ isSolving: false });
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

          set((state) => ({
            cubeResetTrigger: state.cubeResetTrigger + 1,
            fullSequence: [],
            moveQueue: [],
            moveMetaQueue: [],
            redoStack: [],
            isSavedInDB: false,
            isSolving: false,
            currentScramble: null,
            timerStatus: 'idle',
            inspectionTimeLeft: 15,
            solveStartTime: 0,
            solveTimeMs: 0,
            moveCount: 0,
            tps: 0,
          }));

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
        set((state) => ({
          cubeResetTrigger: state.cubeResetTrigger + 1,
          fullSequence: [],
          moveQueue: [],
          moveMetaQueue: [],
          redoStack: [],
          isSavedInDB: true,
          isSolving: false,
          currentScramble: null,
          timerStatus: 'idle',
        }));

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
  };
});
