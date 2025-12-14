import { useState, useRef, useEffect } from 'react';
import type { VisualConfig as VisualConfigType } from '@/types/content.types';

interface VisualConfigProps {
  config: VisualConfigType;
  onChange: (config: VisualConfigType) => void;
  label?: string;
  showPreview?: boolean;
}

const SHAPE_VARIANTS = [
  { id: 'hexagon', label: '⬡ Hexagon' },
  { id: 'star', label: '⭐ Star' },
  { id: 'bubble', label: '○ Bubble' },
  { id: 'spike', label: '▲ Spike' },
  { id: 'square', label: '■ Square' },
  { id: 'diamond', label: '◆ Diamond' },
];

const THEME_COLORS = [
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#f44336', // Red
  '#FFC107', // Yellow
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#FF5722', // Deep Orange
  '#795548', // Brown
];

export function VisualConfig({ config, onChange, label, showPreview = true }: VisualConfigProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState(config.color || '#2196F3');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (showPreview && canvasRef.current) {
      drawPreview();
    }
  }, [config, showPreview]);

  const handleChange = (field: keyof VisualConfigType, value: any) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  const drawPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = 40;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw shape
    ctx.save();
    ctx.fillStyle = config.color || '#2196F3';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;

    switch (config.variant) {
      case 'hexagon':
        drawHexagon(ctx, centerX, centerY, size);
        break;
      case 'star':
        drawStar(ctx, centerX, centerY, size);
        break;
      case 'bubble':
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case 'spike':
        drawTriangle(ctx, centerX, centerY, size);
        break;
      case 'square':
        ctx.fillRect(centerX - size, centerY - size, size * 2, size * 2);
        ctx.strokeRect(centerX - size, centerY - size, size * 2, size * 2);
        break;
      case 'diamond':
        drawDiamond(ctx, centerX, centerY, size);
        break;
      default:
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();

    // Add glow effect if enabled
    if (config.glow) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = config.color || '#2196F3';
    }

    // Add pulsate animation hint
    if (config.pulsate) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = `${14 * (config.fontSize || 1)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Word', centerX, centerY);
  };

  const drawHexagon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
      
      const innerAngle = angle + Math.PI / 5;
      const innerPx = x + (size * 0.5) * Math.cos(innerAngle);
      const innerPy = y + (size * 0.5) * Math.sin(innerAngle);
      ctx.lineTo(innerPx, innerPy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const drawTriangle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x - size, y + size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const drawDiamond = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.05)', 
      borderRadius: '8px', 
      padding: '0.75rem',
      marginBottom: '0.75rem',
    }}>
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

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: '1 1 auto' }}>
          {/* Color Picker Button */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '8px',
                background: config.color || '#2196F3',
                border: '2px solid rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'transform 0.2s',
              }}
              onClick={() => setShowColorPicker(!showColorPicker)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title="Click to change color"
            />

            {showColorPicker && (
              <div style={{ 
                position: 'absolute',
                top: '55px',
                left: 0,
                zIndex: 1000,
                background: 'rgba(26, 31, 53, 0.98)', 
                borderRadius: '8px', 
                padding: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                minWidth: '200px',
              }}>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.7 }}>Theme Colors</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                  {THEME_COLORS.map(color => (
                    <div
                      key={color}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        background: color,
                        cursor: 'pointer',
                        border: config.color === color ? '3px solid white' : '1px solid rgba(255, 255, 255, 0.2)',
                        transition: 'transform 0.2s',
                      }}
                      onClick={() => {
                        handleChange('color', color);
                        setShowColorPicker(false);
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.7 }}>Custom</div>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    handleChange('color', e.target.value);
                  }}
                  style={{ width: '100%', height: '40px', cursor: 'pointer', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}
                />
              </div>
            )}
          </div>

          {/* Shape Variants - Horizontal */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {SHAPE_VARIANTS.map(variant => (
              <button
                key={variant.id}
                className={`editor-button small ${config.variant === variant.id ? 'primary' : ''}`}
                onClick={() => handleChange('variant', variant.id)}
                style={{ 
                  padding: '0.5rem', 
                  fontSize: '0.85rem',
                  minWidth: '50px',
                }}
                title={variant.label}
              >
                {variant.label.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Effects - Horizontal with Hover Titles */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                transition: 'background 0.2s',
              }}
              title="Pulsate: Breathing animation effect"
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <input
                type="checkbox"
                checked={config.pulsate || false}
                onChange={(e) => handleChange('pulsate', e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem' }}>💫</span>
            </label>
            <label 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                transition: 'background 0.2s',
              }}
              title="Shake: Vibration effect"
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <input
                type="checkbox"
                checked={config.shake || false}
                onChange={(e) => handleChange('shake', e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem' }}>📳</span>
            </label>
            <label 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                transition: 'background 0.2s',
              }}
              title="Glow: Shadow effect around object"
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <input
                type="checkbox"
                checked={config.glow || false}
                onChange={(e) => handleChange('glow', e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem' }}>✨</span>
            </label>
          </div>

          {/* Font Size Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>0.8x</span>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              value={config.fontSize || 1.0}
              onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>1.5x</span>
          </div>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <canvas
            ref={canvasRef}
            width={150}
            height={150}
            style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              background: 'rgba(0, 0, 0, 0.3)',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );
}


