import React, { useRef } from 'react';
import { useCubeStore } from '../store';
import {
  CloseIcon,
  DownloadIcon,
  UploadIcon,
  TrashIcon,
  KeyboardIcon,
  BoltIcon,
  GraphIcon,
} from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    animationSpeed,
    setAnimationSpeed,
    showLinkLabels,
    setShowLinkLabels,
    keyboardShortcutsEnabled,
    setKeyboardShortcutsEnabled,
    exportGraphJson,
    importGraphJson,
    resetGraph,
  } = useCubeStore();

  if (!isOpen) return null;

  const handleExport = async () => {
    const jsonStr = await exportGraphJson();
    if (!jsonStr) {
      alert('No se pudo exportar el grafo.');
      return;
    }
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rubik-topology-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = await importGraphJson(content);
        if (success) {
          alert('¡Grafo importado y sincronizado con éxito!');
          onClose();
        } else {
          alert('El archivo no tiene un formato de grafo válido.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 5, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'rgba(17, 24, 39, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(0, 255, 136, 0.1)',
          color: '#f3f4f6',
          fontFamily: "'Montserrat', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 255, 136, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00ff88',
              }}
            >
              <BoltIcon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Configuración
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>
                Preferencias del visualizador y datos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Section: Velocidad de animación */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e5e7eb' }}>
              Velocidad de Giro 3D
            </label>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {animationSpeed <= 3
                ? 'Lenta (Didáctica)'
                : animationSpeed <= 7
                ? 'Normal'
                : animationSpeed <= 12
                ? 'Rápida'
                : 'Ultra (Speedcubing)'}
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="16"
            step="1"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#00ff88',
              cursor: 'pointer',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
            <span>Lenta</span>
            <span>Normal</span>
            <span>Ultra</span>
          </div>
        </div>

        {/* Section: Opciones de Visualización */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
            Visualización del Grafo
          </h4>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraphIcon size={18} color="#60a5fa" />
              <span style={{ fontSize: '0.9rem', color: '#e5e7eb' }}>
                Mostrar etiquetas de movimientos en aristas
              </span>
            </div>
            <input
              type="checkbox"
              checked={showLinkLabels}
              onChange={(e) => setShowLinkLabels(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#00ff88', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* Section: Atajos de teclado */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyboardIcon size={18} color="#f59e0b" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e5e7eb' }}>
                Atajos de Teclado
              </span>
            </div>
            <input
              type="checkbox"
              checked={keyboardShortcutsEnabled}
              onChange={(e) => setKeyboardShortcutsEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#00ff88', cursor: 'pointer' }}
            />
          </div>

          {keyboardShortcutsEnabled && (
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#9ca3af',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <div><kbd style={kbdStyle}>U</kbd> / <kbd style={kbdStyle}>Shift+U</kbd> (U')</div>
                <div><kbd style={kbdStyle}>D</kbd> / <kbd style={kbdStyle}>Shift+D</kbd> (D')</div>
                <div><kbd style={kbdStyle}>R</kbd> / <kbd style={kbdStyle}>Shift+R</kbd> (R')</div>
                <div><kbd style={kbdStyle}>L</kbd> / <kbd style={kbdStyle}>Shift+L</kbd> (L')</div>
                <div><kbd style={kbdStyle}>F</kbd> / <kbd style={kbdStyle}>Shift+F</kbd> (F')</div>
                <div><kbd style={kbdStyle}>B</kbd> / <kbd style={kbdStyle}>Shift+B</kbd> (B')</div>
              </div>
            </div>
          )}
        </div>

        {/* Section: Persistencia y Gestión de Datos */}
        <div style={{ marginBottom: '10px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
            Almacenamiento Local (IndexedDB)
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={handleExport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)')}
              >
                <DownloadIcon size={16} />
                Exportar JSON
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)')}
              >
                <UploadIcon size={16} />
                Importar JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
            </div>

            <button
              onClick={() => {
                if (window.confirm('¿Seguro que deseas borrar toda la memoria del grafo en IndexedDB?')) {
                  resetGraph();
                  onClose();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '4px',
                fontFamily: "'Montserrat', sans-serif",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)')}
            >
              <TrashIcon size={16} />
              Vaciar Memoria Local
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  padding: '2px 5px',
  borderRadius: '4px',
  color: '#e5e7eb',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  fontFamily: 'monospace',
};
