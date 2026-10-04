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
import './SettingsModal.css';

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
    <div className="settings-backdrop" onClick={onClose}>
      <div className="settings-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <div className="settings-header-left">
            <div className="settings-header-icon-box">
              <BoltIcon size={20} />
            </div>
            <div className="settings-header-title-box">
              <h3>Configuración</h3>
              <p>Preferencias del visualizador y datos</p>
            </div>
          </div>

          <button className="settings-close-btn" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Section: Velocidad de animación */}
        <div className="settings-section">
          <div className="settings-speed-header">
            <label className="settings-speed-label">
              Velocidad de Giro 3D
            </label>
            <span className="settings-speed-badge">
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
            className="settings-range-input"
          />
          <div className="settings-range-labels">
            <span>Lenta</span>
            <span>Normal</span>
            <span>Ultra</span>
          </div>
        </div>

        {/* Section: Opciones de Visualización */}
        <div className="settings-section">
          <h4 className="settings-section-title">
            Visualización del Grafo
          </h4>

          <label className="settings-toggle-card">
            <div className="settings-toggle-info">
              <GraphIcon size={18} color="#60a5fa" />
              <span className="settings-toggle-text">
                Mostrar etiquetas de movimientos en aristas
              </span>
            </div>
            <input
              type="checkbox"
              checked={showLinkLabels}
              onChange={(e) => setShowLinkLabels(e.target.checked)}
              className="settings-checkbox"
            />
          </label>
        </div>

        {/* Section: Atajos de teclado */}
        <div className="settings-section">
          <div className="settings-shortcuts-header">
            <div className="settings-shortcuts-label-group">
              <KeyboardIcon size={18} color="#f59e0b" />
              <span className="settings-shortcuts-label">
                Atajos de Teclado
              </span>
            </div>
            <input
              type="checkbox"
              checked={keyboardShortcutsEnabled}
              onChange={(e) => setKeyboardShortcutsEnabled(e.target.checked)}
              className="settings-checkbox"
            />
          </div>

          {keyboardShortcutsEnabled && (
            <div className="settings-shortcuts-box">
              <div className="settings-shortcuts-moves-grid">
                <div><kbd className="settings-kbd">U</kbd> / <kbd className="settings-kbd">Shift+U</kbd> (U')</div>
                <div><kbd className="settings-kbd">D</kbd> / <kbd className="settings-kbd">Shift+D</kbd> (D')</div>
                <div><kbd className="settings-kbd">R</kbd> / <kbd className="settings-kbd">Shift+R</kbd> (R')</div>
                <div><kbd className="settings-kbd">L</kbd> / <kbd className="settings-kbd">Shift+L</kbd> (L')</div>
                <div><kbd className="settings-kbd">F</kbd> / <kbd className="settings-kbd">Shift+F</kbd> (F')</div>
                <div><kbd className="settings-kbd">B</kbd> / <kbd className="settings-kbd">Shift+B</kbd> (B')</div>
              </div>
              <div className="settings-shortcuts-special-row">
                <div><kbd className="settings-kbd">Ctrl+Z</kbd> Deshacer (Undo)</div>
                <div><kbd className="settings-kbd">Ctrl+Y</kbd> Rehacer (Redo)</div>
                <div><kbd className="settings-kbd">Espacio</kbd> Iniciar Desafío</div>
              </div>
            </div>
          )}
        </div>

        {/* Section: Persistencia y Gestión de Datos */}
        <div className="settings-section">
          <h4 className="settings-section-title">
            Almacenamiento Local (IndexedDB)
          </h4>

          <div className="settings-data-container">
            <div className="settings-data-grid">
              <button
                onClick={handleExport}
                className="settings-data-btn"
              >
                <DownloadIcon size={16} />
                Exportar JSON
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="settings-data-btn"
              >
                <UploadIcon size={16} />
                Importar JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="settings-file-hidden"
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
              className="settings-danger-btn"
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
