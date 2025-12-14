import { useState } from 'react';

interface GradientPickerProps {
  colors: string[];
  onChange: (colors: string[]) => void;
  label?: string;
}

const PRESET_COLORS = [
  '#1a237e', '#283593', '#3f51b5', '#5c6bc0', '#7986cb',
  '#0d47a1', '#1976d2', '#2196f3', '#42a5f5', '#64b5f6',
  '#006064', '#00838f', '#00acc1', '#26c6da', '#4dd0e1',
  '#1b5e20', '#388e3c', '#4caf50', '#66bb6a', '#81c784',
  '#f57f17', '#f9a825', '#fbc02d', '#fff176', '#fff59d',
  '#e65100', '#f57c00', '#ff9800', '#ffa726', '#ffb74d',
  '#b71c1c', '#c62828', '#f44336', '#e57373', '#ef5350',
  '#4a148c', '#6a1b9a', '#8e24aa', '#ab47bc', '#ba68c8',
  '#212121', '#424242', '#616161', '#757575', '#9e9e9e',
];

export function GradientPicker({ colors, onChange, label }: GradientPickerProps) {
  const [localColors, setLocalColors] = useState<string[]>(colors);

  const handleColorChange = (index: number, newColor: string) => {
    const updated = [...localColors];
    updated[index] = newColor;
    setLocalColors(updated);
    onChange(updated);
  };

  const handleAddColor = () => {
    const updated = [...localColors, '#2196F3'];
    setLocalColors(updated);
    onChange(updated);
  };

  const handleRemoveColor = (index: number) => {
    if (localColors.length <= 2) {
      alert('A gradient must have at least 2 colors');
      return;
    }
    const updated = localColors.filter((_, i) => i !== index);
    setLocalColors(updated);
    onChange(updated);
  };

  const handlePresetClick = (presetColor: string, index: number) => {
    const updated = [...localColors];
    updated[index] = presetColor;
    setLocalColors(updated);
    onChange(updated);
  };

  // Generate CSS gradient string
  const gradientStyle = `linear-gradient(to bottom, ${localColors.join(', ')})`;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {label && (
        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          {label}
        </div>
      )}

      {/* Live Gradient Preview */}
      <div
        style={{
          width: '100%',
          height: '80px',
          background: gradientStyle,
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      />

      {/* Color Stops */}
      <div style={{ marginBottom: '1rem' }}>
        {localColors.map((color, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              marginBottom: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.75rem',
              borderRadius: '6px',
            }}
          >
            <span style={{ fontSize: '0.85rem', opacity: 0.7, minWidth: '50px' }}>
              Stop {index + 1}:
            </span>

            {/* Color Picker Input */}
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(index, e.target.value)}
              style={{
                width: '50px',
                height: '40px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            />

            {/* Hex Text Input */}
            <input
              type="text"
              className="editor-form-input"
              value={color}
              onChange={(e) => handleColorChange(index, e.target.value)}
              style={{ flex: '0 0 100px', fontSize: '0.85rem' }}
              placeholder="#RRGGBB"
            />

            {/* Preset Color Grid for this stop */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: '4px',
                flex: 1,
              }}
            >
              {PRESET_COLORS.map((presetColor, presetIndex) => (
                <div
                  key={presetIndex}
                  onClick={() => handlePresetClick(presetColor, index)}
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: presetColor,
                    border: color === presetColor ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.2)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  title={presetColor}
                />
              ))}
            </div>

            {/* Remove Button */}
            {localColors.length > 2 && (
              <button
                className="editor-button small danger"
                onClick={() => handleRemoveColor(index)}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Color Button */}
      <button
        className="editor-button small primary"
        onClick={handleAddColor}
        style={{ width: '100%' }}
      >
        + Add Color Stop
      </button>
    </div>
  );
}

