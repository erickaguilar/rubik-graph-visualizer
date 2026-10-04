import { create } from 'zustand';
import initWasm, { WasmCubeManager } from './pkg/wasm_core';

let wasmManager: WasmCubeManager | null = null;

async function getWasmManager(): Promise<WasmCubeManager> {
  if (!wasmManager) {
    await initWasm();
    wasmManager = new WasmCubeManager();
  }
  return wasmManager;
}

interface CubeStore {
  moveQueue: string[];
  fullSequence: string[];
  isAnimating: boolean;
  onGraphUpdate?: (data: any) => void;
  setOnGraphUpdate: (callback: (data: any) => void) => void;
  addMove: (move: string) => void;
  setAnimating: (animating: boolean) => void;
  popMove: () => string | undefined;
  commitMove: (move: string) => Promise<void>;
  solveCube: () => Promise<void>;
  loadInitialGraph: () => Promise<any>;
}

export const useCubeStore = create<CubeStore>((set, get) => ({
  moveQueue: [],
  fullSequence: [],
  isAnimating: false,
  setOnGraphUpdate: (callback) => set({ onGraphUpdate: callback }),
  addMove: (move) => set((state) => ({ moveQueue: [...state.moveQueue, move] })),
  setAnimating: (isAnimating) => set({ isAnimating }),
  popMove: () => {
    const { moveQueue } = get();
    if (moveQueue.length === 0) return undefined;
    const move = moveQueue[0];
    set({ moveQueue: moveQueue.slice(1) });
    return move;
  },
  loadInitialGraph: async () => {
    const wasm = await getWasmManager();
    return wasm.get_graph(null, 2);
  },
  commitMove: async (move) => {
    const { fullSequence, onGraphUpdate } = get();
    const newSequence = [...fullSequence, move];
    set({ fullSequence: newSequence });
    
    try {
      const wasm = await getWasmManager();
      // Apply the sequence in Rust WebAssembly
      const responseData = wasm.apply_sequence(newSequence.join(' '));
      
      // Update the 3D force graph immediately with the new neighborhood
      if (onGraphUpdate) {
        onGraphUpdate(responseData);
      }
    } catch (e) {
      console.error("Failed to commit move to Wasm graph", e);
    }
  },
  solveCube: async () => {
    const { fullSequence, addMove } = get();
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
      console.error("Failed to find solution with Wasm", e);
      alert("Error finding solution with WebAssembly solver.");
    }
  }
}));
