import { useState, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import axios from 'axios';
import { Cube3D } from './components/Cube3D';
import { useCubeStore } from './store';
import './App.css';

interface Node {
  id: string;
  is_solved: boolean;
  val: number;
  color: string;
}

interface Link {
  source: string;
  target: string;
  move: string;
  color: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const MOVES = ['U', "U'", 'D', "D'", 'R', "R'", 'L', "L'", 'F', "F'", 'B', "B'"];

function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addMove = useCubeStore(state => state.addMove);
  const solveCube = useCubeStore(state => state.solveCube);
  const setOnGraphUpdate = useCubeStore(state => state.setOnGraphUpdate);

  useEffect(() => {
    // Tell the store how to update our local graph data
    setOnGraphUpdate(setGraphData);

    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/graph');
        setGraphData(response.data);
      } catch (err: any) {
        setError(err.message || 'Error fetching graph data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setOnGraphUpdate]);

  if (loading) return <div className="loader">Cargando datos...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#000011' }}>
      
      {/* 3D Cube View (Left Panel) */}
      <div style={{ flex: 1, position: 'relative', borderRight: '1px solid #333' }}>
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', fontFamily: 'sans-serif' }}>
          <h2>Cubo 3D (Interactivo)</h2>
          <p style={{ fontSize: '0.9em', color: '#aaa' }}>Modelo físico sincronizado</p>
        </div>
        
        {/* Controls UI */}
        <div style={{ 
          position: 'absolute', bottom: 30, left: 20, zIndex: 10, 
          display: 'flex', flexDirection: 'column', gap: '15px',
          backgroundColor: 'rgba(0,0,0,0.7)', padding: '15px', borderRadius: '10px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {MOVES.map(m => (
              <button 
                key={m} 
                onClick={() => addMove(m)}
                style={{
                  padding: '10px 15px', fontSize: '16px', fontWeight: 'bold',
                  backgroundColor: '#333', color: 'white', border: '1px solid #555',
                  borderRadius: '5px', cursor: 'pointer', outline: 'none'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#555'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#333'}
              >
                {m}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => solveCube()}
            style={{
              padding: '12px', fontSize: '16px', fontWeight: 'bold',
              backgroundColor: '#009B48', color: 'white', border: '1px solid #00ff00',
              borderRadius: '5px', cursor: 'pointer', outline: 'none',
              textTransform: 'uppercase'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00ff00'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#009B48'}
          >
            🧠 Resolver con IA (A*)
          </button>
        </div>

        <Canvas camera={{ position: [5, 5, 5], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Environment preset="city" />
          <Cube3D />
          <OrbitControls makeDefault />
        </Canvas>
      </div>

      {/* Topology Graph View (Right Panel) */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', fontFamily: 'sans-serif' }}>
          <h2>Topología del Grafo</h2>
          <p>Nodos: {graphData.nodes.length} | Aristas: {graphData.links.length}</p>
        </div>
        <ForceGraph3D
          graphData={graphData}
          nodeLabel="id"
          nodeColor="color"
          nodeVal="val"
          linkColor="color"
          linkWidth={1}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkLabel="move"
          backgroundColor="#000011"
        />
      </div>

    </div>
  );
}

export default App;
