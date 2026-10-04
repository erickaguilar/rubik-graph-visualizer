pub mod cube;
pub mod graph;
pub mod types;

use cube::CubeState;
use graph::TopologyGraph;
use types::{GraphData, SolveResult};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WasmCubeManager {
    graph: TopologyGraph,
}

#[wasm_bindgen]
impl WasmCubeManager {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();

        Self {
            graph: TopologyGraph::new(),
        }
    }

    /// Resets the graph back to initial identity state
    pub fn reset(&mut self) {
        self.graph = TopologyGraph::new();
    }

    /// Exports the graph topology and all known states to a JSON string for IndexedDB storage.
    pub fn export_graph(&self) -> Result<String, JsValue> {
        self.graph.export_data().map_err(|e| JsValue::from_str(&e))
    }

    /// Restores graph topology from a stored JSON string (from IndexedDB).
    pub fn import_graph(&mut self, json_str: &str) -> Result<JsValue, JsValue> {
        let view = self
            .graph
            .import_data(json_str)
            .map_err(|e| JsValue::from_str(&e))?;
        serde_wasm_bindgen::to_value(&view).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Clears all stored nodes and edges, resetting to the initial identity state.
    pub fn clear_graph(&mut self) -> Result<JsValue, JsValue> {
        let view = self.graph.clear();
        serde_wasm_bindgen::to_value(&view).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Returns the hash string of the solved state
    pub fn get_solved_hash(&self) -> String {
        CubeState::new().get_hash()
    }

    /// Returns the graph neighborhood around `center_hash` up to `depth`.
    /// If `center_hash` is None/empty, returns the full graph or neighborhood of solved state.
    pub fn get_graph(
        &self,
        center_hash: Option<String>,
        depth: Option<usize>,
    ) -> Result<JsValue, JsValue> {
        let center = center_hash.as_deref().filter(|h| !h.is_empty());
        let d = depth.unwrap_or(2);
        let data: GraphData = self.graph.get_neighborhood(center, d);
        serde_wasm_bindgen::to_value(&data).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Applies a sequence of moves, registers all intermediary states & transitions,
    /// and returns the updated neighborhood around the final state.
    pub fn apply_sequence(&mut self, sequence: &str) -> Result<JsValue, JsValue> {
        let (_, neighborhood) = self
            .graph
            .apply_sequence(sequence)
            .map_err(|e| JsValue::from_str(&e))?;

        serde_wasm_bindgen::to_value(&neighborhood)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Solves the cube by finding the shortest path from the state reached by `sequence`
    /// back to the solved identity state.
    pub fn solve(&self, sequence: &str) -> Result<JsValue, JsValue> {
        let solved = CubeState::new();
        let target_hash = solved.get_hash();

        let current_state = match solved.apply_sequence(sequence) {
            Ok(s) => s,
            Err(e) => {
                let res = SolveResult {
                    moves: Vec::new(),
                    error: Some(format!("Invalid sequence: {}", e)),
                };
                return serde_wasm_bindgen::to_value(&res)
                    .map_err(|e| JsValue::from_str(&e.to_string()));
            }
        };

        let current_hash = current_state.get_hash();

        if current_hash == target_hash {
            let res = SolveResult {
                moves: Vec::new(),
                error: Some("Cube is already solved.".to_string()),
            };
            return serde_wasm_bindgen::to_value(&res)
                .map_err(|e| JsValue::from_str(&e.to_string()));
        }

        match self.graph.find_shortest_path(&current_hash, &target_hash) {
            Ok(moves) => {
                let res = SolveResult {
                    moves,
                    error: None,
                };
                serde_wasm_bindgen::to_value(&res)
                    .map_err(|e| JsValue::from_str(&e.to_string()))
            }
            Err(e) => {
                let res = SolveResult {
                    moves: Vec::new(),
                    error: Some(e),
                };
                serde_wasm_bindgen::to_value(&res)
                    .map_err(|e| JsValue::from_str(&e.to_string()))
            }
        }
    }
}
