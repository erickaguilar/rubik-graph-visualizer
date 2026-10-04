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

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(10, 15, 29, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '12px 20px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 255, 136, 0.1)',
          color: '#f3f4f6',
          fontFamily: "'Montserrat', sans-serif",
          maxWidth: '560px',
          width: '92%',
        }}
      >
        {/* Top bar with mode label, PB badge, and close button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.12)',
                padding: '3px 10px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 136, 0.3)',
                letterSpacing: '0.04em',
              }}
            >
              <TimerIcon size={14} color="#00ff88" />
              MODO SPEEDCUBING
            </span>

            {pbTime && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fbbf24',
                  backgroundColor: 'rgba(251, 191, 36, 0.12)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                }}
              >
                <TrophyIcon size={12} color="#fbbf24" />
                PB: {formatTimer(pbTime)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {solveHistory.length > 0 && (
              <button
                onClick={() => setShowHistoryModal(true)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#9ca3af',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#9ca3af')}
              >
                Historial ({solveHistory.length})
              </button>
            )}

            <button
              onClick={() => {
                resetChallenge();
                setChallengeMode(false);
              }}
              aria-label="Cerrar Desafío"
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#ff6b6b')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#9ca3af')}
            >
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        {/* Central Stopwatch Display */}
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
          {timerStatus === 'inspecting' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '2.6rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                  color:
                    inspectionTimeLeft <= 3
                      ? '#ef4444'
                      : inspectionTimeLeft <= 7
                      ? '#f59e0b'
                      : '#38bdf8',
                  textShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
                }}
              >
                {inspectionTimeLeft}s
              </span>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '-4px' }}>
                INSPECCIÓN (gira para empezar)
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '2.8rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  color: timerStatus === 'solved' ? '#00ff88' : '#ffffff',
                  textShadow:
                    timerStatus === 'solved'
                      ? '0 0 25px rgba(0, 255, 136, 0.6)'
                      : '0 0 15px rgba(255, 255, 255, 0.2)',
                }}
              >
                {formatTimer(solveTimeMs)}
              </span>
              {timerStatus === 'solved' && (
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#00ff88',
                    letterSpacing: '0.05em',
                  }}
                >
                  🎉 ¡CUBO RESUELTO!
                </span>
              )}
            </div>
          )}
        </div>

        {/* Real-time Metrics: Movimientos y TPS */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '18px',
            fontSize: '0.82rem',
            color: '#d1d5db',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '8px',
            width: '100%',
          }}
        >
          <div>
            Movimientos: <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{moveCount}</strong>
          </div>
          <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <div>
            TPS (Giros/seg):{' '}
            <strong style={{ color: '#00ff88', fontSize: '0.95rem' }}>
              {tps > 0 ? tps.toFixed(2) : '0.00'}
            </strong>
          </div>
        </div>

        {/* Scramble display line with Copy button */}
        {currentScramble && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              padding: '6px 12px',
              borderRadius: '8px',
              width: '100%',
              fontSize: '0.72rem',
              color: '#9ca3af',
              fontFamily: 'monospace',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '430px',
                color: '#e5e7eb',
              }}
              title={currentScramble}
            >
              <strong>WCA:</strong> {currentScramble}
            </span>
            <button
              onClick={handleCopyScramble}
              style={{
                background: 'none',
                border: 'none',
                color: copied ? '#00ff88' : '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                fontFamily: "'Montserrat', sans-serif",
                padding: '2px 4px',
              }}
              title="Copiar secuencia de mezcla"
            >
              <CopyIcon size={13} />
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '2px' }}>
          <button
            onClick={handleNewScramble}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Montserrat', sans-serif",
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
          >
            <ShuffleIcon size={14} />
            Nueva Mezcla WCA
          </button>

          {timerStatus === 'idle' || timerStatus === 'solved' ? (
            <button
              onClick={startInspection}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: '#009B48',
                color: '#fff',
                border: '1px solid #00ff88',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                boxShadow: '0 0 15px rgba(0, 155, 72, 0.3)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#00bd58')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#009B48')}
            >
              <PlayIcon size={14} />
              Iniciar Inspección
            </button>
          ) : (
            <button
              onClick={resetChallenge}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.35)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
            >
              Reiniciar Cronómetro
            </button>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 5, 0.7)',
            backdropFilter: 'blur(10px)',
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '460px',
              maxHeight: '80vh',
              overflowY: 'auto',
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '20px',
              color: '#f3f4f6',
              fontFamily: "'Montserrat', sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrophyIcon size={20} color="#fbbf24" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Historial de Resoluciones
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                }}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {solveHistory.map((s, idx) => (
                <div
                  key={s.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#00ff88', fontFamily: 'monospace' }}>
                      {s.formattedTime}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '10px' }}>
                      {s.moves} movs • {s.tps.toFixed(2)} TPS
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>{s.date}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  if (window.confirm('¿Seguro que deseas borrar el historial de tiempos?')) {
                    clearSolveHistory();
                    setShowHistoryModal(false);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
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
