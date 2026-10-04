use std::collections::{HashMap, HashSet, VecDeque};
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
        };

        // Always register the solved identity state
        let solved = CubeState::new();
        graph.add_state(&solved);
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
    /// and returns (final_state_hash, neighborhood_graph_data).
    pub fn apply_sequence(&mut self, sequence: &str) -> Result<(String, GraphData), String> {
        let mut current = CubeState::new();
        let mut current_hash = self.add_state(&current);

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
        }

        let neighborhood = self.get_neighborhood(Some(&current_hash), 2);
        Ok((current_hash, neighborhood))
    }

    /// Returns nodes and links within `depth` steps from `center_hash`.
    /// If `center_hash` is None, returns the entire graph.
    pub fn get_neighborhood(&self, center_hash: Option<&str>, depth: usize) -> GraphData {
        let center = match center_hash {
            Some(h) if self.nodes.contains_key(h) => h,
            _ => {
                // Return all registered nodes and links
                let nodes: Vec<NodeData> = self.nodes.values().cloned().collect();
                let links: Vec<LinkData> = self
                    .edges
                    .iter()
                    .map(|e| LinkData {
                        source: e.source.clone(),
                        target: e.target.clone(),
                        r#move: e.move_name.clone(),
                        color: "#999999".to_string(),
                    })
                    .collect();
                return GraphData { nodes, links };
            }
        };

        // BFS to find all nodes up to `depth`
        let mut visited_depth: HashMap<String, usize> = HashMap::new();
        let mut queue: VecDeque<(String, usize)> = VecDeque::new();

        visited_depth.insert(center.to_string(), 0);
        queue.push_back((center.to_string(), 0));

        while let Some((curr, d)) = queue.pop_front() {
            if d < depth {
                if let Some(neighbors) = self.adj.get(&curr) {
                    for (next_hash, _) in neighbors {
                        if !visited_depth.contains_key(next_hash) {
                            visited_depth.insert(next_hash.clone(), d + 1);
                            queue.push_back((next_hash.clone(), d + 1));
                        }
                    }
                }
            }
        }

        let visited_set: HashSet<&String> = visited_depth.keys().collect();

        let nodes: Vec<NodeData> = visited_set
            .iter()
            .filter_map(|&h| self.nodes.get(h).cloned())
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

    /// Finds the shortest path of moves from `start_hash` to `target_hash` in the known graph.
    pub fn find_shortest_path(
        &self,
        start_hash: &str,
        target_hash: &str,
    ) -> Result<Vec<String>, String> {
        if start_hash == target_hash {
            return Ok(Vec::new());
        }

        if !self.nodes.contains_key(start_hash) {
            return Err("Start state is not in the known graph.".to_string());
        }
        if !self.nodes.contains_key(target_hash) {
            return Err("Target state is not in the known graph.".to_string());
        }

        // BFS to find the shortest path
        // parent map: current_hash -> (parent_hash, move_from_parent)
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
        let mut curr = target_hash.to_string();

        while curr != start_hash {
            let (parent, move_name) = parent_map.get(&curr).unwrap();
            path_moves.push(move_name.clone());
            curr = parent.clone();
        }

        path_moves.reverse();
        Ok(path_moves)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_graph_initial_state() {
        let graph = TopologyGraph::new();
        assert_eq!(graph.nodes.len(), 1);
        assert_eq!(graph.edges.len(), 0);
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
        let solution_moves = graph.find_shortest_path(&current_hash, &target_hash).unwrap();
        assert!(!solution_moves.is_empty());

        // Verify that applying solution_moves to the scrambled cube recovers the solved state
        let scrambled = solved.apply_sequence("R U R' U'").unwrap();
        let solution_str = solution_moves.join(" ");
        let restored = scrambled.apply_sequence(&solution_str).unwrap();
        assert!(restored.is_solved(), "Solution failed to solve the cube!");
    }

    #[test]
    fn test_neighborhood_depth() {
        let mut graph = TopologyGraph::new();
        let (hash, neighborhood) = graph.apply_sequence("U R F").unwrap();

        assert!(!neighborhood.nodes.is_empty());
        assert!(!neighborhood.links.is_empty());
        assert!(neighborhood.nodes.iter().any(|n| n.id == hash));
    }
}
