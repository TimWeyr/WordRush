/**
 * Game Start Screen Component
 * 
 * Universal launch screen shown before starting any game session:
 * - Universe selection (all themes/chapters/items)
 * - Theme selection (all chapters/items)
 * - Chapter selection (all items)
 * - Level selection (filtered items)
 * - Single item selection
 * 
 * Features:
 * - Dynamic statistics display (items count only for simplicity)
 * - Colored border based on Universe/Theme/Chapter colors
 * - Quick Settings (Game Mode, Preset, Item Order)
 * - Auth hint for locked content (FreeTier vs. Full)
 * - Confirmation + Cancel buttons
 * - Warning for large item counts (>200)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/infra/auth/AuthContext';
import { localProgressProvider } from '@/infra/providers/LocalProgressProvider';
import { useToast } from './Toast/ToastContainer';
import type { GameplayPreset } from '@/types/progress.types';
import './GameStartScreen.css';

// ============================================================================
// TYPES
// ============================================================================

export interface GameStartScreenProps {
  /** Display name of the selection (e.g., "Psychiatrie", "ICD-10", "F32 Depression") */
  name: string;
  
  /** Total number of items that will be played */
  itemCount: number;
  
  /** Primary color for border and accents (from Universe/Theme/Chapter) */
  colorPrimary: string;
  
  /** Accent color for glow effects (optional, defaults to colorPrimary) */
  colorAccent?: string;
  
  /** Callback when user confirms start (receives current game mode and settings) */
  onConfirm: (gameMode: 'lernmodus' | 'shooter', itemOrder: 'default' | 'random' | 'worst-first-unplayed' | 'newest-first', preset: GameplayPreset) => void;
  
  /** Callback when user cancels */
  onCancel: () => void;
  
  /** Optional emoji/icon to display (defaults to 🚀) */
  icon?: string;
  
  /** Optional additional statistics to display */
  additionalStats?: Array<{
    value: number | string;
    label: string;
  }>;
  
  /** Optional: Number of FreeTier items (for auth hint) */
  freeTierItemCount?: number;
  
  /** Optional: Callback to open settings (if not provided, navigates to /settings) */
  onOpenSettings?: () => void;
  
  /** Optional: Callback when settings are closed (to reload settings) */
  onSettingsClosed?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GameStartScreen: React.FC<GameStartScreenProps> = ({
  name,
  itemCount,
  colorPrimary,
  colorAccent,
  onConfirm,
  onCancel,
  icon = '🚀',
  additionalStats = [],
  freeTierItemCount,
  onOpenSettings,
  onSettingsClosed
}) => {
  const accentColor = colorAccent || colorPrimary;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // ============================================================================
  // QUICK SETTINGS STATE
  // ============================================================================
  
  const [gameMode, setGameMode] = useState<'lernmodus' | 'shooter'>('shooter');
  const [preset, setPreset] = useState<GameplayPreset>('easy');
  const [itemOrder, setItemOrder] = useState<'default' | 'random' | 'worst-first-unplayed' | 'newest-first'>('default');
  
  // Load current settings on mount and when settings might have changed
  const loadSettings = useCallback(async () => {
    try {
      const settings = await localProgressProvider.getUISettings();
      setGameMode(settings.gameMode || 'shooter');
      setPreset(settings.gameplaySettings?.preset || 'medium');
      setItemOrder(settings.itemOrder || 'default');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);
  
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  // Reload settings when onSettingsClosed is called
  useEffect(() => {
    if (onSettingsClosed) {
      // This will be called by the parent when settings close
      // We expose loadSettings via this callback
    }
  }, [onSettingsClosed]);
  
  // Save settings when changed
  const handleSettingsChange = async (
    newGameMode?: 'lernmodus' | 'shooter',
    newPreset?: GameplayPreset,
    newItemOrder?: 'default' | 'random' | 'worst-first-unplayed' | 'newest-first'
  ) => {
    try {
      const currentSettings = await localProgressProvider.getUISettings();
      
      // Import presets to get default values
      const { GAMEPLAY_PRESETS } = await import('@/config/gameplayPresets');
      const presetToUse = newPreset || preset;
      const presetDefaults = GAMEPLAY_PRESETS[presetToUse];
      
      const updatedSettings = {
        ...currentSettings,
        gameMode: newGameMode || gameMode,
        itemOrder: newItemOrder || itemOrder,
        gameplaySettings: {
          ...currentSettings.gameplaySettings, // Keep current settings
          ...presetDefaults, // Apply preset defaults
          preset: presetToUse, // Set preset
          showContextMessages: currentSettings.gameplaySettings?.showContextMessages ?? true,
          pauseOnContextMessages: currentSettings.gameplaySettings?.pauseOnContextMessages ?? false
        }
      };
      await localProgressProvider.saveUISettings(updatedSettings);
      console.log('✅ Settings saved:', updatedSettings);
      
      // Update local state immediately so UI reflects the change
      if (newGameMode) {
        setGameMode(newGameMode);
        
        // Show toast notification for game mode change
        if (newGameMode === 'lernmodus') {
          showToast('Lösungen sind nun grün markiert', 'success');
        } else if (newGameMode === 'shooter') {
          showToast('Zeig was du gelernt hast', 'success');
        }
      }
      
      if (newPreset) {
        setPreset(newPreset);
        
        // Show toast notification for preset change
        const presetMessages: Record<GameplayPreset, string> = {
          zen: '⏳ Ruhe: nichts bewegt sich außer du',
          easy: '🟢 Langsam, max 6 Objekte',
          medium: '🟡 Normal, max 10 Objekte',
          hard: '🔴 Schnell, max 16 Objekte',
          custom: '⚙️ Benutzerdefinierte Einstellungen'
        };
        
        showToast(presetMessages[newPreset], 'info');
      }
      
      if (newItemOrder) {
        setItemOrder(newItemOrder);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };
  
  // ============================================================================
  // AUTH HINT LOGIC
  // ============================================================================
  
  const showAuthHint = !user && freeTierItemCount !== undefined && freeTierItemCount < itemCount;
  const lockedItemCount = showAuthHint ? itemCount - freeTierItemCount : 0;
  
  // ============================================================================
  // STYLING
  // ============================================================================
  
  // Dynamic styling based on provided colors
  const contentStyle: React.CSSProperties = {
    background: `rgba(${hexToRgb(colorPrimary)}, 0.1)`,
    borderColor: colorPrimary,
    boxShadow: `0 0 50px rgba(${hexToRgb(colorPrimary)}, 0.8)`
  };
  
  const statValueStyle: React.CSSProperties = {
    color: accentColor,
    textShadow: `0 0 10px rgba(${hexToRgb(accentColor)}, 0.5)`
  };

  return (
    <div className="launch-overlay">
      <div className="launch-content mobile-optimized" style={contentStyle}>
        <h1 className="launch-title">{icon} {name}</h1>
        
        <div className="launch-stats">
          <div className="stats-grid">
            {/* Always show item count */}
            <div className="stat-item">
              <span className="stat-value" style={statValueStyle}>
                {showAuthHint ? freeTierItemCount : itemCount}
              </span>
              <span className="stat-label">{showAuthHint ? 'FreeTier Runden' : 'Runden'}</span>
            </div>
            
            {/* Show additional stats if provided */}
            {additionalStats.map((stat, index) => (
              <div key={index} className="stat-item">
                <span className="stat-value" style={statValueStyle}>
                  {stat.value}
                </span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
          
          {/* Auth Hint: Show locked content */}
          {showAuthHint && (
            <div className="auth-hint">
              <div className="auth-hint-icon">🔒</div>
              <div className="auth-hint-text">
                <strong>{lockedItemCount} weitere Items</strong> verfügbar
              </div>
              <button 
                className="auth-hint-button" 
                onClick={() => navigate('/login?redirect=' + encodeURIComponent(window.location.pathname))}
              >
                Jetzt anmelden
              </button>
            </div>
          )}
          
          {/* Warning for large item counts */}
          {itemCount > 200 && (
            <div className="warning-message">
              ⚠️ Das sind sehr viele Runden! Dies kann eine Weile dauern.
            </div>
          )}
        </div>
        
        {/* Quick Settings */}
        <div className="launch-quick-settings">
          <h3>⚙️ Quick Settings</h3>
          
          <div className="quick-settings-grid">
            {/* Game Mode Toggle */}
            <div className="quick-setting-item">
              <label>Spielmodus:</label>
              <div className="mode-toggle">
                <button
                  className={`mode-toggle-btn ${gameMode === 'lernmodus' ? 'active' : ''}`}
                  onClick={() => {
                    setGameMode('lernmodus');
                    handleSettingsChange('lernmodus', undefined, undefined);
                  }}
                >
                  📚 Lernmodus
                </button>
                <button
                  className={`mode-toggle-btn ${gameMode === 'shooter' ? 'active' : ''}`}
                  onClick={() => {
                    setGameMode('shooter');
                    handleSettingsChange('shooter', undefined, undefined);
                  }}
                >
                  🎯 Shooter
                </button>
              </div>
            </div>
            
            {/* Preset Buttons */}
            <div className="quick-setting-item full-width">
              <label>Schwierigkeit:</label>
              <div className="preset-buttons">
                <button
                  className={`preset-button zen ${preset === 'zen' ? 'active' : ''}`}
                  onClick={() => {
                    setPreset('zen');
                    handleSettingsChange(undefined, 'zen', undefined);
                  }}
                  title="Keine Bewegung, alle Objekte sofort sichtbar"
                >
                  <span className="preset-icon">⏳</span>
                  <span className="preset-name">Zen</span>
                </button>
                <button
                  className={`preset-button easy ${preset === 'easy' ? 'active' : ''}`}
                  onClick={() => {
                    setPreset('easy');
                    handleSettingsChange(undefined, 'easy', undefined);
                  }}
                  title="Langsam, wenige Objekte, einfach"
                >
                  <span className="preset-icon">🟢</span>
                  <span className="preset-name">Easy</span>
                </button>
                <button
                  className={`preset-button medium ${preset === 'medium' ? 'active' : ''}`}
                  onClick={() => {
                    setPreset('medium');
                    handleSettingsChange(undefined, 'medium', undefined);
                  }}
                  title="Normale Geschwindigkeit"
                >
                  <span className="preset-icon">🟡</span>
                  <span className="preset-name">Medium</span>
                </button>
                <button
                  className={`preset-button hard ${preset === 'hard' ? 'active' : ''}`}
                  onClick={() => {
                    setPreset('hard');
                    handleSettingsChange(undefined, 'hard', undefined);
                  }}
                  title="Schnell, viele Objekte, herausfordernd"
                >
                  <span className="preset-icon">🔴</span>
                  <span className="preset-name">Hard</span>
                </button>
              </div>
            </div>
            
            {/* Item Order Dropdown */}
            <div className="quick-setting-item">
              <label htmlFor="order-select">Item-Reihenfolge:</label>
              <select
                id="order-select"
                value={itemOrder}
                onChange={(e) => {
                  const newOrder = e.target.value as 'default' | 'random' | 'worst-first-unplayed' | 'newest-first';
                  setItemOrder(newOrder);
                  handleSettingsChange(undefined, undefined, newOrder);
                }}
              >
                <option value="default">📋 Standard</option>
                <option value="random">🎲 Zufällig</option>
                <option value="worst-first-unplayed">📉 Schlechte zuerst</option>
                <option value="newest-first">🆕 Neueste zuerst</option>
              </select>
            </div>
          </div>
          
          <button 
            className="settings-link-button"
            onClick={() => {
              if (onOpenSettings) {
                onOpenSettings();
              } else {
                navigate('/settings');
              }
            }}
            type="button"
          >
            💡 Mehr Optionen in den Settings ⚙️
          </button>
        </div>
        
        <div className="launch-buttons">
          <button className="launch-button cancel" onClick={onCancel}>
            ✕
          </button>
          <button className="launch-button primary" onClick={() => onConfirm(gameMode, itemOrder, preset)}>
            {icon} Los geht's!
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert hex color to RGB string (for rgba() usage)
 * @param hex - Hex color string (e.g., "#4a90e2")
 * @returns RGB string (e.g., "74, 144, 226")
 */
function hexToRgb(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse hex to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return `${r}, ${g}, ${b}`;
}

