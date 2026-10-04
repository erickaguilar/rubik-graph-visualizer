use std::collections::HashMap;
use std::sync::LazyLock;

pub const NUM_STICKERS: usize = 54;
pub const MOVES_LIST: [&str; 18] = [
    "U", "U'", "U2",
    "D", "D'", "D2",
    "R", "R'", "R2",
    "L", "L'", "L2",
    "F", "F'", "F2",
    "B", "B'", "B2",
];

type Permutation = [usize; NUM_STICKERS];

fn cycle_4(perm: &mut Permutation, a: usize, b: usize, c: usize, d: usize) {
    let old_a = perm[a];
    perm[a] = perm[d];
    perm[d] = perm[c];
    perm[c] = perm[b];
    perm[b] = old_a;
}

fn rotate_face_cw(perm: &mut Permutation, offset: usize) {
    let o = offset;
    // Corners: 0->2->8->6->0
    cycle_4(perm, o, o + 2, o + 8, o + 6);
    // Edges: 1->5->7->3->1
    cycle_4(perm, o + 1, o + 5, o + 7, o + 3);
}

fn generate_move_perms() -> HashMap<String, Permutation> {
    let mut base_moves: HashMap<String, Permutation> = HashMap::new();

    // U Face: offset 0
    let mut p = std::array::from_fn(|i| i);
    rotate_face_cw(&mut p, 0);
    // F(18,19,20) -> L(36,37,38) -> B(45,46,47) -> R(9,10,11) -> F
    for i in 0..3 {
        cycle_4(&mut p, 18 + i, 36 + i, 45 + i, 9 + i);
    }
    base_moves.insert("U".to_string(), p);

    // D Face: offset 27
    let mut p = std::array::from_fn(|i| i);
    rotate_face_cw(&mut p, 27);
    // F(24,25,26) -> R(15,16,17) -> B(51,52,53) -> L(42,43,44) -> F
    for i in 0..3 {
        cycle_4(&mut p, 24 + i, 15 + i, 51 + i, 42 + i);
    }
    base_moves.insert("D".to_string(), p);

    // F Face: offset 18
    let mut p = std::array::from_fn(|i| i);
    rotate_face_cw(&mut p, 18);
    // U(6,7,8) -> R(9,12,15) -> D(29,28,27) -> L(44,41,38) -> U
    cycle_4(&mut p, 6, 9, 29, 44);
    cycle_4(&mut p, 7, 12, 28, 41);
    cycle_4(&mut p, 8, 15, 27, 38);
    base_moves.insert("F".to_string(), p);

    // B Face: offset 45
    let mut p = std::array::from_fn(|i| i);
    rotate_face_cw(&mut p, 45);
    // U(2,1,0) -> L(36,39,42) -> D(33,34,35) -> R(11,14,17) -> U
    cycle_4(&mut p, 2, 36, 33, 11);
    cycle_4(&mut p, 1, 39, 34, 14);
    cycle_4(&mut p, 0, 42, 35, 17);
    base_moves.insert("B".to_string(), p);

    // R Face: offset 9
    let mut p = std::array::from_fn(|i| i);
    rotate_face_cw(&mut p, 9);
    // U(8,5,2) -> B(45,48,51) -> D(35,32,29) -> F(26,23,20) -> U
    cycle_4(&mut p, 8, 45, 35, 26);
    cycle_4(&mut p, 5, 48, 32, 23);
    cycle_4(&mut p, 2, 51, 29, 20);
    base_moves.insert("R".to_string(), p);

    // L Face: offset 36
    let mut p = std::array::from_fn(|i| i);
    rotate_face_cw(&mut p, 36);
    // U(0,3,6) -> F(18,21,24) -> D(27,30,33) -> B(53,50,47) -> U
    cycle_4(&mut p, 0, 18, 27, 53);
    cycle_4(&mut p, 3, 21, 30, 50);
    cycle_4(&mut p, 6, 24, 33, 47);
    base_moves.insert("L".to_string(), p);

    // Generate inverse (') and double (2) moves
    let mut all_moves: HashMap<String, Permutation> = HashMap::new();
    for (name, perm) in base_moves {
        // Base move
        all_moves.insert(name.clone(), perm);

        // Inverse move: argsort (if perm[i] == v, then inv[v] = i)
        let mut inv = [0usize; NUM_STICKERS];
        for (i, &v) in perm.iter().enumerate() {
            inv[v] = i;
        }
        all_moves.insert(format!("{}'", name), inv);

        // Double move: perm[perm[i]]
        let mut double = [0usize; NUM_STICKERS];
        for i in 0..NUM_STICKERS {
            double[i] = perm[perm[i]];
        }
        all_moves.insert(format!("{}2", name), double);
    }

    all_moves
}

pub static MOVES: LazyLock<HashMap<String, Permutation>> = LazyLock::new(generate_move_perms);

#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct CubeState {
    pub stickers: [u8; NUM_STICKERS],
}

impl Default for CubeState {
    fn default() -> Self {
        Self::new()
    }
}

impl CubeState {
    /// Creates a new CubeState in the solved identity configuration.
    /// 6 faces x 9 stickers with face IDs: 0, 1, 2, 3, 4, 5.
    pub fn new() -> Self {
        let mut stickers = [0u8; NUM_STICKERS];
        for face in 0..6u8 {
            for i in 0..9 {
                stickers[(face as usize) * 9 + i] = face;
            }
        }
        Self { stickers }
    }

    pub fn from_stickers(stickers: [u8; NUM_STICKERS]) -> Self {
        Self { stickers }
    }

    pub fn is_solved(&self) -> bool {
        for face in 0..6u8 {
            for i in 0..9 {
                if self.stickers[(face as usize) * 9 + i] != face {
                    return false;
                }
            }
        }
        true
    }

    /// Returns the exact hex string representation corresponding to Python's `.tobytes().hex()`.
    pub fn get_hash(&self) -> String {
        let mut s = String::with_capacity(NUM_STICKERS * 2);
        for &byte in &self.stickers {
            use std::fmt::Write;
            write!(&mut s, "{:02x}", byte).unwrap();
        }
        s
    }

    /// Applies a move (e.g. "U", "R'", "F2") and returns the resulting new CubeState.
    pub fn apply_move(&self, move_name: &str) -> Result<CubeState, String> {
        let perm = MOVES.get(move_name).ok_or_else(|| format!("Invalid move: {}", move_name))?;
        let mut next_stickers = [0u8; NUM_STICKERS];
        for i in 0..NUM_STICKERS {
            next_stickers[i] = self.stickers[perm[i]];
        }
        Ok(CubeState { stickers: next_stickers })
    }

    /// Applies a space-separated sequence of moves.
    pub fn apply_sequence(&self, sequence: &str) -> Result<CubeState, String> {
        let trimmed = sequence.trim();
        if trimmed.is_empty() {
            return Ok(*self);
        }

        let mut current = *self;
        for m in trimmed.split_whitespace() {
            current = current.apply_move(m)?;
        }
        Ok(current)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let cube = CubeState::new();
        assert!(cube.is_solved());
        assert_eq!(
            cube.get_hash(),
            "000000000000000000010101010101010101020202020202020202030303030303030303040404040404040404050505050505050505"
        );
    }

    #[test]
    fn test_single_move() {
        let cube = CubeState::new();
        let u_cube = cube.apply_move("U").unwrap();
        assert!(!u_cube.is_solved());
        assert_ne!(u_cube.get_hash(), cube.get_hash());
        assert_eq!(
            u_cube.get_hash(),
            "000000000000000000050505010101010101010101020202020202030303030303030303020202040404040404040404050505050505"
        );
    }

    #[test]
    fn test_inverse_moves() {
        let cube = CubeState::new();
        for m in ["U", "D", "F", "B", "R", "L"] {
            let state = cube.apply_sequence(&format!("{} {}'", m, m)).unwrap();
            assert!(state.is_solved(), "Failed inverse for {}", m);
        }
    }

    #[test]
    fn test_double_moves() {
        let cube = CubeState::new();
        for m in ["U", "D", "F", "B", "R", "L"] {
            let state = cube.apply_sequence(&format!("{}2 {}2", m, m)).unwrap();
            assert!(state.is_solved(), "Failed double move identity for {}2", m);
        }
    }

    #[test]
    fn test_commutator() {
        let cube = CubeState::new();
        let seq = "R U R' U' ".repeat(6);
        let state = cube.apply_sequence(&seq).unwrap();
        assert!(state.is_solved(), "Failed (R U R' U')x6 identity");
    }

    #[test]
    fn test_t_perm() {
        let cube = CubeState::new();
        let t_perm = "R U R' U' R' F R2 U' R' U' R U R' F'";
        let state = cube.apply_sequence(&format!("{} {}", t_perm, t_perm)).unwrap();
        assert!(state.is_solved(), "Failed T Permutation x2 identity");
    }

    #[test]
    fn test_checkerboard() {
        let cube = CubeState::new();
        let checkerboard = "U2 D2 F2 B2 R2 L2";
        let state = cube.apply_sequence(&format!("{} {}", checkerboard, checkerboard)).unwrap();
        assert!(state.is_solved(), "Failed checkerboard x2 identity");
    }
}
