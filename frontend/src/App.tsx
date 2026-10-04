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
  UndoIcon,
  RedoIcon,
  ShuffleIcon,
  TimerIcon,
} from './components/Icons';
import { SettingsModal } from './components/SettingsModal';
import { ChallengePanel } from './components/ChallengePanel';
import { generateWcaScramble } from './utils/scramble';
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
  const undo = useCubeStore(state => state.undo);
  const redo = useCubeStore(state => state.redo);
  const applyScramble = useCubeStore(state => state.applyScramble);
  const solveCube = useCubeStore(state => state.solveCube);
  const resetGraph = useCubeStore(state => state.resetGraph);
  const setOnGraphUpdate = useCubeStore(state => state.setOnGraphUpdate);
  const loadInitialGraph = useCubeStore(state => state.loadInitialGraph);
  const isSavedInDB = useCubeStore(state => state.isSavedInDB);
  const showLinkLabels = useCubeStore(state => state.showLinkLabels);
  const keyboardShortcutsEnabled = useCubeStore(state => state.keyboardShortcutsEnabled);
  const fullSequence = useCubeStore(state => state.fullSequence);
  const redoStack = useCubeStore(state => state.redoStack);
  const isAnimating = useCubeStore(state => state.isAnimating);
  const isSolving = useCubeStore(state => state.isSolving);
  const moveQueue = useCubeStore(state => state.moveQueue);
  const isChallengeMode = useCubeStore(state => state.isChallengeMode);
  const setChallengeMode = useCubeStore(state => state.setChallengeMode);

  const isBusy = isAnimating || moveQueue.length > 0 || isSolving;

  useEffect(() => {
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

  // Global Keyboard Shortcuts Listener (Moves, Undo, Redo)
  useEffect(() => {
    if (!keyboardShortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (isSettingsOpen || isBusy) return;

      // Undo: Ctrl+Z / Cmd+Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y OR Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
        return;
      }

      const key = e.key.toUpperCase();
      if (['U', 'D', 'R', 'L', 'F', 'B'].includes(key)) {
        e.preventDefault();
        const move = e.shiftKey ? `${key}'` : key;
        addMove(move);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcutsEnabled, isSettingsOpen, isBusy, addMove, undo, redo]);

  const handleScrambleClick = () => {
    const scramble = generateWcaScramble(20);
    applyScramble(scramble);
  };

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

      {/* Challenge / Speedcubing HUD */}
      {isChallengeMode && <ChallengePanel />}

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
          gap: '10px',
          backgroundColor: 'rgba(10, 15, 29, 0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          padding: '16px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          maxWidth: '380px',
        }}>
          {/* Action Header Row: Undo, Redo, Scramble, Challenge Toggle */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => undo()}
              disabled={isBusy || fullSequence.length === 0}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '7px 10px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: !isBusy && fullSequence.length > 0 ? '#fff' : '#6b7280',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                cursor: !isBusy && fullSequence.length > 0 ? 'pointer' : 'not-allowed',
                fontFamily: "'Montserrat', sans-serif",
                transition: 'all 0.15s ease',
                opacity: !isBusy && fullSequence.length > 0 ? 1 : 0.5,
              }}
              title="Deshacer último giro (Ctrl+Z)"
            >
              <UndoIcon size={14} />
              Undo
            </button>

            <button
              onClick={() => redo()}
              disabled={isBusy || redoStack.length === 0}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '7px 10px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: !isBusy && redoStack.length > 0 ? '#fff' : '#6b7280',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                cursor: !isBusy && redoStack.length > 0 ? 'pointer' : 'not-allowed',
                fontFamily: "'Montserrat', sans-serif",
                transition: 'all 0.15s ease',
                opacity: !isBusy && redoStack.length > 0 ? 1 : 0.5,
              }}
              title="Rehacer giro (Ctrl+Y)"
            >
              <RedoIcon size={14} />
              Redo
            </button>

            <button
              onClick={handleScrambleClick}
              disabled={isBusy}
              style={{
                flex: 1.4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '7px 10px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: isBusy ? '#6b7280' : '#38bdf8',
                border: isBusy ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '6px',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                transition: 'all 0.15s ease',
                opacity: isBusy ? 0.6 : 1,
              }}
              title="Mezcla oficial aleatoria WCA (20 giros desde estado resuelto)"
            >
              <ShuffleIcon size={14} />
              Mezclar WCA
            </button>

            <button
              onClick={() => setChallengeMode(!isChallengeMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '7px 10px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: isChallengeMode ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                color: isChallengeMode ? '#00ff88' : '#9ca3af',
                border: isChallengeMode ? '1px solid #00ff88' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                transition: 'all 0.15s ease',
              }}
              title={isChallengeMode ? 'Ocultar cronómetro' : 'Activar Modo Desafío Speedcubing'}
            >
              <TimerIcon size={14} />
            </button>
          </div>

          {/* 3x4 Move Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {MOVES.map(m => (
              <button 
                key={m} 
                onClick={() => addMove(m)}
                disabled={isBusy}
                style={{
                  padding: '9px 12px',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: "'Montserrat', sans-serif",
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: isBusy ? '#6b7280' : '#f3f4f6',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  opacity: isBusy ? 0.6 : 1,
                }}
                onMouseOver={(e) => {
                  if (!isBusy) {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.15)';
                    e.currentTarget.style.borderColor = '#00ff88';
                    e.currentTarget.style.color = '#00ff88';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isBusy) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#f3f4f6';
                  }
                }}
              >
                {m}
              </button>
            ))}
          </div>
          
          {/* Main Solver & Clear Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => solveCube()}
              disabled={isBusy || fullSequence.length === 0}
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
                backgroundColor: isBusy || fullSequence.length === 0 ? '#1b4329' : '#009B48',
                color: isBusy || fullSequence.length === 0 ? '#86a890' : 'white',
                border: isBusy || fullSequence.length === 0 ? '1px solid #235c36' : '1px solid #00ff88',
                borderRadius: '8px',
                cursor: isBusy || fullSequence.length === 0 ? 'not-allowed' : 'pointer',
                outline: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                boxShadow: isBusy || fullSequence.length === 0 ? 'none' : '0 4px 14px rgba(0, 155, 72, 0.4)',
                transition: 'all 0.2s ease',
                opacity: isBusy || fullSequence.length === 0 ? 0.7 : 1,
              }}
              onMouseOver={(e) => {
                if (!isBusy && fullSequence.length > 0) {
                  e.currentTarget.style.backgroundColor = '#00bd58';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (!isBusy && fullSequence.length > 0) {
                  e.currentTarget.style.backgroundColor = '#009B48';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <BoltIcon size={18} />
              {isSolving ? '⏳ Resolviendo...' : 'Resolver Cubo (A*)'}
            </button>
            
            <button 
              onClick={() => {
                if (window.confirm('¿Deseas reiniciar el grafo y borrar la memoria local?')) {
                  resetGraph();
                }
              }}
              disabled={isBusy}
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
                color: isBusy ? '#6b7280' : '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: isBusy ? 0.5 : 1,
              }}
              title="Borra la memoria de IndexedDB y reinicia el grafo"
              onMouseOver={(e) => {
                if (!isBusy) {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                  e.currentTarget.style.borderColor = '#ef4444';
                }
              }}
              onMouseOut={(e) => {
                if (!isBusy) {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }
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
