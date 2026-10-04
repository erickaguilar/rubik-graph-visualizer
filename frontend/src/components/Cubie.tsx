import * as THREE from 'three';

interface CubieProps {
  position: [number, number, number];
}

const COLORS = {
  right: '#B71234',  // Red
  left: '#FF5800',   // Orange
  top: '#FFFFFF',    // White
  bottom: '#FFD500', // Yellow
  front: '#009B48',  // Green
  back: '#0046AD',   // Blue
  core: '#111111'    // Black/Dark Gray for inside
};

// BoxGeometry face order: right (+x), left (-x), top (+y), bottom (-y), front (+z), back (-z)
export function Cubie({ position }: CubieProps) {
  const [x, y, z] = position;

  // Determine colors based on position. If a face is internal, it's black.
  const materials = [
    new THREE.MeshStandardMaterial({ color: x === 1 ? COLORS.right : COLORS.core, roughness: 0.1, metalness: 0.5 }), // right
    new THREE.MeshStandardMaterial({ color: x === -1 ? COLORS.left : COLORS.core, roughness: 0.1, metalness: 0.5 }),  // left
    new THREE.MeshStandardMaterial({ color: y === 1 ? COLORS.top : COLORS.core, roughness: 0.1, metalness: 0.5 }),    // top
    new THREE.MeshStandardMaterial({ color: y === -1 ? COLORS.bottom : COLORS.core, roughness: 0.1, metalness: 0.5 }), // bottom
    new THREE.MeshStandardMaterial({ color: z === 1 ? COLORS.front : COLORS.core, roughness: 0.1, metalness: 0.5 }),  // front
    new THREE.MeshStandardMaterial({ color: z === -1 ? COLORS.back : COLORS.core, roughness: 0.1, metalness: 0.5 }),   // back
  ];

  return (
    <mesh position={position}>
      {/* 0.95 size to leave a small gap (bevel) between cubies */}
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      {materials.map((mat, index) => (
        <primitive key={index} object={mat} attach={`material-${index}`} />
      ))}
      {/* Optional: Add edges to make it look like a physical cube with black plastic borders */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.95, 0.95, 0.95)]} />
        <lineBasicMaterial color="#000000" linewidth={2} />
      </lineSegments>
    </mesh>
  );
}
