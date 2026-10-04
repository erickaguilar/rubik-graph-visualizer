import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCubeStore } from '../store';

const COLORS = {
  right: '#B71234', left: '#FF5800', top: '#FFFFFF', 
  bottom: '#FFD500', front: '#009B48', back: '#0046AD', core: '#111111'
};

const EPSILON = 0.1;

// Determine axis and angle for each move
function getMoveDetails(move: string) {
  const face = move[0];
  const isPrime = move.includes("'");
  const isDouble = move.includes("2");

  let axis = new THREE.Vector3();
  let filter: (p: THREE.Vector3) => boolean;
  let angle = Math.PI / 2;

  switch (face) {
    case 'R': axis.set(1, 0, 0); filter = (p) => p.x > 1 - EPSILON; angle = -angle; break;
    case 'L': axis.set(1, 0, 0); filter = (p) => p.x < -1 + EPSILON; break;
    case 'U': axis.set(0, 1, 0); filter = (p) => p.y > 1 - EPSILON; angle = -angle; break;
    case 'D': axis.set(0, 1, 0); filter = (p) => p.y < -1 + EPSILON; break;
    case 'F': axis.set(0, 0, 1); filter = (p) => p.z > 1 - EPSILON; angle = -angle; break;
    case 'B': axis.set(0, 0, 1); filter = (p) => p.z < -1 + EPSILON; break;
    default: return null;
  }

  if (isPrime) angle = -angle;
  if (isDouble) angle *= 2;

  return { axis, filter, targetAngle: angle };
}

// Render individual Cubie
function CubieRenderer({ initialPos, position, rotation }: { initialPos: THREE.Vector3, position: THREE.Vector3, rotation: THREE.Quaternion }) {
  const materials = React.useMemo(() => {
    const x = Math.round(initialPos.x);
    const y = Math.round(initialPos.y);
    const z = Math.round(initialPos.z);
    return [
      new THREE.MeshStandardMaterial({ color: x === 1 ? COLORS.right : COLORS.core, roughness: 0.1, metalness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: x === -1 ? COLORS.left : COLORS.core, roughness: 0.1, metalness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: y === 1 ? COLORS.top : COLORS.core, roughness: 0.1, metalness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: y === -1 ? COLORS.bottom : COLORS.core, roughness: 0.1, metalness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: z === 1 ? COLORS.front : COLORS.core, roughness: 0.1, metalness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: z === -1 ? COLORS.back : COLORS.core, roughness: 0.1, metalness: 0.5 }),
    ];
  }, [initialPos]);

  return (
    <mesh position={position} quaternion={rotation}>
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      {materials.map((mat, index) => (
        <primitive key={index} object={mat} attach={`material-${index}`} />
      ))}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.95, 0.95, 0.95)]} />
        <lineBasicMaterial color="#000000" linewidth={1} />
      </lineSegments>
    </mesh>
  );
}

export function Cube3D() {
  const cubiesRef = useRef(
    (() => {
      const arr = [];
      let id = 0;
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            arr.push({ id: id++, initialPos: new THREE.Vector3(x, y, z), pos: new THREE.Vector3(x, y, z), rot: new THREE.Quaternion() });
          }
        }
      }
      return arr;
    })()
  );

  const [, setTick] = useState(0);
  const { moveQueue, isAnimating, setAnimating, popMove } = useCubeStore();
  
  const animState = useRef({
    active: false,
    move: '',
    progress: 0,
    details: null as ReturnType<typeof getMoveDetails>,
    cubieIndices: [] as number[],
    startQuats: [] as THREE.Quaternion[],
    startPositions: [] as THREE.Vector3[]
  });

  useFrame((_state, delta) => {
    const currentCubies = cubiesRef.current;

    if (!animState.current.active && moveQueue.length > 0 && !isAnimating) {
      const nextMove = popMove();
      if (!nextMove) return;
      const details = getMoveDetails(nextMove);
      if (!details) return;

      setAnimating(true);
      
      const indices: number[] = [];
      const sQuats: THREE.Quaternion[] = [];
      const sPos: THREE.Vector3[] = [];
      
      currentCubies.forEach((c, idx) => {
        if (details.filter(c.pos)) {
          indices.push(idx);
          sQuats.push(c.rot.clone());
          sPos.push(c.pos.clone());
        }
      });

      animState.current = { active: true, move: nextMove, progress: 0, details, cubieIndices: indices, startQuats: sQuats, startPositions: sPos };
    }

    if (animState.current.active) {
      const speed = 6.0; // Rotation speed
      animState.current.progress += delta * speed;
      
      const { progress, details, cubieIndices, startQuats, startPositions } = animState.current;
      const targetAngle = details!.targetAngle;
      const isFinished = progress >= Math.abs(targetAngle);
      const currentAngle = isFinished ? targetAngle : Math.sign(targetAngle) * progress;

      const q = new THREE.Quaternion().setFromAxisAngle(details!.axis, currentAngle);

      cubieIndices.forEach((idx, i) => {
        currentCubies[idx].pos = startPositions[i].clone().applyQuaternion(q);
        currentCubies[idx].rot = q.clone().multiply(startQuats[i]);
      });

      if (isFinished) {
        cubieIndices.forEach((idx) => {
          const p = currentCubies[idx].pos;
          p.set(Math.round(p.x), Math.round(p.y), Math.round(p.z));
          currentCubies[idx].rot.normalize();
        });
        
        // Reset animation flags before triggering state updates
        animState.current.active = false;
        setAnimating(false);

        // Notify the store that the animation is visually complete
        const completedMove = animState.current.move;
        useCubeStore.getState().commitMove(completedMove);
      }
      
      // Force render to show updated refs
      setTick(t => t + 1);
    }
  });

  return (
    <group position={[0, 0.4, 0]}>
      {cubiesRef.current.map((c) => (
        <CubieRenderer key={c.id} initialPos={c.initialPos} position={c.pos} rotation={c.rot} />
      ))}
    </group>
  );
}