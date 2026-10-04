import { useState, useEffect, useRef } from 'react';
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

  // Splitter resizer states (default 50% split)
  const appContainerRef = useRef<HTMLDivElement>(null);
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Graph container measurement to prevent width overflow
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphDimensions, setGraphDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

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

  // Measure graphContainer to prevent ForceGraph3D from overflowing width
  useEffect(() => {
    if (!graphContainerRef.current) return;
    const element = graphContainerRef.current;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setGraphDimensions({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };

    updateSize();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setGraphDimensions({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      }
    });

    ro.observe(element);
    return () => ro.disconnect();
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing || !appContainerRef.current) return;
    const rect = appContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clientX = e.clientX;
    const newPercent = ((clientX - rect.left) / rect.width) * 100;
    // Constrain split between 20% and 80%
    const clamped = Math.min(80, Math.max(20, newPercent));
    setSplitPercent(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isResizing) {
      setIsResizing(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture released
      }
    }
  };

  const handleDoubleClick = () => {
    // Reset to initial 50% split on double click
    setSplitPercent(50);
  };

  const handleScrambleClick = () => {
    const scramble = generateWcaScramble(20);
    applyScramble(scramble);
  };

  if (loading) return <div className="loader">Cargando visualizador Wasm...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div
      ref={appContainerRef}
      className={`app-container ${isResizing ? 'is-resizing' : ''}`}
      style={{ '--cube-panel-width': `${splitPercent}%` } as React.CSSProperties}
    >
      
      {/* Floating Top-Right Settings Button */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        aria-label="Abrir Configuración"
        title="Configuración y Atajos"
        className="settings-toggle-btn"
      >
        <SettingsIcon size={22} />
      </button>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Challenge / Speedcubing HUD */}
      {isChallengeMode && <ChallengePanel />}

      {/* 3D Cube View (Left Panel) */}
      <div className="cube-panel">
        <div className="panel-header-badge">
          <div className="panel-header-title">
            <CubeIcon size={20} color="#00ff88" />
            <h2>Cubo 3D Interactivo</h2>
          </div>
          <p className="panel-header-subtitle">
            Modelo cinemático sincronizado
          </p>
        </div>
        
        {/* Controls UI */}
        <div className="controls-container">
          {/* Action Header Row: Undo, Redo, Scramble, Challenge Toggle */}
          <div className="action-toolbar-row">
            <button
              onClick={() => undo()}
              disabled={isBusy || fullSequence.length === 0}
              className="action-btn"
              title="Deshacer último giro (Ctrl+Z)"
            >
              <UndoIcon size={14} />
              Undo
            </button>

            <button
              onClick={() => redo()}
              disabled={isBusy || redoStack.length === 0}
              className="action-btn"
              title="Rehacer giro (Ctrl+Y)"
            >
              <RedoIcon size={14} />
              Redo
            </button>

            <button
              onClick={handleScrambleClick}
              disabled={isBusy}
              className="action-btn action-btn-scramble"
              title="Mezcla oficial aleatoria WCA (20 giros desde estado resuelto)"
            >
              <ShuffleIcon size={14} />
              Mezclar WCA
            </button>

            <button
              onClick={() => setChallengeMode(!isChallengeMode)}
              className={`action-btn action-btn-timer ${isChallengeMode ? 'active' : ''}`}
              title={isChallengeMode ? 'Ocultar cronómetro' : 'Activar Modo Desafío Speedcubing'}
            >
              <TimerIcon size={14} />
            </button>
          </div>

          {/* 3x4 Move Grid */}
          <div className="moves-grid">
            {MOVES.map(m => (
              <button 
                key={m} 
                onClick={() => addMove(m)}
                disabled={isBusy}
                className="move-btn"
              >
                {m}
              </button>
            ))}
          </div>
          
          {/* Main Solver & Clear Buttons */}
          <div className="bottom-actions-row">
            <button 
              onClick={() => solveCube()}
              disabled={isBusy || fullSequence.length === 0}
              className="solver-btn"
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
              className="clear-btn"
              title="Borra la memoria de IndexedDB y reinicia el grafo"
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

      {/* Resizer Splitter Divider */}
      <div
        className={`panel-resizer ${isResizing ? 'is-active' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        title="Arrastra para redimensionar (Doble clic para centrar al 50%)"
      >
        <div className="panel-resizer-handle" />
      </div>

      {/* Topology Graph View (Right Panel) */}
      <div className="graph-panel" ref={graphContainerRef}>
        <div className="panel-header-badge">
          <div className="panel-header-title">
            <GraphIcon size={20} color="#60a5fa" />
            <h2>Topología del Grafo</h2>
          </div>
          <div className="graph-stats-row">
            <span>
              Nodos: <strong>{graphData.nodes.length}</strong> | Aristas: <strong>{graphData.links.length}</strong>
            </span>
            {isSavedInDB && (
              <span className="indexeddb-badge">
                <DatabaseIcon size={12} color="#00ff88" />
                IndexedDB
              </span>
            )}
          </div>
        </div>
        <ForceGraph3D
          width={graphDimensions.width > 0 ? graphDimensions.width : undefined}
          height={graphDimensions.height > 0 ? graphDimensions.height : undefined}
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
