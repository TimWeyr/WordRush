// Settings Modal Component
// Allows user to set username, gameplay settings, and export PDF

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/infra/auth/AuthContext';
import { useToast } from './Toast/ToastContainer';
import { localProgressProvider } from '@/infra/providers/LocalProgressProvider';
import type { UISettings, GameplaySettings, GameplayPreset } from '@/types/progress.types';
import { pdfExporter, PDFExporter } from '@/utils/PDFExporter';
import { GAMEPLAY_PRESETS, DEFAULT_GAMEPLAY_SETTINGS } from '@/config/gameplayPresets';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'settings' | 'gameplay' | 'export';

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, isVerified, signOut } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [username, setUsername] = useState<string>('');
  const [itemOrder, setItemOrder] = useState<'default' | 'random' | 'worst-first-unplayed'>('default');
  const [gameMode, setGameMode] = useState<'lernmodus' | 'shooter'>('shooter');
  const [gameplaySettings, setGameplaySettings] = useState<GameplaySettings>(DEFAULT_GAMEPLAY_SETTINGS);
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
      
      setItemOrder(settings.itemOrder || 'default');
      setGameMode(settings.gameMode || 'shooter'); // Default: shooter
      setGameplaySettings(settings.gameplaySettings || DEFAULT_GAMEPLAY_SETTINGS);
      setUsername(savedUsername || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle preset button click
  const handlePresetClick = (preset: GameplayPreset) => {
    const presetConfig = GAMEPLAY_PRESETS[preset];
    setGameplaySettings({
      ...presetConfig,
      showContextMessages: gameplaySettings.showContextMessages,
      pauseOnContextMessages: gameplaySettings.pauseOnContextMessages
    });
  };

  // Handle slider change - sets preset to 'custom'
  const handleSliderChange = (key: keyof GameplaySettings, value: number) => {
    setGameplaySettings(prev => ({
      ...prev,
      preset: 'custom',
      [key]: value
    }));
  };

  // Handle checkbox change
  const handleCheckboxChange = (key: 'showContextMessages' | 'pauseOnContextMessages', value: boolean) => {
    setGameplaySettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleLogout = async () => {
    try {
      await signOut();
      showToast('Erfolgreich ausgeloggt! 👋', 'success');
      onClose();
      navigate('/');
    } catch (error) {
      showToast('Fehler beim Logout', 'error');
      console.error('Logout error:', error);
    }
  };

  const handleSave = async () => {
    try {
      // Save username (Display Name)
      if (username.trim()) {
        localProgressProvider.saveUsername(username.trim());
      }

      // Save all settings
      const settings = await localProgressProvider.getUISettings();
      const updatedSettings: UISettings = {
        ...settings,
        itemOrder,
        gameMode,
        gameplaySettings
      };
      await localProgressProvider.saveUISettings(updatedSettings);

      showToast('Einstellungen gespeichert! ✅', 'success');
      onClose();
    } catch (error) {
      showToast('Fehler beim Speichern', 'error');
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
            className={`settings-tab ${activeTab === 'gameplay' ? 'active' : ''}`}
            onClick={() => setActiveTab('gameplay')}
          >
            🎮 Gameplay
          </button>
          <button
            className={`settings-tab ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            📥 Export
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'settings' && (
          <>
            {loading ? (
              <div className="settings-loading">Loading...</div>
            ) : (
              <div className="settings-content">
                {/* Auth Status */}
                {user ? (
                  <div className="settings-group auth-status">
                    <div className="auth-info">
                      <div className="auth-email">
                        <span className="auth-icon">
                          {isVerified ? '✅' : '📧'}
                        </span>
                        <div>
                          <div className="auth-label">
                            {isVerified ? 'Verifizierter Account' : 'Account (nicht verifiziert)'}
                          </div>
                          <div className="auth-value">{user.email}</div>
                        </div>
                      </div>
                      <button className="logout-button" onClick={handleLogout}>
                        🚪 Logout
                      </button>
                    </div>
                    {!isVerified && (
                      <div className="verification-notice">
                        ℹ️ Verifiziere deine E-Mail, um vollen Zugriff (Editor, alle Inhalte) zu erhalten
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="settings-group guest-notice">
                    <div className="guest-info">
                      👤 Du bist als <strong>Gast</strong> unterwegs
                    </div>
                    <p>Nur freeTier-Content verfügbar. Registriere dich für vollen Zugriff!</p>
                    <button
                      className="login-button"
                      onClick={() => {
                        onClose();
                        navigate('/login');
                      }}
                    >
                      ✨ Jetzt registrieren / einloggen
                    </button>
                  </div>
                )}

                {/* Display Name */}
                <div className="settings-group">
                  <label htmlFor="username">Display Name (optional):</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Dein Anzeigename"
                    maxLength={50}
                  />
                  <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                    Wird für Highscores und Export verwendet
                  </small>
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

                <div className="settings-group">
                  <label>Spielmodus:</label>
                  <button
                    className={`mode-toggle-button ${gameMode === 'lernmodus' ? 'learn-mode' : 'shooter-mode'}`}
                    onClick={() => setGameMode(gameMode === 'lernmodus' ? 'shooter' : 'lernmodus')}
                    type="button"
                  >
                    <span className="mode-icon">{gameMode === 'lernmodus' ? '🎓' : '🎯'}</span>
                    <span className="mode-text">{gameMode === 'lernmodus' ? 'Lern' : 'Shooter'}</span>
                  </button>
                  <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', display: 'block', marginTop: '8px' }}>
                    {gameMode === 'lernmodus' 
                      ? '🎓 Lernmodus: Farbcodiert (Grün/Rot), 10% Punkte' 
                      : '🎯 Shooter-Modus: Volle Punkte, keine Hilfe'}
                  </small>
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

        {activeTab === 'gameplay' && (
          <div className="settings-content gameplay-settings">
            <div className="settings-group">
              <label>🎮 Spiel-Modus:</label>
              {gameplaySettings.preset === 'custom' && (
                <div className="custom-badge">
                  ⚙️ Custom - Manuelle Einstellungen
                </div>
              )}
              <div className="preset-buttons">
                <button
                  className={`preset-button zen ${gameplaySettings.preset === 'zen' ? 'active' : ''}`}
                  onClick={() => handlePresetClick('zen')}
                  title="Keine Bewegung, alle Objekte sofort sichtbar"
                >
                  <span className="preset-icon">⏳</span>
                  <span className="preset-name">Zen</span>
                </button>
                <button
                  className={`preset-button easy ${gameplaySettings.preset === 'easy' ? 'active' : ''}`}
                  onClick={() => handlePresetClick('easy')}
                  title="Langsam, wenige Objekte, einfach"
                >
                  <span className="preset-icon">🟢</span>
                  <span className="preset-name">Easy</span>
                </button>
                <button
                  className={`preset-button medium ${gameplaySettings.preset === 'medium' ? 'active' : ''}`}
                  onClick={() => handlePresetClick('medium')}
                  title="Normale Geschwindigkeit"
                >
                  <span className="preset-icon">🟡</span>
                  <span className="preset-name">Medium</span>
                </button>
                <button
                  className={`preset-button hard ${gameplaySettings.preset === 'hard' ? 'active' : ''}`}
                  onClick={() => handlePresetClick('hard')}
                  title="Schnell, viele Objekte, herausfordernd"
                >
                  <span className="preset-icon">🔴</span>
                  <span className="preset-name">Hard</span>
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="settings-group">
              <label>⚡ Objekt-Geschwindigkeit: {gameplaySettings.objectSpeed}%</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={gameplaySettings.objectSpeed}
                  onChange={(e) => handleSliderChange('objectSpeed', parseInt(e.target.value))}
                  className="gameplay-slider speed-slider"
                />
                <div className="slider-labels">
                  <span>0 (Zen)</span>
                  <span>50</span>
                  <span>100 (Max)</span>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <label>⏱️ Spawn-Rate: {gameplaySettings.spawnRate}%</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={gameplaySettings.spawnRate}
                  onChange={(e) => handleSliderChange('spawnRate', parseInt(e.target.value))}
                  className="gameplay-slider spawn-slider"
                />
                <div className="slider-labels">
                  <span>0 (Sofort)</span>
                  <span>50</span>
                  <span>100 (Schnell)</span>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <label>✅ Max Correct-Objekte: {gameplaySettings.maxCorrect === 10 ? 'Alle' : gameplaySettings.maxCorrect}</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={gameplaySettings.maxCorrect}
                  onChange={(e) => handleSliderChange('maxCorrect', parseInt(e.target.value))}
                  className="gameplay-slider correct-slider"
                />
                <div className="slider-labels">
                  <span>1</span>
                  <span>5</span>
                  <span>Alle</span>
                </div>
              </div>
              {gameplaySettings.maxCorrect < 10 && (
                <small className="slider-hint">ℹ️ Es werden die ersten {gameplaySettings.maxCorrect} Correct-Objekte aus der Datei verwendet</small>
              )}
            </div>

            <div className="settings-group">
              <label>❌ Max Distractor-Objekte: {gameplaySettings.maxDistractors === 10 ? 'Alle' : gameplaySettings.maxDistractors}</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={gameplaySettings.maxDistractors}
                  onChange={(e) => handleSliderChange('maxDistractors', parseInt(e.target.value))}
                  className="gameplay-slider distractor-slider"
                />
                <div className="slider-labels">
                  <span>1</span>
                  <span>5</span>
                  <span>Alle</span>
                </div>
              </div>
              {gameplaySettings.maxDistractors > 3 && gameplaySettings.maxDistractors < 10 && (
                <small className="slider-hint">⚠️ Nicht jedes Item hat {gameplaySettings.maxDistractors} Distractors</small>
              )}
              {gameplaySettings.maxDistractors <= 3 && (
                <small className="slider-hint">ℹ️ Es werden die ersten {gameplaySettings.maxDistractors} Distractors aus der Datei verwendet</small>
              )}
            </div>

            <div className="settings-group">
              <label>✨ Animation-Intensität: {gameplaySettings.animationIntensity}</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={gameplaySettings.animationIntensity}
                  onChange={(e) => handleSliderChange('animationIntensity', parseInt(e.target.value))}
                  className="gameplay-slider animation-slider"
                />
                <div className="slider-labels">
                  <span>0 (Aus)</span>
                  <span>5</span>
                  <span>10 (Max)</span>
                </div>
              </div>
              <small className="slider-hint">Steuert Hintergrund-Effekte (Starfield, Nebula, etc.)</small>
            </div>

            {/* Context Messages */}
            <div className="settings-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={gameplaySettings.showContextMessages}
                  onChange={(e) => handleCheckboxChange('showContextMessages', e.target.checked)}
                />
                <span>💬 Context-Nachrichten anzeigen</span>
              </label>
            </div>

            <div className="settings-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={gameplaySettings.pauseOnContextMessages}
                  onChange={(e) => handleCheckboxChange('pauseOnContextMessages', e.target.checked)}
                  disabled={!gameplaySettings.showContextMessages}
                />
                <span>⏸️ Spiel bei Context-Nachricht pausieren (Klick zum Fortfahren)</span>
              </label>
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
              <button
                className="settings-cancel"
                onClick={() => window.location.href = '/editor'}
                style={{ 
                  opacity: 0.3, 
                  fontSize: '0.7rem', 
                  padding: '0.3rem 0.6rem',
                  marginLeft: 'auto'
                }}
                title="Editor (Admin)"
              >
                ⚙️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

