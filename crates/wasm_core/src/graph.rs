use std::collections::{HashMap, HashSet, VecDeque};
use serde::{Deserialize, Serialize};
use crate::cube::{CubeState, MOVES};
use crate::types::{GraphData, LinkData, NodeData};

#[derive(Clone, Debug)]
struct Edge {
    source: String,
    target: String,
    move_name: String,
}

pub struct TopologyGraph {
    nodes: HashMap<String, NodeData>,
    edges: Vec<Edge>,
    // Adjacency for bidirectional traversal: hash -> list of (neighbor_hash, move_to_reach_neighbor)
    adj: HashMap<String, Vec<(String, String)>>,
    solved_hash: String,
}

impl Default for TopologyGraph {
    fn default() -> Self {
        Self::new()
    }
}

impl TopologyGraph {
    pub fn new() -> Self {
        let mut graph = Self {
            nodes: HashMap::new(),
            edges: Vec::new(),
            adj: HashMap::new(),
            solved_hash: String::new(),
        };

        // Always register the solved identity state at the exact 3D origin (0, 0, 0)
        let solved = CubeState::new();
        let hash = graph.add_state(&solved);
        graph.solved_hash = hash;
        graph
    }

    pub fn add_state(&mut self, state: &CubeState) -> String {
        let hash = state.get_hash();
        if !self.nodes.contains_key(&hash) {
            let is_solved = state.is_solved();
            self.nodes.insert(
                hash.clone(),
                NodeData {
                    id: hash.clone(),
                    is_solved,
                    val: if is_solved { 10 } else { 3 },
                    color: if is_solved {
                        "#00ff00".to_string()
                    } else {
                        "#1f78b4".to_string()
                    },
                    // Pin the solved identity state to (0,0,0) so the graph never drifts or loses the center
                    fx: if is_solved { Some(0.0) } else { None },
                    fy: if is_solved { Some(0.0) } else { None },
                    fz: if is_solved { Some(0.0) } else { None },
                },
            );
        }
        hash
    }

    pub fn invert_move(move_name: &str) -> String {
        if let Some(base) = move_name.strip_suffix('\'') {
            base.to_string()
        } else if move_name.ends_with('2') {
            move_name.to_string()
        } else {
            format!("{}'", move_name)
        }
    }

    pub fn add_transition(&mut self, from_hash: &str, to_hash: &str, move_name: &str) {
        // Prevent duplicate edges
        let exists = self.edges.iter().any(|e| {
            e.source == from_hash && e.target == to_hash && e.move_name == move_name
        });

        if !exists {
            self.edges.push(Edge {
                source: from_hash.to_string(),
                target: to_hash.to_string(),
                move_name: move_name.to_string(),
            });

            // Forward connection
            self.adj
                .entry(from_hash.to_string())
                .or_default()
                .push((to_hash.to_string(), move_name.to_string()));

            // Reverse connection with inverse move
            let inv_move = Self::invert_move(move_name);
            self.adj
                .entry(to_hash.to_string())
                .or_default()
                .push((from_hash.to_string(), inv_move));
        }
    }

    /// Applies a sequence of moves starting from solved identity, records states and transitions,
    /// and returns (final_state_hash, graph_data).
    /// The solved center state and the full sequence path are ALWAYS preserved in the view.
    pub fn apply_sequence(&mut self, sequence: &str) -> Result<(String, GraphData), String> {
        let mut current = CubeState::new();
        let mut current_hash = self.add_state(&current);
        let mut path_nodes = vec![current_hash.clone()];

        let moves = sequence.trim().split_whitespace();
        for m in moves {
            if !MOVES.contains_key(m) {
                return Err(format!("Invalid move: {}", m));
            }

            let next_state = current.apply_move(m)?;
            let next_hash = self.add_state(&next_state);
            self.add_transition(&current_hash, &next_hash, m);

            current = next_state;
            current_hash = next_hash;
            path_nodes.push(current_hash.clone());
        }

        // Generate graph data ensuring the solved center and entire active path are ALWAYS included
        let view_data = self.get_view(&current_hash, &path_nodes, 3);
        Ok((current_hash, view_data))
    }

    /// Extracts a view of the graph that guarantees the solved center state and path nodes
    /// are never dropped, while highlighting the current state.
    pub fn get_view(&self, current_hash: &str, path_nodes: &[String], depth: usize) -> GraphData {
        // If graph is small (<= 1000 nodes, standard for interactive sessions), display full graph
        // This lets the user see their entire exploration tree without arbitrary truncations.
        let visited_set: HashSet<String> = if self.nodes.len() <= 1000 {
            self.nodes.keys().cloned().collect()
        } else {
            // BFS from current_hash up to `depth`
            let mut set = HashSet::new();
            let mut visited_depth: HashMap<String, usize> = HashMap::new();
            let mut queue: VecDeque<(String, usize)> = VecDeque::new();

            visited_depth.insert(current_hash.to_string(), 0);
            queue.push_back((current_hash.to_string(), 0));
            set.insert(current_hash.to_string());

            while let Some((curr, d)) = queue.pop_front() {
                if d < depth {
                    if let Some(neighbors) = self.adj.get(&curr) {
                        for (next_hash, _) in neighbors {
                            if !visited_depth.contains_key(next_hash) {
                                visited_depth.insert(next_hash.clone(), d + 1);
                                queue.push_back((next_hash.clone(), d + 1));
                                set.insert(next_hash.clone());
                            }
                        }
                    }
                }
            }

            // CRITICAL: Always preserve the solved center node
            set.insert(self.solved_hash.clone());

            // Always preserve all nodes in the active path from center to current
            for p in path_nodes {
                set.insert(p.clone());
            }

            set
        };

        // Construct nodes and highlight the current node
        let nodes: Vec<NodeData> = visited_set
            .iter()
            .filter_map(|h| {
                self.nodes.get(h).map(|n| {
                    let mut node = n.clone();
                    // If this is the current state and it's not the solved state, highlight in gold/yellow
                    if node.id == current_hash && !node.is_solved {
                        node.color = "#FFD500".to_string();
                        node.val = 6;
                    }
                    node
                })
            })
            .collect();

        // Include edges where both source and target are in visited_set
        let links: Vec<LinkData> = self
            .edges
            .iter()
            .filter(|e| visited_set.contains(&e.source) && visited_set.contains(&e.target))
            .map(|e| LinkData {
                source: e.source.clone(),
                target: e.target.clone(),
                r#move: e.move_name.clone(),
                color: "#999999".to_string(),
            })
            .collect();

        GraphData { nodes, links }
    }

    /// Returns nodes and links within `depth` steps from `center_hash`.
    /// Guaranteed to preserve the solved identity state.
    pub fn get_neighborhood(&self, center_hash: Option<&str>, depth: usize) -> GraphData {
        let center = center_hash.unwrap_or(&self.solved_hash);
        let path = vec![center.to_string(), self.solved_hash.clone()];
        self.get_view(center, &path, depth)
    }

    /// Finds the shortest path of moves and node state hashes from `start_hash` to `target_hash` in the known graph.
    pub fn find_shortest_path(
        &self,
        start_hash: &str,
        target_hash: &str,
    ) -> Result<(Vec<String>, Vec<String>), String> {
        if start_hash == target_hash {
            return Ok((Vec::new(), vec![start_hash.to_string()]));
        }

        if !self.nodes.contains_key(start_hash) {
            return Err("Start state is not in the known graph.".to_string());
        }
        if !self.nodes.contains_key(target_hash) {
            return Err("Target state is not in the known graph.".to_string());
        }

        // BFS to find the shortest path
        let mut parent_map: HashMap<String, (String, String)> = HashMap::new();
        let mut visited: HashSet<String> = HashSet::new();
        let mut queue: VecDeque<String> = VecDeque::new();

        visited.insert(start_hash.to_string());
        queue.push_back(start_hash.to_string());

        let mut found = false;

        while let Some(curr) = queue.pop_front() {
            if curr == target_hash {
                found = true;
                break;
            }

            if let Some(neighbors) = self.adj.get(&curr) {
                for (next_hash, move_name) in neighbors {
                    if !visited.contains(next_hash) {
                        visited.insert(next_hash.clone());
                        parent_map.insert(
                            next_hash.clone(),
                            (curr.clone(), move_name.clone()),
                        );
                        queue.push_back(next_hash.clone());
                    }
                }
            }
        }

        if !found {
            return Err(
                "No path found in the known graph. Explore more nodes first!".to_string(),
            );
        }

        // Reconstruct path
        let mut path_moves = Vec::new();
        let mut path_nodes = vec![target_hash.to_string()];
        let mut curr = target_hash.to_string();

        while curr != start_hash {
            let (parent, move_name) = parent_map.get(&curr).unwrap();
            path_moves.push(move_name.clone());
            curr = parent.clone();
            path_nodes.push(curr.clone());
        }

        path_moves.reverse();
        path_nodes.reverse();
        Ok((path_moves, path_nodes))
    }

    /// Exports the graph topology and nodes into a compact JSON string.
    pub fn export_data(&self) -> Result<String, String> {
        let serialized = SerializedGraph {
            nodes: self.nodes.values().cloned().collect(),
            edges: self
                .edges
                .iter()
                .map(|e| SerializedEdge {
                    source: e.source.clone(),
                    target: e.target.clone(),
                    move_name: e.move_name.clone(),
                })
                .collect(),
            solved_hash: self.solved_hash.clone(),
        };
        serde_json::to_string(&serialized).map_err(|e| e.to_string())
    }

    /// Restores the graph topology from a serialized JSON string.
    pub fn import_data(&mut self, json_str: &str) -> Result<GraphData, String> {
        let serialized: SerializedGraph =
            serde_json::from_str(json_str).map_err(|e| e.to_string())?;

        self.nodes.clear();
        self.edges.clear();
        self.adj.clear();
        self.solved_hash = serialized.solved_hash;

        for node in serialized.nodes {
            self.nodes.insert(node.id.clone(), node);
        }

        for edge in serialized.edges {
            self.add_transition(&edge.source, &edge.target, &edge.move_name);
        }

        // Ensure the solved identity state is present and anchored
        if self.nodes.is_empty() || !self.nodes.contains_key(&self.solved_hash) {
            let solved = CubeState::new();
            self.solved_hash = self.add_state(&solved);
        }

        Ok(self.get_neighborhood(None, 2))
    }

    /// Resets the graph back to initial identity state and returns the fresh view.
    pub fn clear(&mut self) -> GraphData {
        self.nodes.clear();
        self.edges.clear();
        self.adj.clear();

        let solved = CubeState::new();
        self.solved_hash = self.add_state(&solved);
        self.get_neighborhood(None, 2)
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SerializedGraph {
    pub nodes: Vec<NodeData>,
    pub edges: Vec<SerializedEdge>,
    pub solved_hash: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SerializedEdge {
    pub source: String,
    pub target: String,
    pub move_name: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_graph_initial_state() {
        let graph = TopologyGraph::new();
        assert_eq!(graph.nodes.len(), 1);
        assert_eq!(graph.edges.len(), 0);
        let solved_node = graph.nodes.values().next().unwrap();
        assert_eq!(solved_node.fx, Some(0.0));
        assert_eq!(solved_node.fy, Some(0.0));
        assert_eq!(solved_node.fz, Some(0.0));
    }

    #[test]
    fn test_apply_sequence_and_solve() {
        let mut graph = TopologyGraph::new();
        let solved = CubeState::new();
        let target_hash = solved.get_hash();

        // Apply sequence "R U R' U'"
        let (current_hash, _neighborhood) = graph.apply_sequence("R U R' U'").unwrap();
        assert_ne!(current_hash, target_hash);

        // Find shortest path to solved
        let (solution_moves, solution_nodes) = graph.find_shortest_path(&current_hash, &target_hash).unwrap();
        assert!(!solution_moves.is_empty());
        assert_eq!(solution_nodes.len(), solution_moves.len() + 1);
        assert_eq!(solution_nodes.first().unwrap(), &current_hash);
        assert_eq!(solution_nodes.last().unwrap(), &target_hash);

        // Verify that applying solution_moves to the scrambled cube recovers the solved state
        let scrambled = solved.apply_sequence("R U R' U'").unwrap();
        let solution_str = solution_moves.join(" ");
        let restored = scrambled.apply_sequence(&solution_str).unwrap();
        assert!(restored.is_solved(), "Solution failed to solve the cube!");
    }

    #[test]
    fn test_solve_after_scramble_sequence() {
        let mut graph = TopologyGraph::new();
        let solved = CubeState::new();
        let target_hash = solved.get_hash();

        let sequence = "U L R F D R' U2 F L2 B D2 R F' L U R2 B' D F2 R";
        let (current_hash, _) = graph.apply_sequence(sequence).unwrap();
        assert_ne!(current_hash, target_hash);

        let (solution_moves, solution_nodes) = graph.find_shortest_path(&current_hash, &target_hash).unwrap();
        assert_eq!(solution_nodes.len(), solution_moves.len() + 1);
        println!("Solution moves: {:?}", solution_moves);
        let scrambled = solved.apply_sequence(sequence).unwrap();
        let solution_str = solution_moves.join(" ");
        let restored = scrambled.apply_sequence(&solution_str).unwrap();
        assert!(restored.is_solved(), "Solution failed to solve the cube!");
    }

    #[test]
    fn test_center_preserved_after_many_moves() {
        let mut graph = TopologyGraph::new();
        let solved_hash = CubeState::new().get_hash();

        // Apply 5 consecutive moves: U -> R -> F -> D -> L (far beyond old depth=2)
        let (current_hash, view) = graph.apply_sequence("U R F D L").unwrap();

        // Check that the solved center is STILL in the graph
        assert!(
            view.nodes.iter().any(|n| n.id == solved_hash && n.is_solved),
            "The solved center state was lost!"
        );

        // Check that the current state is also present and highlighted
        assert!(
            view.nodes.iter().any(|n| n.id == current_hash),
            "The current state was lost!"
        );

        // Check that all 5 moves created edges
        assert!(view.links.len() >= 5);
    }

    #[test]
    fn test_export_and_import() {
        let mut graph = TopologyGraph::new();
        graph.apply_sequence("U R F").unwrap();

        let json = graph.export_data().unwrap();
        assert!(!json.is_empty());

        let mut restored = TopologyGraph::new();
        let view = restored.import_data(&json).unwrap();
        assert_eq!(view.nodes.len(), graph.nodes.len());
        assert_eq!(view.links.len(), graph.edges.len());

        // Test clear
        let cleared_view = restored.clear();
        assert_eq!(cleared_view.nodes.len(), 1);
        assert_eq!(cleared_view.links.len(), 0);
    }
}

