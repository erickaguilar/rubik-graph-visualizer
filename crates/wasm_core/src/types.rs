use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct NodeData {
    pub id: String,
    pub is_solved: bool,
    pub val: u32,
    pub color: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct LinkData {
    pub source: String,
    pub target: String,
    pub r#move: String,
    pub color: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct GraphData {
    pub nodes: Vec<NodeData>,
    pub links: Vec<LinkData>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SolveResult {
    pub moves: Vec<String>,
    pub error: Option<String>,
}
