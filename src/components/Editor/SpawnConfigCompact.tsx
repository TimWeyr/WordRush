import type { CorrectEntry, DistractorEntry } from '@/types/content.types';

interface SpawnConfigProps {
  config: CorrectEntry | DistractorEntry;
  onChange: (config: CorrectEntry | DistractorEntry) => void;
  label?: string;
}

const BEHAVIORS = ['linear_inward', 'seek_center', 'wave', 'zigzag', 'spiral', 'bounce'];

export function SpawnConfig({ config, onChange, label }: SpawnConfigProps) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.05)', 
      borderRadius: '8px', 
      padding: '0.75rem',
      marginBottom: '0.75rem',
    }}>
      {label && (
        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', opacity: 0.8 }}>
          {label}
        </div>
      )}

      {/* Row 1: Position, Spread, Speed (alle 30% breit) */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>📍 Position: {(config.spawnPosition * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.spawnPosition}
            onChange={(e) => handleChange('spawnPosition', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>📊 Spread: {(config.spawnSpread * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.01"
            value={config.spawnSpread}
            onChange={(e) => handleChange('spawnSpread', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>🚀 Speed: {config.speed.toFixed(1)}</span>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={config.speed}
            onChange={(e) => handleChange('speed', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Row 2: Movement, Points, HP/Damage (je 25%) */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <select
          className="editor-form-select"
          value={config.behavior || 'linear_inward'}
          onChange={(e) => handleChange('behavior', e.target.value)}
          style={{ flex: '0 0 25%', padding: '0.4rem', fontSize: '0.85rem' }}
        >
          {BEHAVIORS.map(behavior => (
            <option key={behavior} value={behavior}>
              {behavior.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <input
          type="number"
          className="editor-form-input"
          value={config.points}
          onChange={(e) => handleChange('points', parseInt(e.target.value))}
          min={-100}
          max={100}
          step={5}
          placeholder="Points"
          style={{ flex: '0 0 25%', padding: '0.4rem', fontSize: '0.85rem' }}
        />

        {config.hp !== undefined && (
          <input
            type="number"
            className="editor-form-input"
            value={config.hp}
            onChange={(e) => handleChange('hp', parseInt(e.target.value))}
            min={1}
            max={10}
            placeholder="HP"
            style={{ flex: '0 0 25%', padding: '0.4rem', fontSize: '0.85rem' }}
          />
        )}

        {'damage' in config && (
          <input
            type="number"
            className="editor-form-input"
            value={config.damage}
            onChange={(e) => handleChange('damage', parseInt(e.target.value))}
            min={0}
            max={100}
            step={5}
            placeholder="Damage"
            style={{ flex: '0 0 25%', padding: '0.4rem', fontSize: '0.85rem' }}
          />
        )}
      </div>
    </div>
  );
}

