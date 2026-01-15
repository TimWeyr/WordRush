/**
 * Context Pause Overlay Component
 * 
 * Displays detailed context information when the game is paused by a context message.
 * Shows:
 * - What happened (correct shot / distractor collision)
 * - Word that was involved
 * - Context message with highlighted word
 * - Points change (gain/loss)
 * - Streak status (if broken)
 * - Quick settings toggles (show context / pause on context)
 */

import React, { useState, useEffect } from 'react';
import { useToast } from './Toast/ToastContainer';
import { localProgressProvider } from '@/infra/providers/LocalProgressProvider';
import type { ContextEventData } from '@/types/game.types';
import './ContextPauseOverlay.css';

// ============================================================================
// TYPES
// ============================================================================

export interface ContextPauseOverlayProps {
  data: ContextEventData;
  onDismiss: () => void;
  screenWidth?: number;
  screenHeight?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ContextPauseOverlay: React.FC<ContextPauseOverlayProps> = ({
  data,
  onDismiss,
  screenWidth = window.innerWidth,
  screenHeight = window.innerHeight
}) => {
  const { showToast } = useToast();
  
  // Master toggle
  const [showFeedback, setShowFeedback] = useState(true);
  
  // Sub-toggles (what to show)
  const [showCorrectShot, setShowCorrectShot] = useState(true);           // ❌ Default
  const [showDistractorCollision, setShowDistractorCollision] = useState(true); // 💥 Default
  const [showCorrectCollect, setShowCorrectCollect] = useState(false);     // ✅
  const [showDistractorShot, setShowDistractorShot] = useState(false);     // 💚
  
  // Auto-dismiss after 2 seconds (Default: false = nur per Klick schließen)
  const [pauseOnContextMessages, setPauseOnContextMessages] = useState(false);
  
  // Auto-dismiss timer when "Auto weiter" is enabled
  useEffect(() => {
    if (pauseOnContextMessages) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [pauseOnContextMessages, onDismiss]);
  
  // ============================================================================
  // SMART POSITIONING
  // ============================================================================
  
  const calculatePopupPosition = (): React.CSSProperties => {
    const isMobile = screenWidth < 768;
    const popupWidth = isMobile ? screenWidth * 0.9 : 350;
    const popupHeight = 400; // Approximate height
    const padding = 20;
    
    if (isMobile) {
      // Mobile: Center horizontally, position vertically based on event
      return {
        left: '50%',
        transform: 'translateX(-50%)',
        top: data.position.y < screenHeight / 2 
          ? `${Math.max(padding, data.position.y + 50)}px` // Below event
          : `${Math.min(screenHeight - popupHeight - padding, data.position.y - popupHeight - 50)}px` // Above event
      };
    }
    
    // Desktop: Position near event, stay within bounds
    let left = data.position.x + 50; // Offset to the right
    let top = data.position.y - popupHeight / 2; // Center vertically
    
    // Keep within horizontal bounds
    if (left + popupWidth > screenWidth - padding) {
      left = data.position.x - popupWidth - 50; // Position to the left instead
    }
    if (left < padding) {
      left = padding;
    }
    
    // Keep within vertical bounds
    if (top < padding) {
      top = padding;
    }
    if (top + popupHeight > screenHeight - padding) {
      top = screenHeight - popupHeight - padding;
    }
    
    return {
      left: `${left}px`,
      top: `${top}px`
    };
  };
  
  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await localProgressProvider.getUISettings();
        const gps = settings.gameplaySettings;
        
        // Master toggle
        setShowFeedback(gps?.showFeedback ?? true);
        
        // FEHLER: Immer AN bei Spielstart (Reset auf true)
        setShowCorrectShot(true);  // ❌ Immer AN
        setShowDistractorCollision(true);  // 💥 Immer AN
        
        // ERFOLGE: User-Wahl wird erinnert (persistiert)
        setShowCorrectCollect(gps?.showCorrectCollect ?? false);  // ✅ Gespeichert
        setShowDistractorShot(gps?.showDistractorShot ?? false);  // 💚 Gespeichert
        
        // Default: Nur per Klick schließen (false), nicht auto-dismiss
        setPauseOnContextMessages(gps?.pauseOnContextMessages ?? false);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);
  
  // Save settings when changed
  const handleSettingsChange = async (
    updates: {
      showFeedback?: boolean;
      showCorrectShot?: boolean;
      showDistractorCollision?: boolean;
      showCorrectCollect?: boolean;
      showDistractorShot?: boolean;
      pauseOnContextMessages?: boolean;
    },
    toastMessage?: string
  ) => {
    try {
      const settings = await localProgressProvider.getUISettings();
      const updatedSettings = {
        ...settings,
        gameplaySettings: {
          ...settings.gameplaySettings!,
          showFeedback: updates.showFeedback ?? showFeedback,
          showCorrectShot: updates.showCorrectShot ?? showCorrectShot,
          showDistractorCollision: updates.showDistractorCollision ?? showDistractorCollision,
          showCorrectCollect: updates.showCorrectCollect ?? showCorrectCollect,
          showDistractorShot: updates.showDistractorShot ?? showDistractorShot,
          pauseOnContextMessages: updates.pauseOnContextMessages ?? pauseOnContextMessages
        }
      };
      await localProgressProvider.saveUISettings(updatedSettings);
      
      // Show toast if provided
      if (toastMessage) {
        showToast(toastMessage, 'info', 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('❌ Fehler beim Speichern der Einstellungen', 'error');
    }
  };
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const getEventIcon = () => {
    switch (data.type) {
      case 'correct_shot':
        return '😳';
      case 'distractor_collision':
        return '💥';
      case 'distractor_reached_base':
        return '⚠️';
      default:
        return '📖';
    }
  };
  
  const getEventAction = () => {
    switch (data.type) {
      case 'correct_shot':
        return 'abgeschossen⚠️';
      case 'distractor_collision':
        return 'kollidiert';
      case 'distractor_reached_base':
        return 'durchgekommen';
      default:
        return '';
    }
  };
  
  const highlightWordInContext = (context: string, word: string): React.ReactNode => {
    if (!word) return context;
    
    // Case-insensitive word boundary search
    const regex = new RegExp(`\\b(${word})\\b`, 'gi');
    const parts = context.split(regex);
    
    return parts.map((part, index) => {
      // Check if this part matches the word (case-insensitive)
      if (part.toLowerCase() === word.toLowerCase()) {
        return (
          <strong key={index} className="highlighted-word">
            {part}
          </strong>
        );
      }
      return part;
    });
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  const popupStyle = calculatePopupPosition();
  
  return (
    <div 
      className="context-pause-overlay"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }}
    >
      <div 
        className="context-pause-content"
        style={popupStyle}
        onClick={(e) => e.stopPropagation()} // Don't dismiss when clicking content
      >
        {/* What Happened - Compact */}
        <div className="context-event-summary">
          {getEventIcon()} 
          {data.type === 'distractor_collision' ? (
            <>Mit "{data.word}" {getEventAction()} <span className="points-negative">{data.pointsChange}</span></>
          ) : (
            <>"{data.word}" {getEventAction()} <span className={data.pointsChange >= 0 ? 'points-positive' : 'points-negative'}>{data.pointsChange >= 0 ? '+' : ''}{data.pointsChange}</span></>
          )}
        </div>
        
        {/* Streak Info (if broken) */}
        {data.streakBroken && data.previousStreak && (
          <div className="streak-broken-info">
            💔 Streak verloren: {data.previousStreak} → 0
          </div>
        )}
        
        {/* Context (only show if not empty) */}
        {data.context && data.context.trim() !== '' && (
          <div className="context-text">
            📖 {highlightWordInContext(data.context, data.word)}
          </div>
        )}
        
        {/* Quick Settings */}
        <div className="context-quick-settings">
          {/* Master Toggle */}
          <div className="setting-toggle master-toggle">
            <label>
              <input
                type="checkbox"
                checked={showFeedback}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setShowFeedback(newValue);
                  
                  if (newValue) {
                    // Activate master: Enable top 2 (errors)
                    setShowCorrectShot(true);
                    setShowDistractorCollision(true);
                    handleSettingsChange({ 
                      showFeedback: true, 
                      showCorrectShot: true, 
                      showDistractorCollision: true 
                    });
                  } else {
                    // Deactivate master: Disable all sub-toggles
                    setShowCorrectShot(false);
                    setShowDistractorCollision(false);
                    setShowCorrectCollect(false);
                    setShowDistractorShot(false);
                    handleSettingsChange({ 
                      showFeedback: false, 
                      showCorrectShot: false, 
                      showDistractorCollision: false,
                      showCorrectCollect: false,
                      showDistractorShot: false
                    }, 'Alle Meldungen ausgeschaltet');
                  }
                }}
              />
              <span>Feedback anzeigen</span>
            </label>
          </div>
          
          {/* Sub-Toggles (only visible if master is active) */}
          {showFeedback && (
            <div className="sub-toggles">
              <div className="setting-toggle sub-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={showCorrectShot}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setShowCorrectShot(newValue);
                      handleSettingsChange(
                        { showCorrectShot: newValue },
                        newValue ? '❌ Zeige wenn Lösungen abgeschossen werden' : undefined
                      );
                    }}
                  />
                  <span>Richtige Wörter abgeschossen ❌</span>
                </label>
              </div>
              
              <div className="setting-toggle sub-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={showDistractorCollision}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setShowDistractorCollision(newValue);
                      handleSettingsChange(
                        { showDistractorCollision: newValue },
                        newValue ? '💥 Zeige wenn Ablenker kollidieren' : undefined
                      );
                    }}
                  />
                  <span>Falsche Wörter eingesammelt 💥</span>
                </label>
              </div>
              
              <div className="setting-toggle sub-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={showCorrectCollect}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setShowCorrectCollect(newValue);
                      handleSettingsChange(
                        { showCorrectCollect: newValue },
                        newValue ? '✅ Zeige wenn Lösungen gesammelt werden' : undefined
                      );
                    }}
                  />
                  <span>Richtige Wörter eingesammelt ✅</span>
                </label>
              </div>
              
              <div className="setting-toggle sub-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={showDistractorShot}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setShowDistractorShot(newValue);
                      handleSettingsChange(
                        { showDistractorShot: newValue },
                        newValue ? '💚 Zeige wenn Ablenker eliminiert werden' : undefined
                      );
                    }}
                  />
                  <span>Falsche Wörter abgeschossen 💚</span>
                </label>
              </div>
            </div>
          )}
          
          {/* How to show */}
          <div className="setting-toggle">
            <label>
              <input
                type="checkbox"
                checked={pauseOnContextMessages}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setPauseOnContextMessages(newValue);
                  handleSettingsChange(
                    { pauseOnContextMessages: newValue },
                    newValue ? 'Nach 2 Sekunden automatisch weiter' : 'Nur per Klick schließen'
                  );
                }}
              />
              <span>⏱️ Nach 2 Sek. automatisch weiter</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

