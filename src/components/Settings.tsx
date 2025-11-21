// Settings Modal Component
// Allows user to set username and difficulty level

import React, { useState, useEffect } from 'react';
import { localProgressProvider } from '@/infra/providers/LocalProgressProvider';
import type { UISettings } from '@/types/progress.types';
import type { DifficultyLevel } from '@/config/difficulty';
import { pdfExporter, PDFExporter } from '@/utils/PDFExporter';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'settings' | 'export';

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [username, setUsername] = useState<string>('');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('medium');
  const [itemOrder, setItemOrder] = useState<'default' | 'random' | 'worst-first-unplayed'>('default');
  const [loading, setLoading] = useState(true);
  
  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportScope, setExportScope] = useState<string>('');

  // Load settings on open
  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadExportScope();
    }
  }, [isOpen]);

  const loadExportScope = async () => {
    try {
      const selection = PDFExporter.getCurrentSelection();
      if (selection && selection.universeId) {
        if (selection.chapterId && selection.themeId) {
          setExportScope(`Planet: ${selection.themeId} - ${selection.chapterId}`);
        } else if (selection.themeId) {
          setExportScope(`Planet: ${selection.themeId} (alle Chapters)`);
        } else if (selection.universeId) {
          setExportScope(`Universum: ${selection.universeId} (alle Planeten)`);
        } else {
          setExportScope('Keine Auswahl');
        }
      } else {
        setExportScope('Keine Auswahl gefunden');
      }
    } catch (error) {
      setExportScope('Fehler beim Laden');
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      await pdfExporter.generatePDF();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim PDF-Export';
      setExportError(errorMessage);
    } finally {
      setExportLoading(false);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await localProgressProvider.getUISettings();
      const savedUsername = localProgressProvider.getUsername();
      
      setDifficultyLevel(settings.difficultyLevel || 'medium');
      setItemOrder(settings.itemOrder || 'default');
      setUsername(savedUsername || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Save username
      if (username.trim()) {
        localProgressProvider.saveUsername(username.trim());
      }

      // Save difficulty level and item order
      const settings = await localProgressProvider.getUISettings();
      const updatedSettings: UISettings = {
        ...settings,
        difficultyLevel,
        itemOrder
      };
      await localProgressProvider.saveUISettings(updatedSettings);

      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-backdrop" onClick={handleBackdropClick}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Einstellungen
          </button>
          <button
            className={`settings-tab ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            📥 PDF Export
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'settings' && (
          <>
            {loading ? (
              <div className="settings-loading">Loading...</div>
            ) : (
              <div className="settings-content">
                <div className="settings-group">
                  <label htmlFor="username">Benutzername:</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Dein Name"
                    maxLength={50}
                  />
                </div>

                <div className="settings-group">
                  <label>Schwierigkeitsgrad:</label>
                  <div className="difficulty-options">
                    <label className="difficulty-option">
                      <input
                        type="radio"
                        name="difficulty"
                        value="easy"
                        checked={difficultyLevel === 'easy'}
                        onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                      />
                      <span>🟢 Easy</span>
                    </label>
                    <label className="difficulty-option">
                      <input
                        type="radio"
                        name="difficulty"
                        value="medium"
                        checked={difficultyLevel === 'medium'}
                        onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                      />
                      <span>🟡 Medium</span>
                    </label>
                    <label className="difficulty-option">
                      <input
                        type="radio"
                        name="difficulty"
                        value="hard"
                        checked={difficultyLevel === 'hard'}
                        onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                      />
                      <span>🔴 Hard</span>
                    </label>
                  </div>
                </div>

                <div className="settings-group">
                  <label htmlFor="itemOrder">Item-Reihenfolge:</label>
                  <select
                    id="itemOrder"
                    value={itemOrder}
                    onChange={(e) => setItemOrder(e.target.value as 'default' | 'random' | 'worst-first-unplayed')}
                  >
                    <option value="default">Standard</option>
                    <option value="random">Zufällig</option>
                    <option value="worst-first-unplayed">Schlechte Scores zuerst, dann ungespielte</option>
                  </select>
                </div>

                <div className="settings-actions">
                  <button className="settings-save" onClick={handleSave}>
                    Speichern
                  </button>
                  <button className="settings-cancel" onClick={onClose}>
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'export' && (
          <div className="settings-content">
            <div className="settings-group">
              <label>📥 Lernfortschritt Export</label>
              <div className="export-info">
                <p className="export-scope">
                  <strong>Export-Bereich:</strong> {exportScope}
                </p>
                <p className="export-description">
                  Erstelle ein PDF mit allen Items, Correct-Entries, Distractors und deinem aktuellen Punktestand.
                </p>
              </div>
            </div>

            {exportError && (
              <div className="export-error">
                ⚠️ {exportError}
              </div>
            )}

            {exportSuccess && (
              <div className="export-success">
                ✅ PDF erfolgreich erstellt!
              </div>
            )}

            <div className="settings-actions">
              <button
                className="settings-save"
                onClick={handleExportPDF}
                disabled={exportLoading}
              >
                {exportLoading ? '⏳ Erstelle PDF...' : '📄 PDF herunterladen'}
              </button>
              <button className="settings-cancel" onClick={onClose}>
                Schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

