import { useState, useRef, useEffect } from 'react';
import './SearchableDropdown.css';

interface SearchableDropdownProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  onAdd?: () => void;
  onLoadAll?: () => void;
  showLoadAll?: boolean;
}

export function SearchableDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  label,
  onAdd,
  onLoadAll,
  showLoadAll = false,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options by search
  const filteredOptions = search
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.value.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // Get selected option label
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="searchable-dropdown" ref={dropdownRef}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
          <label className="editor-sidebar-label">{label}</label>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {showLoadAll && onLoadAll && value && (
              <button
                className="editor-button small primary"
                onClick={onLoadAll}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                title={`Load all items for this ${label.toLowerCase()}`}
              >
                📥
              </button>
            )}
            {onAdd && (
              <button
                className="editor-button small"
                onClick={onAdd}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                title={`Add new ${label.toLowerCase()}`}
              >
                +
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dropdown Button */}
      <button
        className={`searchable-dropdown-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className={value ? '' : 'placeholder'}>{displayValue}</span>
        <span className="dropdown-arrow">▼</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="searchable-dropdown-menu">
          {/* Search Input */}
          <div className="searchable-dropdown-search">
            <input
              type="text"
              className="searchable-dropdown-input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options List */}
          <div className="searchable-dropdown-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`searchable-dropdown-option ${option.value === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                  {option.value === value && <span className="check-icon">✓</span>}
                </div>
              ))
            ) : (
              <div className="searchable-dropdown-empty">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

