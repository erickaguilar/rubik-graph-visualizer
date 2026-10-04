import { useState, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
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
  const resetGraph = useCubeStore(state => state.resetGraph);
  const setOnGraphUpdate = useCubeStore(state => state.setOnGraphUpdate);
  const loadInitialGraph = useCubeStore(state => state.loadInitialGraph);
  const isSavedInDB = useCubeStore(state => state.isSavedInDB);

  useEffect(() => {
    // Tell the store how to update our local graph data
    setOnGraphUpdate(setGraphData);

    const initGraph = async () => {
      try {
        const data = await loadInitialGraph();
        setGraphData(data);
      } catch (err: any) {
        setError(err.message || 'Error initializing Wasm graph');
      } finally {
        setLoading(false);
      }
    };

    initGraph();
  }, [setOnGraphUpdate, loadInitialGraph]);

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
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => solveCube()}
              style={{
                flex: 1,
                padding: '12px', fontSize: '15px', fontWeight: 'bold',
                backgroundColor: '#009B48', color: 'white', border: '1px solid #00ff00',
                borderRadius: '5px', cursor: 'pointer', outline: 'none',
                textTransform: 'uppercase'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#00ff00'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#009B48'}
            >
              ⚡ Resolver Cubo (A*)
            </button>
            
            <button 
              onClick={() => {
                if (window.confirm('¿Deseas reiniciar el grafo y borrar la memoria local?')) {
                  resetGraph();
                }
              }}
              style={{
                padding: '12px 14px', fontSize: '14px', fontWeight: 'bold',
                backgroundColor: '#3a1a1a', color: '#ffaaaa', border: '1px solid #aa3333',
                borderRadius: '5px', cursor: 'pointer', outline: 'none'
              }}
              title="Borra la memoria de IndexedDB y reinicia el grafo"
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a2222'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3a1a1a'}
            >
              🗑️ Limpiar
            </button>
          </div>
        </div>

        <Canvas camera={{ position: [6.5, 5.5, 6.5], fov: 38 }}>
          <ambientLight intensity={0.7} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Environment preset="city" />
          <Cube3D />
          <OrbitControls makeDefault target={[0, 0.4, 0]} />
        </Canvas>
      </div>

      {/* Topology Graph View (Right Panel) */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', fontFamily: 'sans-serif' }}>
          <h2>Topología del Grafo</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.95em', color: '#ccc' }}>
              Nodos: {graphData.nodes.length} | Aristas: {graphData.links.length}
            </span>
            {isSavedInDB && (
              <span style={{ fontSize: '0.8em', backgroundColor: '#0d2d1d', color: '#00ff88', padding: '2px 8px', borderRadius: '12px', border: '1px solid #00aa55' }}>
                💾 IndexedDB Activo
              </span>
            )}
          </div>
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
          nodeResolution={8}
          linkResolution={3}
          enablePointerInteraction={true}
          showNavInfo={false}
        />
      </div>

    </div>
  );
}

export default App;
