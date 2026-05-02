import pytest
from src.cube_engine import CubeState

def test_initial_state():
    cube = CubeState()
    assert cube.is_solved()

def test_single_move():
    cube = CubeState()
    new_cube = cube.apply_move('U')
    assert not new_cube.is_solved()
    assert new_cube.get_hash() != cube.get_hash()

def test_inverse_moves():
    cube = CubeState()
    for move in ['U', 'D', 'F', 'B', 'R', 'L']:
        # Apply move and its inverse
        state = cube.apply_sequence(f"{move} {move}'")
        assert state.is_solved(), f"Failed inverse for {move}"

def test_double_moves():
    cube = CubeState()
    for move in ['U', 'D', 'F', 'B', 'R', 'L']:
        # Apply double move twice should be identity
        state = cube.apply_sequence(f"{move}2 {move}2")
        assert state.is_solved(), f"Failed double move identity for {move}2"

def test_commutator():
    # [R, U] = R U R' U'
    # Repeating a standard commutator 6 times returns the cube to the original state
    # (R U R' U') * 6 = Identity
    cube = CubeState()
    sequence = "R U R' U' " * 6
    state = cube.apply_sequence(sequence.strip())
    assert state.is_solved(), "Failed (R U R' U')x6 identity"

def test_t_perm():
    # T Permutation: R U R' U' R' F R2 U' R' U' R U R' F'
    # Swap 2 corners and 2 edges on U face.
    # Applying it twice returns to identity.
    cube = CubeState()
    t_perm = "R U R' U' R' F R2 U' R' U' R U R' F'"
    state = cube.apply_sequence(f"{t_perm} {t_perm}")
    assert state.is_solved(), "Failed T Permutation x2 identity"

def test_h_perm():
    # H Permutation: M2 U M2 U2 M2 U M2 (Wait, we don't have M moves implemented)
    # We will test U D L2 U2 D2 R2 U D returns to something specific, but let's stick to known standard 2-gen cycles.
    pass

def test_checkerboard():
    # Checkerboard pattern: U2 D2 F2 B2 R2 L2
    # Applying it twice should return to identity
    cube = CubeState()
    checkerboard = "U2 D2 F2 B2 R2 L2"
    state = cube.apply_sequence(f"{checkerboard} {checkerboard}")
    assert state.is_solved(), "Failed checkerboard x2 identity"
