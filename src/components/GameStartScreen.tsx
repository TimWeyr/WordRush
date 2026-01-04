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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/infra/auth/AuthContext';
import { localProgressProvider } from '@/infra/providers/LocalProgressProvider';
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
  
  /** Callback when user confirms start */
  onConfirm: () => void;
  
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
  freeTierItemCount
}) => {
  const accentColor = colorAccent || colorPrimary;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // ============================================================================
  // QUICK SETTINGS STATE
  // ============================================================================
  
  const [gameMode, setGameMode] = useState<'lernmodus' | 'shooter'>('shooter');
  const [preset, setPreset] = useState<GameplayPreset>('medium');
  const [itemOrder, setItemOrder] = useState<'default' | 'random' | 'worst-first-unplayed'>('default');
  
  // Load current settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await localProgressProvider.getUISettings();
        setGameMode(settings.gameMode || 'shooter');
        setPreset(settings.gameplaySettings?.preset || 'medium');
        setItemOrder(settings.itemOrder || 'default');
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);
  
  // Save settings when changed
  const handleSettingsChange = async (
    newGameMode?: 'lernmodus' | 'shooter',
    newPreset?: GameplayPreset,
    newItemOrder?: 'default' | 'random' | 'worst-first-unplayed'
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
          ...presetDefaults,
          ...currentSettings.gameplaySettings,
          preset: presetToUse,
          showContextMessages: currentSettings.gameplaySettings?.showContextMessages ?? true,
          pauseOnContextMessages: currentSettings.gameplaySettings?.pauseOnContextMessages ?? false
        }
      };
      await localProgressProvider.saveUISettings(updatedSettings);
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
        <h1>{icon} {name}</h1>
        
        <div className="launch-stats">
          <p>Bereit zum Start?</p>
          
          <div className="stats-grid">
            {/* Always show item count */}
            <div className="stat-item">
              <span className="stat-value" style={statValueStyle}>
                {showAuthHint ? freeTierItemCount : itemCount}
              </span>
              <span className="stat-label">{showAuthHint ? 'FreeTier Items' : 'Items'}</span>
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
            
            {/* Preset Dropdown */}
            <div className="quick-setting-item">
              <label htmlFor="preset-select">Schwierigkeit:</label>
              <select
                id="preset-select"
                value={preset}
                onChange={(e) => {
                  const newPreset = e.target.value as GameplayPreset;
                  setPreset(newPreset);
                  handleSettingsChange(undefined, newPreset, undefined);
                }}
              >
                <option value="zen">🧘 Zen</option>
                <option value="easy">😊 Easy</option>
                <option value="medium">⚡ Medium</option>
                <option value="hard">🔥 Hard</option>
              </select>
            </div>
            
            {/* Item Order Dropdown */}
            <div className="quick-setting-item">
              <label htmlFor="order-select">Item-Reihenfolge:</label>
              <select
                id="order-select"
                value={itemOrder}
                onChange={(e) => {
                  const newOrder = e.target.value as 'default' | 'random' | 'worst-first-unplayed';
                  setItemOrder(newOrder);
                  handleSettingsChange(undefined, undefined, newOrder);
                }}
              >
                <option value="default">📋 Standard</option>
                <option value="random">🎲 Zufällig</option>
                <option value="worst-first-unplayed">📉 Schlechte zuerst</option>
              </select>
            </div>
          </div>
          
          <p className="settings-hint">💡 Mehr Optionen in den Settings (⚙️)</p>
        </div>
        
        <div className="launch-buttons">
          <button className="launch-button primary" onClick={onConfirm}>
            {icon} Los geht's!
          </button>
          <button className="launch-button secondary" onClick={onCancel}>
            ← Zurück
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

