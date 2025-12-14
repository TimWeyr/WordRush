/**
 * SpawnConfig Component
 * 
 * Visual editor for spawn/movement configuration of game objects.
 * Provides intuitive sliders and controls for:
 * - Spawn position & spread
 * - Movement speed & behavior
 * - Points & gameplay parameters
 * - HP/Damage values
 */

import { useCallback, useMemo } from 'react';
import type { CorrectEntry, DistractorEntry } from '@/types/content.types';

// ============================================================================
// TYPES
// ============================================================================

interface SpawnConfigProps {
  config: CorrectEntry | DistractorEntry;
  onChange: (config: CorrectEntry | DistractorEntry) => void;
  label?: string;
}

type ConfigKey = keyof CorrectEntry | keyof DistractorEntry;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Available movement behaviors */
const BEHAVIORS = [
  'linear_inward',
  'seek_center',
  'wave',
  'zigzag',
  'spiral',
  'bounce',
] as const;

/** Speed thresholds for visual labels */
const SPEED_THRESHOLDS = {
  VERY_SLOW: 0.7,
  SLOW: 1.0,
  NORMAL: 1.3,
  FAST: 1.7,
} as const;

/** Default values for optional fields */
const DEFAULTS = {
  behavior: 'linear_inward' as const,
  spawnDelay: 0,
  hp: 1,
  damage: 0,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get speed label with emoji based on numeric speed value
 */
function getSpeedLabel(speed: number): string {
  if (speed < SPEED_THRESHOLDS.VERY_SLOW) return '🐢 Very Slow';
  if (speed < SPEED_THRESHOLDS.SLOW) return '🚶 Slow';
  if (speed < SPEED_THRESHOLDS.NORMAL) return '🏃 Normal';
  if (speed < SPEED_THRESHOLDS.FAST) return '🚀 Fast';
  return '⚡ Very Fast';
}

/**
 * Safe number parser with fallback
 * Prevents NaN from breaking the UI
 */
function safeParseFloat(value: string, fallback: number): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safe integer parser with fallback
 */
function safeParseInt(value: string, fallback: number): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Check if config is a distractor (has damage property)
 */
function isDistractorConfig(config: CorrectEntry | DistractorEntry): config is DistractorEntry {
  return 'damage' in config;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SpawnConfig({ config, onChange, label }: SpawnConfigProps) {
  // ============================================================================
  // HANDLERS (memoized for performance)
  // ============================================================================
  
  const handleChange = useCallback((field: ConfigKey, value: any) => {
    onChange({
      ...config,
      [field]: value,
    });
  }, [config, onChange]);

  const handlePositionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = safeParseFloat(e.target.value, config.spawnPosition);
    handleChange('spawnPosition', value);
  }, [config.spawnPosition, handleChange]);

  const handleSpreadChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = safeParseFloat(e.target.value, config.spawnSpread);
    handleChange('spawnSpread', value);
  }, [config.spawnSpread, handleChange]);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = safeParseFloat(e.target.value, config.speed);
    handleChange('speed', value);
  }, [config.speed, handleChange]);

  const handleBehaviorChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange('behavior', e.target.value);
  }, [handleChange]);

  const handlePointsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = safeParseInt(e.target.value, config.points);
    handleChange('points', value);
  }, [config.points, handleChange]);

  const handleSpawnDelayChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = safeParseInt(e.target.value, config.spawnDelay ?? DEFAULTS.spawnDelay);
    handleChange('spawnDelay', value);
  }, [config.spawnDelay, handleChange]);

  const handleHpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = safeParseInt(e.target.value, config.hp ?? DEFAULTS.hp);
    handleChange('hp', value);
  }, [config.hp, handleChange]);

  const handleDamageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDistractorConfig(config)) {
      const value = safeParseInt(e.target.value, config.damage ?? DEFAULTS.damage);
      handleChange('damage', value);
    }
  }, [config, handleChange]);

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================
  
  const speedLabel = useMemo(() => getSpeedLabel(config.speed), [config.speed]);
  const behavior = config.behavior ?? DEFAULTS.behavior;
  const objectColor = config.visual?.color ?? '#2196F3';

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.05)', 
      borderRadius: '8px', 
      padding: '0.75rem',
      marginBottom: '0.75rem',
    }}>
      {/* Section Label */}
      {label && (
        <div style={{ 
          fontSize: '0.9rem', 
          fontWeight: 600, 
          marginBottom: '0.75rem',
          opacity: 0.8,
        }}>
          {label}
        </div>
      )}

      {/* Spawn Position */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label 
          className="editor-form-label"
          htmlFor="spawn-position"
        >
          📍 Spawn Position: {(config.spawnPosition * 100).toFixed(0)}%
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.7, width: '60px' }}>Left</span>
          <input
            id="spawn-position"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.spawnPosition}
            onChange={handlePositionChange}
            style={{ flex: 1 }}
            aria-label="Spawn position slider"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={config.spawnPosition}
            aria-valuetext={`${(config.spawnPosition * 100).toFixed(0)}%`}
          />
          <span style={{ fontSize: '0.85rem', opacity: 0.7, width: '60px', textAlign: 'right' }}>Right</span>
        </div>
        
        {/* Visual Position Indicator */}
        <div 
          style={{ 
            height: '40px', 
            background: 'rgba(255, 255, 255, 0.1)', 
            borderRadius: '6px',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          role="img"
          aria-label={`Object will spawn at ${(config.spawnPosition * 100).toFixed(0)}% from left`}
        >
          <div style={{
            position: 'absolute',
            left: `${config.spawnPosition * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            background: objectColor,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }} />
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '0',
            bottom: '0',
            width: '2px',
            background: 'rgba(255, 255, 255, 0.3)',
          }} />
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '0.75rem', 
          opacity: 0.5,
          marginTop: '0.25rem',
        }}>
          <span>0%</span>
          <span>50% (Center)</span>
          <span>100%</span>
        </div>
      </div>

      {/* Spawn Spread */}
      <div className="editor-form-group" style={{ marginBottom: '1.5rem' }}>
        <label 
          className="editor-form-label"
          htmlFor="spawn-spread"
        >
          📊 Spawn Spread: {(config.spawnSpread * 100).toFixed(0)}%
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.7, width: '60px' }}>Tight</span>
          <input
            id="spawn-spread"
            type="range"
            min="0"
            max="0.3"
            step="0.01"
            value={config.spawnSpread}
            onChange={handleSpreadChange}
            style={{ flex: 1 }}
            aria-label="Spawn spread slider"
            aria-describedby="spawn-spread-hint"
          />
          <span style={{ fontSize: '0.85rem', opacity: 0.7, width: '60px', textAlign: 'right' }}>Wide</span>
        </div>
        <span className="editor-form-hint" id="spawn-spread-hint">
          Controls how much variation in spawn position (±{(config.spawnSpread * 100).toFixed(0)}%)
        </span>
      </div>

      {/* Speed */}
      <div className="editor-form-group" style={{ marginBottom: '1.5rem' }}>
        <label 
          className="editor-form-label"
          htmlFor="spawn-speed"
        >
          🚀 Speed: {config.speed.toFixed(2)} {speedLabel}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.7, width: '60px' }}>0.5</span>
          <input
            id="spawn-speed"
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={config.speed}
            onChange={handleSpeedChange}
            style={{ flex: 1 }}
            aria-label="Speed slider"
            aria-valuetext={`${config.speed.toFixed(2)} - ${speedLabel}`}
          />
          <span style={{ fontSize: '0.85rem', opacity: 0.7, width: '60px', textAlign: 'right' }}>2.5</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '0.75rem', 
          opacity: 0.5,
          marginTop: '0.25rem',
        }}>
          <span>🐢 Slow</span>
          <span>🏃 Normal</span>
          <span>⚡ Fast</span>
        </div>
      </div>

      {/* Behavior */}
      <div className="editor-form-group" style={{ marginBottom: '1.5rem' }}>
        <label 
          className="editor-form-label"
          htmlFor="spawn-behavior"
        >
          🎯 Movement Behavior
        </label>
        <select
          id="spawn-behavior"
          className="editor-form-select"
          value={behavior}
          onChange={handleBehaviorChange}
          aria-describedby="behavior-hint"
        >
          {BEHAVIORS.map(behaviorOption => (
            <option key={behaviorOption} value={behaviorOption}>
              {behaviorOption.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
        <span className="editor-form-hint" id="behavior-hint">
          How the object moves across the screen
        </span>
      </div>

      {/* Points */}
      <div className="editor-form-group" style={{ marginBottom: '1.5rem' }}>
        <label 
          className="editor-form-label"
          htmlFor="spawn-points"
        >
          🎯 Points: {config.points}
        </label>
        <input
          id="spawn-points"
          type="number"
          className="editor-form-input"
          value={config.points}
          onChange={handlePointsChange}
          min={-100}
          max={100}
          step={5}
          aria-describedby="points-hint"
        />
        <span className="editor-form-hint" id="points-hint">
          Points awarded/deducted when collected/shot
        </span>
      </div>

      {/* Spawn Delay (optional) */}
      {config.spawnDelay !== undefined && (
        <div className="editor-form-group" style={{ marginBottom: '1.5rem' }}>
          <label 
            className="editor-form-label"
            htmlFor="spawn-delay"
          >
            ⏱️ Spawn Delay: {config.spawnDelay}ms
          </label>
          <input
            id="spawn-delay"
            type="number"
            className="editor-form-input"
            value={config.spawnDelay}
            onChange={handleSpawnDelayChange}
            min={0}
            max={5000}
            step={100}
            aria-describedby="spawn-delay-hint"
          />
          <span className="editor-form-hint" id="spawn-delay-hint">
            Delay before object spawns (in milliseconds)
          </span>
        </div>
      )}

      {/* HP (optional, for correct objects) */}
      {config.hp !== undefined && (
        <div className="editor-form-group" style={{ marginBottom: '1.5rem' }}>
          <label 
            className="editor-form-label"
            htmlFor="spawn-hp"
          >
            ❤️ Health Points: {config.hp}
          </label>
          <input
            id="spawn-hp"
            type="number"
            className="editor-form-input"
            value={config.hp}
            onChange={handleHpChange}
            min={1}
            max={10}
            aria-describedby="hp-hint"
          />
          <span className="editor-form-hint" id="hp-hint">
            How many hits needed to destroy (1 = one shot)
          </span>
        </div>
      )}

      {/* Damage (for distractors) */}
      {isDistractorConfig(config) && (
        <div className="editor-form-group">
          <label 
            className="editor-form-label"
            htmlFor="spawn-damage"
          >
            💥 Damage: {config.damage ?? DEFAULTS.damage}
          </label>
          <input
            id="spawn-damage"
            type="number"
            className="editor-form-input"
            value={config.damage ?? DEFAULTS.damage}
            onChange={handleDamageChange}
            min={0}
            max={100}
            step={5}
            aria-describedby="damage-hint"
          />
          <span className="editor-form-hint" id="damage-hint">
            Damage dealt to player if hit
          </span>
        </div>
      )}
    </div>
  );
}
