/* tslint:disable */
/* eslint-disable */

export class WasmCubeManager {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Applies a sequence of moves, registers all intermediary states & transitions,
     * and returns the updated neighborhood around the final state.
     */
    apply_sequence(sequence: string): any;
    /**
     * Clears all stored nodes and edges, resetting to the initial identity state.
     */
    clear_graph(): any;
    /**
     * Exports the graph topology and all known states to a JSON string for IndexedDB storage.
     */
    export_graph(): string;
    /**
     * Returns the graph neighborhood around `center_hash` up to `depth`.
     * If `center_hash` is None/empty, returns the full graph or neighborhood of solved state.
     */
    get_graph(center_hash?: string | null, depth?: number | null): any;
    /**
     * Returns the hash string of the solved state
     */
    get_solved_hash(): string;
    /**
     * Restores graph topology from a stored JSON string (from IndexedDB).
     */
    import_graph(json_str: string): any;
    constructor();
    /**
     * Resets the graph back to initial identity state
     */
    reset(): void;
    /**
     * Solves the cube by finding the shortest path from the state reached by `sequence`
     * back to the solved identity state.
     */
    solve(sequence: string): any;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmcubemanager_free: (a: number, b: number) => void;
    readonly wasmcubemanager_apply_sequence: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmcubemanager_clear_graph: (a: number) => [number, number, number];
    readonly wasmcubemanager_export_graph: (a: number) => [number, number, number, number];
    readonly wasmcubemanager_get_graph: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly wasmcubemanager_get_solved_hash: (a: number) => [number, number];
    readonly wasmcubemanager_import_graph: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmcubemanager_new: () => number;
    readonly wasmcubemanager_reset: (a: number) => void;
    readonly wasmcubemanager_solve: (a: number, b: number, c: number) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
