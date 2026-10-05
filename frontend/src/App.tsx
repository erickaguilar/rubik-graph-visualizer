import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
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

  // Graph container measurement to prevent width overflow and off-center placement
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphDimensions, setGraphDimensions] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.5) : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));

  // ForceGraph3D ref and auto-centering state
  const fgRef = useRef<any>(null);
  const hasCenteredInitialRef = useRef<boolean>(false);

  const centerGraph = (durationMs = 600) => {
    if (!fgRef.current) return;
    try {
      const controls: any = fgRef.current.controls();
      if (controls && controls.target) {
        controls.target.set(0, 0, 0);
      }
    } catch {
      // ignore
    }

    if (graphData.nodes.length <= 1) {
      // 1 node: identity solved state pinned at (0, 0, 0)
      fgRef.current.cameraPosition(
        { x: 0, y: 0, z: 180 },
        { x: 0, y: 0, z: 0 },
        durationMs
      );
    } else {
      // Multiple nodes: fit bounding sphere nicely centered
      fgRef.current.zoomToFit(durationMs, 50);
    }
  };

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
  const solutionPathNodes = useCubeStore(state => state.solutionPathNodes);
  const activeSolutionIndex = useCubeStore(state => state.activeSolutionIndex);
  const clearSolutionPath = useCubeStore(state => state.clearSolutionPath);

  const isBusy = isAnimating || moveQueue.length > 0 || isSolving;

  // Helper to extract node ID whether it's a string or an object { id, ... }
  const getNodeId = (nodeOrId: any): string => {
    if (!nodeOrId) return '';
    return typeof nodeOrId === 'object' && nodeOrId !== null ? String(nodeOrId.id) : String(nodeOrId);
  };

  const isSolutionPathActive = solutionPathNodes.length > 0;

  // Precompute solution path edge lookups for fast accessor evaluation
  const { solutionEdgesForward, solutionEdgesReverse } = useMemo(() => {
    const forward = new Set<string>();
    const reverse = new Set<string>();

    if (solutionPathNodes.length >= 2) {
      for (let i = 0; i < solutionPathNodes.length - 1; i++) {
        const u = solutionPathNodes[i];
        const v = solutionPathNodes[i + 1];
        forward.add(`${u}->${v}`);
        reverse.add(`${v}->${u}`);
      }
    }

    return { solutionEdgesForward: forward, solutionEdgesReverse: reverse };
  }, [solutionPathNodes]);

  // Dynamic Node Color: Golden & Neon highlight for the solution path, dimmed for background
  const getNodeColor = useCallback((node: any) => {
    const id = getNodeId(node);
    if (!isSolutionPathActive) {
      return node.is_solved ? '#00ff88' : (node.color || '#60a5fa');
    }

    const pathIdx = solutionPathNodes.indexOf(id);
    if (pathIdx === -1) {
      // Subtly dimmed background node to preserve contextual topology
      return node.is_solved ? '#00cc66' : '#1e2438';
    }

    if (pathIdx === activeSolutionIndex) {
      // Current active state: High-intensity Electric Yellow / Neon
      return '#FFE600';
    }
    if (pathIdx < activeSolutionIndex) {
      // Traversed step along the solution: Glowing Neon Emerald
      return '#00ffaa';
    }
    // Pending step on the solution: Brilliant Radiant Gold
    return '#FFD700';
  }, [isSolutionPathActive, solutionPathNodes, activeSolutionIndex]);

  // Dynamic Node Size: Large for active and solution nodes, small for background
  const getNodeVal = useCallback((node: any) => {
    const id = getNodeId(node);
    if (!isSolutionPathActive) {
      return node.is_solved ? 10 : (node.val || 4);
    }

    const pathIdx = solutionPathNodes.indexOf(id);
    if (pathIdx === -1) {
      return node.is_solved ? 7 : 2.5;
    }

    if (pathIdx === activeSolutionIndex) {
      return 15;
    }
    return 8;
  }, [isSolutionPathActive, solutionPathNodes, activeSolutionIndex]);

  // Dynamic Link Color: Glowing gold/neon for solution edges, dimmed for others
  const getLinkColor = useCallback((link: any) => {
    const src = getNodeId(link.source);
    const tgt = getNodeId(link.target);
    const key = `${src}->${tgt}`;

    if (!isSolutionPathActive) {
      return link.color || '#999999';
    }

    const isFwd = solutionEdgesForward.has(key);
    const isRev = solutionEdgesReverse.has(key);

    if (isFwd || isRev) {
      let stepIdx = -1;
      for (let i = 0; i < solutionPathNodes.length - 1; i++) {
        if (
          (solutionPathNodes[i] === src && solutionPathNodes[i + 1] === tgt) ||
          (solutionPathNodes[i] === tgt && solutionPathNodes[i + 1] === src)
        ) {
          stepIdx = i;
          break;
        }
      }

      if (stepIdx === activeSolutionIndex) {
        return '#FFE600';
      }
      if (stepIdx < activeSolutionIndex) {
        return '#00ffaa';
      }
      return '#FFD700';
    }

    return 'rgba(70, 85, 110, 0.18)';
  }, [isSolutionPathActive, solutionEdgesForward, solutionEdgesReverse, solutionPathNodes, activeSolutionIndex]);

  // Dynamic Link Width: Thick luminous beam for solution, thin wire for others
  const getLinkWidth = useCallback((link: any) => {
    if (!isSolutionPathActive) {
      return 1.2;
    }
    const src = getNodeId(link.source);
    const tgt = getNodeId(link.target);
    const key = `${src}->${tgt}`;
    if (solutionEdgesForward.has(key) || solutionEdgesReverse.has(key)) {
      return 4;
    }
    return 0.5;
  }, [isSolutionPathActive, solutionEdgesForward, solutionEdgesReverse]);

  // Directional particles flowing toward the solved identity state along the solution path
  const getLinkParticles = useCallback((link: any) => {
    if (!isSolutionPathActive) return 0;
    const src = getNodeId(link.source);
    const tgt = getNodeId(link.target);
    const key = `${src}->${tgt}`;
    if (solutionEdgesForward.has(key) || solutionEdgesReverse.has(key)) {
      return 4;
    }
    return 0;
  }, [isSolutionPathActive, solutionEdgesForward, solutionEdgesReverse]);

  const getLinkParticleSpeed = useCallback((link: any) => {
    if (!isSolutionPathActive) return 0;
    const src = getNodeId(link.source);
    const tgt = getNodeId(link.target);
    const key = `${src}->${tgt}`;
    if (solutionEdgesForward.has(key)) {
      return 0.012;
    }
    if (solutionEdgesReverse.has(key)) {
      return -0.012;
    }
    return 0;
  }, [isSolutionPathActive, solutionEdgesForward, solutionEdgesReverse]);

  const getLinkParticleWidth = useCallback((link: any) => {
    if (!isSolutionPathActive) return 0;
    const src = getNodeId(link.source);
    const tgt = getNodeId(link.target);
    const key = `${src}->${tgt}`;
    if (solutionEdgesForward.has(key) || solutionEdgesReverse.has(key)) {
      return 3.2;
    }
    return 0;
  }, [isSolutionPathActive, solutionEdgesForward, solutionEdgesReverse]);

  const getLinkParticleColor = useCallback(() => {
    return '#FFD700';
  }, []);

  // Instantly re-evaluate ForceGraph3D accessors when solution step advances
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.refresh();
    }
  }, [solutionPathNodes, activeSolutionIndex]);

  // Frame the solution path nicely in the camera when a solution is calculated
  useEffect(() => {
    if (solutionPathNodes.length > 0 && fgRef.current) {
      centerGraph(700);
    }
  }, [solutionPathNodes.length > 0]);

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
  useLayoutEffect(() => {
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

  // Automatically center topology graph when page starts and graph is ready
  useEffect(() => {
    if (hasCenteredInitialRef.current) return;
    if (graphDimensions.width > 0 && graphDimensions.height > 0 && graphData.nodes.length > 0 && fgRef.current) {
      const timer = setTimeout(() => {
        centerGraph(500);
        hasCenteredInitialRef.current = true;
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [graphDimensions.width, graphDimensions.height, graphData.nodes.length]);

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
              {isSolving
                ? `⏳ Resolviendo (${activeSolutionIndex + 1}/${solutionPathNodes.length || '?'})...`
                : 'Resolver Cubo (A*)'}
            </button>
            
            <button 
              onClick={() => {
                if (window.confirm('¿Deseas reiniciar el grafo y borrar la memoria local?')) {
                  resetGraph();
                  setTimeout(() => centerGraph(500), 100);
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
            {isSolutionPathActive && (
              <span className="solution-path-badge">
                <BoltIcon size={12} color="#FFD700" />
                <span>
                  {isSolving
                    ? `Paso ${activeSolutionIndex + 1}/${solutionPathNodes.length}`
                    : `Ruta A*: ${solutionPathNodes.length - 1} giros`}
                </span>
                {!isSolving && (
                  <button
                    className="solution-badge-close"
                    onClick={clearSolutionPath}
                    title="Descartar resaltado de solución"
                  >
                    ✕
                  </button>
                )}
              </span>
            )}
            <button
              className="center-graph-btn"
              onClick={() => centerGraph(600)}
              title="Centrar la cámara en el origen del grafo (0,0,0)"
            >
              Centrar
            </button>
          </div>
        </div>
        <ForceGraph3D
          ref={fgRef}
          controlType="orbit"
          width={graphDimensions.width}
          height={graphDimensions.height}
          graphData={graphData}
          nodeLabel="id"
          nodeColor={getNodeColor}
          nodeVal={getNodeVal}
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkDirectionalParticles={getLinkParticles}
          linkDirectionalParticleWidth={getLinkParticleWidth}
          linkDirectionalParticleSpeed={getLinkParticleSpeed}
          linkDirectionalParticleColor={getLinkParticleColor}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkLabel={showLinkLabels ? "move" : undefined}
          backgroundColor="#000011"
          nodeResolution={16}
          linkResolution={3}
          enablePointerInteraction={true}
          showNavInfo={false}
          onEngineStop={() => {
            if (!hasCenteredInitialRef.current) {
              centerGraph(600);
              hasCenteredInitialRef.current = true;
            }
          }}
        />
      </div>

    </div>
  );
}

export default App;
