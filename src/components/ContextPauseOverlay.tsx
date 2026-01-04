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
  const [showContextMessages, setShowContextMessages] = useState(true);
  const [pauseOnContextMessages, setPauseOnContextMessages] = useState(false);
  
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
        setShowContextMessages(settings.gameplaySettings?.showContextMessages ?? true);
        setPauseOnContextMessages(settings.gameplaySettings?.pauseOnContextMessages ?? false);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);
  
  // Save settings when changed
  const handleSettingsChange = async (
    newShowContext?: boolean,
    newPauseOnContext?: boolean
  ) => {
    try {
      const settings = await localProgressProvider.getUISettings();
      const updatedSettings = {
        ...settings,
        gameplaySettings: {
          ...settings.gameplaySettings!,
          showContextMessages: newShowContext ?? showContextMessages,
          pauseOnContextMessages: newPauseOnContext ?? pauseOnContextMessages
        }
      };
      await localProgressProvider.saveUISettings(updatedSettings);
      
      // Show toast for "show context" deactivation
      if (newShowContext === false) {
        showToast('💡 Context-Meldungen deaktiviert. In Settings wieder anschalten!', 'info', 4000);
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
        
        {/* Context */}
        <div className="context-text">
          📖 {highlightWordInContext(data.context, data.word)}
        </div>
        
        {/* Quick Settings */}
        <div className="context-quick-settings">
          <div className="setting-toggle">
            <label>
              <input
                type="checkbox"
                checked={showContextMessages}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setShowContextMessages(newValue);
                  handleSettingsChange(newValue, undefined);
                }}
              />
              <span>Meldung ausschalten</span>
            </label>
          </div>
          
          <div className="setting-toggle">
            <label>
              <input
                type="checkbox"
                checked={!pauseOnContextMessages}
                onChange={(e) => {
                  const newValue = !e.target.checked;
                  setPauseOnContextMessages(newValue);
                  handleSettingsChange(undefined, newValue);
                }}
              />
              <span>Meldung blinkt nur kurz</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

