// Universe, Theme, and Chapter Selector

import React, { useState, useEffect } from 'react';
import { jsonLoader } from '@/infra/utils/JSONLoader';
import { Settings } from './Settings';
import type { Universe, Theme } from '@/types/content.types';
import type { GameMode } from '@/types/game.types';
import './UniverseSelector.css';

interface UniverseSelectorProps {
  onStart: (
    universe: Universe,
    theme: Theme,
    chapterId: string,
    mode: GameMode
  ) => void;
}

interface LastSelection {
  universeId: string;
  themeId: string;
  chapterId: string;
  mode: GameMode;
}

export const UniverseSelector: React.FC<UniverseSelectorProps> = ({ onStart }) => {
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [mode, setMode] = useState<GameMode>('lernmodus');
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load universes on mount and restore last selection
  useEffect(() => {
    loadUniverses();
  }, []);

  const loadUniverses = async () => {
    setLoading(true);
    const loaded = await jsonLoader.loadUniverses();
    setUniverses(loaded);
    
    // Restore last selection
    const lastSelectionStr = localStorage.getItem('wordrush_lastSelection');
    if (lastSelectionStr) {
      try {
        const lastSelection: LastSelection = JSON.parse(lastSelectionStr);
        console.log('📌 Restoring last selection:', lastSelection);
        
        // Find and set universe
        const universe = loaded.find(u => u.id === lastSelection.universeId);
        if (universe) {
          setSelectedUniverse(universe);
          setMode(lastSelection.mode);
          
          // Load theme
          const theme = await jsonLoader.loadTheme(universe.id, lastSelection.themeId);
          if (theme) {
            setSelectedTheme(theme);
            
            // Set chapter if it exists
            if (theme.chapters[lastSelection.chapterId]) {
              setSelectedChapter(lastSelection.chapterId);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to restore last selection:', error);
      }
    }
    
    setLoading(false);
  };

  const handleUniverseChange = async (universeId: string) => {
    const universe = universes.find(u => u.id === universeId);
    if (!universe) return;
    
    setSelectedUniverse(universe);
    setSelectedTheme(null);
    setSelectedChapter('');
    
    // Load first theme
    if (universe.themes.length > 0) {
      const theme = await jsonLoader.loadTheme(universe.id, universe.themes[0]);
      if (theme) {
        setSelectedTheme(theme);
      }
    }
  };

  const handleThemeChange = async (themeId: string) => {
    if (!selectedUniverse) return;
    
    const theme = await jsonLoader.loadTheme(selectedUniverse.id, themeId);
    if (theme) {
      setSelectedTheme(theme);
      setSelectedChapter('');
    }
  };

  const handleStart = () => {
    if (!selectedUniverse || !selectedTheme || !selectedChapter) return;
    
    // Save selection to LocalStorage
    const selection: LastSelection = {
      universeId: selectedUniverse.id,
      themeId: selectedTheme.id,
      chapterId: selectedChapter,
      mode
    };
    localStorage.setItem('wordrush_lastSelection', JSON.stringify(selection));
    console.log('💾 Saved selection:', selection);
    
    onStart(selectedUniverse, selectedTheme, selectedChapter, mode);
  };

  if (loading) {
    return <div className="loading">Loading universes...</div>;
  }

  return (
    <div className="universe-selector" style={{
      background: selectedUniverse
        ? `linear-gradient(180deg, ${selectedUniverse.backgroundGradient.join(', ')})`
        : 'linear-gradient(180deg, #0f1038, #272963)'
    }}>
      <button className="settings-icon-button" onClick={() => setSettingsOpen(true)} title="Settings">
        ⚙️
      </button>
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <div className="selector-container">
        <h1 className="title glow-text">WordRush</h1>
        
        <div className="selector-group">
          <label>Universe:</label>
          <select
            value={selectedUniverse?.id || ''}
            onChange={(e) => handleUniverseChange(e.target.value)}
          >
            <option value="">-- Select Universe --</option>
            {universes.map(u => (
              <option key={u.id} value={u.id}>
                {u.icon} {u.name}
              </option>
            ))}
          </select>
        </div>

        {selectedUniverse && (
          <div className="selector-group">
            <label>Theme:</label>
            <select
              value={selectedTheme?.id || ''}
              onChange={(e) => handleThemeChange(e.target.value)}
            >
              <option value="">-- Select Theme --</option>
              {selectedUniverse.themes.map(themeId => (
                <option key={themeId} value={themeId}>
                  {themeId}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedTheme && (
          <div className="selector-group">
            <label>Chapter:</label>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
            >
              <option value="">-- Select Chapter --</option>
              {Object.keys(selectedTheme.chapters).map(chapterId => (
                <option key={chapterId} value={chapterId}>
                  {chapterId}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedChapter && (
          <>
            <div className="selector-group">
              <label>Mode:</label>
              <div className="mode-toggle">
                <button
                  className={mode === 'lernmodus' ? 'active' : ''}
                  onClick={() => setMode('lernmodus')}
                >
                  🎓 Lernmodus (10%)
                </button>
                <button
                  className={mode === 'shooter' ? 'active' : ''}
                  onClick={() => setMode('shooter')}
                >
                  🎯 Shooter (100%)
                </button>
              </div>
            </div>

            <button className="start-button" onClick={handleStart}>
              ▶️ Start
            </button>
          </>
        )}

        {selectedTheme && (
          <div className="info-box">
            <h3>{selectedTheme.name}</h3>
            <p>{selectedTheme.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

