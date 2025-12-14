import { useState, useRef, useEffect } from 'react';

interface SplitDropdownButtonProps {
  mainLabel: string;
  mainAction: () => void;
  options: Array<{ label: string; action: () => void; icon?: string }>;
  className?: string;
  style?: React.CSSProperties;
}

export function SplitDropdownButton({
  mainLabel,
  mainAction,
  options,
  className = '',
  style,
}: SplitDropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMainClick = () => {
    mainAction();
    setIsOpen(false);
  };

  const handleOptionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Main Button */}
        <button
          className={`editor-button small primary ${className}`}
          onClick={handleMainClick}
          style={{
            ...style,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderRight: 'none',
          }}
        >
          {mainLabel}
        </button>
        
        {/* Dropdown Toggle */}
        <button
          className={`editor-button small primary ${className}`}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            ...style,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            padding: '0.3rem 0.5rem',
            minWidth: 'auto',
          }}
          title="More options"
        >
          ▼
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'linear-gradient(135deg, #1a1f35 0%, #0a0e1a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            minWidth: '200px',
            overflow: 'hidden',
          }}
        >
          {options.map((option, index) => (
            <button
              key={index}
              className="editor-button"
              onClick={() => handleOptionClick(option.action)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderRadius: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {option.icon && <span>{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

