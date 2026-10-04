import { useState, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Cube3D } from './components/Cube3D';
import { useCubeStore } from './store';
import {
  SettingsIcon,
  CubeIcon,
  GraphIcon,
  BoltIcon,
  TrashIcon,
  DatabaseIcon,
} from './components/Icons';
import { SettingsModal } from './components/SettingsModal';
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const addMove = useCubeStore(state => state.addMove);
  const solveCube = useCubeStore(state => state.solveCube);
  const resetGraph = useCubeStore(state => state.resetGraph);
  const setOnGraphUpdate = useCubeStore(state => state.setOnGraphUpdate);
  const loadInitialGraph = useCubeStore(state => state.loadInitialGraph);
  const isSavedInDB = useCubeStore(state => state.isSavedInDB);
  const showLinkLabels = useCubeStore(state => state.showLinkLabels);
  const keyboardShortcutsEnabled = useCubeStore(state => state.keyboardShortcutsEnabled);

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

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    if (!keyboardShortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing inside inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (isSettingsOpen) return;

      const key = e.key.toUpperCase();
      if (['U', 'D', 'R', 'L', 'F', 'B'].includes(key)) {
        e.preventDefault();
        const move = e.shiftKey ? `${key}'` : key;
        addMove(move);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcutsEnabled, isSettingsOpen, addMove]);

  if (loading) return <div className="loader">Cargando visualizador Wasm...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#000011', fontFamily: "'Montserrat', sans-serif" }}>
      
      {/* Floating Top-Right Settings Button */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        aria-label="Abrir Configuración"
        title="Configuración y Atajos"
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 100,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: 'rgba(17, 24, 39, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(31, 41, 55, 0.9)';
          e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.5)';
          e.currentTarget.style.color = '#00ff88';
          e.currentTarget.style.transform = 'scale(1.08) rotate(30deg)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(17, 24, 39, 0.75)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.style.color = '#e5e7eb';
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
        }}
      >
        <SettingsIcon size={22} />
      </button>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* 3D Cube View (Left Panel) */}
      <div style={{ flex: 1, position: 'relative', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
          color: 'white',
          backgroundColor: 'rgba(10, 15, 29, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CubeIcon size={20} color="#00ff88" />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Cubo 3D Interactivo
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 28px', fontSize: '0.8rem', color: '#9ca3af' }}>
            Modelo cinemático sincronizado
          </p>
        </div>
        
        {/* Controls UI */}
        <div style={{ 
          position: 'absolute',
          bottom: 24,
          left: 20,
          zIndex: 10, 
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: 'rgba(10, 15, 29, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '16px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
          maxWidth: '360px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {MOVES.map(m => (
              <button 
                key={m} 
                onClick={() => addMove(m)}
                style={{
                  padding: '9px 12px',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: "'Montserrat', sans-serif",
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#f3f4f6',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.15)';
                  e.currentTarget.style.borderColor = '#00ff88';
                  e.currentTarget.style.color = '#00ff88';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#f3f4f6';
                }}
              >
                {m}
              </button>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => solveCube()}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700,
                fontFamily: "'Montserrat', sans-serif",
                backgroundColor: '#009B48',
                color: 'white',
                border: '1px solid #00ff88',
                borderRadius: '8px',
                cursor: 'pointer',
                outline: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                boxShadow: '0 4px 14px rgba(0, 155, 72, 0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#00bd58';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#009B48';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <BoltIcon size={18} />
              Resolver Cubo (A*)
            </button>
            
            <button 
              onClick={() => {
                if (window.confirm('¿Deseas reiniciar el grafo y borrar la memoria local?')) {
                  resetGraph();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Montserrat', sans-serif",
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              title="Borra la memoria de IndexedDB y reinicia el grafo"
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                e.currentTarget.style.borderColor = '#ef4444';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              }}
            >
              <TrashIcon size={16} />
              Limpiar
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
        <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
          color: 'white',
          backgroundColor: 'rgba(10, 15, 29, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GraphIcon size={20} color="#60a5fa" />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Topología del Grafo
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              Nodos: <strong style={{ color: '#fff' }}>{graphData.nodes.length}</strong> | Aristas: <strong style={{ color: '#fff' }}>{graphData.links.length}</strong>
            </span>
            {isSavedInDB && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                color: '#00ff88',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 136, 0.3)',
              }}>
                <DatabaseIcon size={12} color="#00ff88" />
                IndexedDB
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
          linkLabel={showLinkLabels ? "move" : undefined}
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
