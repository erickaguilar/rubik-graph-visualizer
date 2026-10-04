/**
 * WCA (World Cube Association) Scramble Generator & Group Theory Utilities
 */

const FACES = ['U', 'D', 'R', 'L', 'F', 'B'];
const MODIFIERS = ['', "'", '2'];
// Face to Axis mapping: U/D = 0, R/L = 1, F/B = 2
const AXES = [0, 0, 1, 1, 2, 2];

/**
 * Generates an official standard WCA 3x3x3 scramble sequence.
 * Enforces WCA rules:
 * 1. No consecutive moves on the same face (e.g. not R followed by R')
 * 2. No 3 consecutive moves on the same axis (e.g. not R L R or R L L')
 */
export function generateWcaScramble(length = 20): string[] {
  const scramble: string[] = [];
  let lastFace = -1;
  let secondLastFace = -1;

  for (let i = 0; i < length; i++) {
    let face: number;
    while (true) {
      face = Math.floor(Math.random() * 6);
      
      // Rule 1: No two consecutive moves on the same face
      if (face === lastFace) continue;

      // Rule 2: Cannot make 3 moves in a row along the same axis
      if (
        secondLastFace !== -1 &&
        AXES[face] === AXES[lastFace] &&
        AXES[face] === AXES[secondLastFace]
      ) {
        continue;
      }

      break;
    }

    const modifier = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scramble.push(`${FACES[face]}${modifier}`);

    secondLastFace = lastFace;
    lastFace = face;
  }

  return scramble;
}

/**
 * Returns the group inverse of any Rubik's cube move.
 * Example: R -> R', R' -> R, R2 -> R2
 */
export function getInverseMove(move: string): string {
  if (move.endsWith('2')) return move;
  if (move.endsWith("'")) return move.slice(0, -1);
  return move + "'";
}

/**
 * Formats a scramble array into standard notation string.
 */
export function formatScramble(moves: string[]): string {
  return moves.join(' ');
}
