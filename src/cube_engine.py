import numpy as np

# Faces are U(0), R(1), F(2), D(3), L(4), B(5)
# Each face has 9 stickers, numbered 0-8.
# U: 0-8, R: 9-17, F: 18-26, D: 27-35, L: 36-44, B: 45-53

def _cycle_4(perm, a, b, c, d):
    """Cycle 4 items: a->b->c->d->a. This means new b gets old a."""
    old_a = perm[a]
    perm[a] = perm[d]
    perm[d] = perm[c]
    perm[c] = perm[b]
    perm[b] = old_a

def _rotate_face_cw(perm, offset):
    o = offset
    # Corners: 0->2->8->6->0
    _cycle_4(perm, o+0, o+2, o+8, o+6)
    # Edges: 1->5->7->3->1
    _cycle_4(perm, o+1, o+5, o+7, o+3)

def _generate_move_perms():
    moves = {}
    
    # U Face: 0
    p = list(range(54))
    _rotate_face_cw(p, 0)
    # F(18,19,20) -> L(36,37,38) -> B(45,46,47) -> R(9,10,11) -> F
    for i in range(3):
        _cycle_4(p, 18+i, 36+i, 45+i, 9+i)
    moves['U'] = p
    
    # D Face: 27
    p = list(range(54))
    _rotate_face_cw(p, 27)
    # F(24,25,26) -> R(15,16,17) -> B(51,52,53) -> L(42,43,44) -> F
    for i in range(3):
        _cycle_4(p, 24+i, 15+i, 51+i, 42+i)
    moves['D'] = p
    
    # F Face: 18
    p = list(range(54))
    _rotate_face_cw(p, 18)
    # U(6,7,8) -> R(9,12,15) -> D(29,28,27) -> L(44,41,38) -> U
    _cycle_4(p, 6, 9, 29, 44)
    _cycle_4(p, 7, 12, 28, 41)
    _cycle_4(p, 8, 15, 27, 38)
    moves['F'] = p
    
    # B Face: 45
    p = list(range(54))
    _rotate_face_cw(p, 45)
    # U(2,1,0) -> L(36,39,42) -> D(33,34,35) -> R(11,14,17) -> U
    _cycle_4(p, 2, 36, 33, 11)
    _cycle_4(p, 1, 39, 34, 14)
    _cycle_4(p, 0, 42, 35, 17)
    moves['B'] = p

    # R Face: 9
    p = list(range(54))
    _rotate_face_cw(p, 9)
    # U(8,5,2) -> B(45,48,51) -> D(35,32,29) -> F(26,23,20) -> U
    _cycle_4(p, 8, 45, 35, 26)
    _cycle_4(p, 5, 48, 32, 23)
    _cycle_4(p, 2, 51, 29, 20)
    moves['R'] = p

    # L Face: 36
    p = list(range(54))
    _rotate_face_cw(p, 36)
    # U(0,3,6) -> F(18,21,24) -> D(27,30,33) -> B(53,50,47) -> U
    _cycle_4(p, 0, 18, 27, 53)
    _cycle_4(p, 3, 21, 30, 50)
    _cycle_4(p, 6, 24, 33, 47)
    moves['L'] = p

    # Generate inverse and double moves
    final_moves = {}
    for move_name, perm in moves.items():
        arr = np.array(perm, dtype=np.int8)
        final_moves[move_name] = arr
        # Inverse: argsort gives the inverse permutation
        final_moves[move_name + "'"] = np.argsort(arr)
        # Double: apply permutation twice
        final_moves[move_name + "2"] = arr[arr]
        
    return final_moves

MOVES = _generate_move_perms()

class CubeState:
    def __init__(self, state=None):
        """Initialize the Rubik's cube state.
        By default, creates a solved cube (identity).
        """
        if state is None:
            # Solved state: 54 array, where each 9 elements have the same color ID
            self.state = np.repeat(np.arange(6, dtype=np.int8), 9)
        else:
            self.state = np.array(state, dtype=np.int8)

    def apply_move(self, move_name: str) -> 'CubeState':
        """Apply a move (e.g., 'U', 'R'', 'F2') and return a new CubeState."""
        if move_name not in MOVES:
            raise ValueError(f"Invalid move: {move_name}")
        
        # Applying a permutation in NumPy is just indexing the array
        new_state = self.state[MOVES[move_name]]
        return CubeState(new_state)

    def apply_sequence(self, sequence: str) -> 'CubeState':
        """Apply a string of space-separated moves."""
        if not sequence.strip():
            return self
        
        current = self
        for move in sequence.strip().split():
            current = current.apply_move(move)
        return current

    def is_solved(self) -> bool:
        """Check if the cube is in the identity/solved state."""
        expected = np.repeat(np.arange(6, dtype=np.int8), 9)
        return np.array_equal(self.state, expected)

    def get_hash(self) -> str:
        """Return a string representation suitable for hashing as a graph vertex."""
        return self.state.tobytes().hex()

    def __eq__(self, other):
        return np.array_equal(self.state, other.state)

    def __hash__(self):
        return hash(self.state.tobytes())
