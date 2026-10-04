import { useEffect, useState } from 'react';
import { useCubeStore, formatTimer } from '../store';
import {
  TimerIcon,
  TrophyIcon,
  PlayIcon,
  ShuffleIcon,
  CopyIcon,
  CloseIcon,
  TrashIcon,
} from './Icons';
import { generateWcaScramble } from '../utils/scramble';
import './ChallengePanel.css';

export function ChallengePanel() {
  const {
    timerStatus,
    solveTimeMs,
    setSolveTimeMs,
    inspectionTimeLeft,
    setInspectionTimeLeft,
    moveCount,
    tps,
    currentScramble,
    solveHistory,
    startInspection,
    startSolving,
    resetChallenge,
    clearSolveHistory,
    applyScramble,
    setChallengeMode,
  } = useCubeStore();

  const [copied, setCopied] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Inspection countdown timer effect
  useEffect(() => {
    if (timerStatus !== 'inspecting') return;

    const interval = setInterval(() => {
      const current = useCubeStore.getState().inspectionTimeLeft;
      if (current <= 1) {
        // Inspection expired, automatically start solving
        startSolving();
      } else {
        setInspectionTimeLeft(current - 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStatus, setInspectionTimeLeft, startSolving]);

  // Solving elapsed time updater (runs at ~60fps)
  useEffect(() => {
    if (timerStatus !== 'solving') return;

    let animId: number;
    const update = () => {
      const start = useCubeStore.getState().solveStartTime;
      if (start > 0) {
        const elapsed = performance.now() - start;
        setSolveTimeMs(elapsed);
      }
      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [timerStatus, setSolveTimeMs]);

  // Spacebar trigger for inspection/solving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      e.preventDefault();
      const status = useCubeStore.getState().timerStatus;
      if (status === 'idle') {
        startInspection();
      } else if (status === 'inspecting') {
        startSolving();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startInspection, startSolving]);

  const handleCopyScramble = () => {
    if (!currentScramble) return;
    navigator.clipboard.writeText(currentScramble);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewScramble = () => {
    const scramble = generateWcaScramble(20);
    resetChallenge();
    applyScramble(scramble);
  };

  const pbTime =
    solveHistory.length > 0
      ? Math.min(...solveHistory.map((s) => s.timeMs))
      : null;

  const inspectionClass =
    inspectionTimeLeft <= 3
      ? 'challenge-inspection-digits critical'
      : inspectionTimeLeft <= 7
      ? 'challenge-inspection-digits warning'
      : 'challenge-inspection-digits';

  return (
    <>
      <div className="challenge-hud">
        {/* Top bar with mode label, PB badge, and close button */}
        <div className="challenge-topbar">
          <div className="challenge-badges-group">
            <span className="challenge-badge-speedcubing">
              <TimerIcon size={14} color="#00ff88" />
              MODO SPEEDCUBING
            </span>

            {pbTime && (
              <span className="challenge-badge-pb">
                <TrophyIcon size={12} color="#fbbf24" />
                PB: {formatTimer(pbTime)}
              </span>
            )}
          </div>

          <div className="challenge-actions-group">
            {solveHistory.length > 0 && (
              <button
                className="challenge-history-btn"
                onClick={() => setShowHistoryModal(true)}
              >
                Historial ({solveHistory.length})
              </button>
            )}

            <button
              className="challenge-close-btn"
              onClick={() => {
                resetChallenge();
                setChallengeMode(false);
              }}
              aria-label="Cerrar Desafío"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        {/* Central Stopwatch Display */}
        <div className="challenge-stopwatch-container">
          {timerStatus === 'inspecting' ? (
            <div className="challenge-inspection-display">
              <span className={inspectionClass}>
                {inspectionTimeLeft}s
              </span>
              <span className="challenge-inspection-label">
                INSPECCIÓN (gira para empezar)
              </span>
            </div>
          ) : (
            <div className="challenge-timer-display">
              <span
                className={`challenge-timer-digits ${
                  timerStatus === 'solved' ? 'solved' : ''
                }`}
              >
                {formatTimer(solveTimeMs)}
              </span>
              {timerStatus === 'solved' && (
                <span className="challenge-solved-banner">
                  🎉 ¡CUBO RESUELTO!
                </span>
              )}
            </div>
          )}
        </div>

        {/* Real-time Metrics: Movimientos y TPS */}
        <div className="challenge-metrics-row">
          <div>
            Movimientos: <strong className="challenge-metric-val">{moveCount}</strong>
          </div>
          <div className="challenge-metric-divider" />
          <div>
            TPS (Giros/seg):{' '}
            <strong className="challenge-metric-val tps">
              {tps > 0 ? tps.toFixed(2) : '0.00'}
            </strong>
          </div>
        </div>

        {/* Scramble display line with Copy button */}
        {currentScramble && (
          <div className="challenge-scramble-bar">
            <span
              className="challenge-scramble-text"
              title={currentScramble}
            >
              <strong>WCA:</strong> {currentScramble}
            </span>
            <button
              className={`challenge-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopyScramble}
              title="Copiar secuencia de mezcla"
            >
              <CopyIcon size={13} />
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="challenge-controls-row">
          <button
            className="challenge-btn-new-scramble"
            onClick={handleNewScramble}
          >
            <ShuffleIcon size={14} />
            Nueva Mezcla WCA
          </button>

          {timerStatus === 'idle' || timerStatus === 'solved' ? (
            <button
              className="challenge-btn-start"
              onClick={startInspection}
            >
              <PlayIcon size={14} />
              Iniciar Inspección
            </button>
          ) : (
            <button
              className="challenge-btn-reset"
              onClick={resetChallenge}
            >
              Reiniciar Cronómetro
            </button>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div
          className="history-modal-backdrop"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="history-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-modal-header">
              <div className="history-modal-title">
                <TrophyIcon size={20} color="#fbbf24" />
                <h3>Historial de Resoluciones</h3>
              </div>
              <button
                className="history-modal-close-btn"
                onClick={() => setShowHistoryModal(false)}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="history-list">
              {solveHistory.map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="history-item"
                >
                  <div>
                    <span className="history-item-time">
                      {s.formattedTime}
                    </span>
                    <span className="history-item-sub">
                      {s.moves} movs • {s.tps.toFixed(2)} TPS
                    </span>
                  </div>
                  <span className="history-item-date">{s.date}</span>
                </div>
              ))}
            </div>

            <div className="history-modal-footer">
              <button
                className="history-clear-btn"
                onClick={() => {
                  if (window.confirm('¿Seguro que deseas borrar el historial de tiempos?')) {
                    clearSolveHistory();
                    setShowHistoryModal(false);
                  }
                }}
              >
                <TrashIcon size={14} />
                Borrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
