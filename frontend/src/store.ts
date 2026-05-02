import { create } from 'zustand';
import axios from 'axios';

interface CubeStore {
  moveQueue: string[];
  fullSequence: string[];
  isAnimating: boolean;
  onGraphUpdate?: (data: any) => void;
  setOnGraphUpdate: (callback: (data: any) => void) => void;
  addMove: (move: string) => void;
  setAnimating: (animating: boolean) => void;
  popMove: () => string | undefined;
  commitMove: (move: string) => void;
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
  commitMove: async (move) => {
    const { fullSequence, onGraphUpdate } = get();
    const newSequence = [...fullSequence, move];
    set({ fullSequence: newSequence });
    
    try {
      // Send the sequence to the backend so it computes and saves the state mathematically
      const response = await axios.post('http://localhost:8000/api/sequence', { 
        sequence: newSequence.join(' ') 
      });
      
      // If the UI gave us a callback to update the force-graph, call it with the new data
      if (onGraphUpdate) {
        onGraphUpdate(response.data);
      }
    } catch (e) {
      console.error("Failed to commit move to database", e);
    }
  }
}));
