import { useState, useMemo } from 'react';
import type { Item, CorrectEntry, DistractorEntry } from '@/types/content.types';
import { VisualConfig } from './VisualConfig';
import { SpawnConfig } from './SpawnConfigCompact';
import { randomConfigGenerator } from '@/utils/RandomConfigGenerator';

interface DetailViewProps {
  item: Item | null;
  allItems: Item[];
  onItemChange: (item: Item) => void;
  onBack: () => void;
}

// Removed unused constants

export function DetailView({ item, allItems, onItemChange, onBack }: DetailViewProps) {
  const [localItem, setLocalItem] = useState<Item | null>(item);
  const [relatedSearch, setRelatedSearch] = useState('');

  // Update local item when prop changes
  if (item && localItem?.id !== item.id) {
    setLocalItem(item);
  }

  const handleFieldChange = (path: string, value: any) => {
    if (!localItem) return;

    const newItem = { ...localItem };
    const parts = path.split('.');
    
    let current: any = newItem;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part.includes('[')) {
        const [arrayName, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        current = current[arrayName][index];
      } else {
        current = current[part];
      }
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  const handleAddCorrect = () => {
    if (!localItem) return;

    const newCorrect: CorrectEntry = {
      entry: {
        word: '',
        type: 'word',
      },
      spawnPosition: 0.5,
      spawnSpread: 0.05,
      speed: 1.0,
      points: 10,
      pattern: 'single',
      context: '',
      visual: {
        color: '#4CAF50',
        variant: 'hexagon',
        fontSize: 1.0,
      },
    };

    const newItem = {
      ...localItem,
      correct: [...localItem.correct, newCorrect],
    };

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  const handleRemoveCorrect = (index: number) => {
    if (!localItem) return;

    const newItem = {
      ...localItem,
      correct: localItem.correct.filter((_, i) => i !== index),
    };

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  const handleAddDistractor = () => {
    if (!localItem) return;

    const newDistractor: DistractorEntry = {
      entry: {
        word: '',
        type: 'word',
      },
      spawnPosition: 0.5,
      spawnSpread: 0.05,
      speed: 1.2,
      points: -10,
      damage: 10,
      redirect: '',
      context: '',
      visual: {
        color: '#f44336',
        variant: 'spike',
        fontSize: 1.0,
      },
    };

    const newItem = {
      ...localItem,
      distractors: [...localItem.distractors, newDistractor],
    };

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  const handleRemoveDistractor = (index: number) => {
    if (!localItem) return;

    const newItem = {
      ...localItem,
      distractors: localItem.distractors.filter((_, i) => i !== index),
    };

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  const handleToggleRelated = (relatedId: string) => {
    if (!localItem) return;

    const related = localItem.meta.related || [];
    const newRelated = related.includes(relatedId)
      ? related.filter(id => id !== relatedId)
      : [...related, relatedId];

    const newItem = {
      ...localItem,
      meta: {
        ...localItem.meta,
        related: newRelated,
      },
    };

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  // Filter related items by search
  const filteredRelatedItems = useMemo(() => {
    if (!relatedSearch) return allItems;
    const search = relatedSearch.toLowerCase();
    return allItems.filter(i => 
      i.id !== localItem?.id && (
        i.id.toLowerCase().includes(search) ||
        i.base.word?.toLowerCase().includes(search)
      )
    );
  }, [allItems, relatedSearch, localItem]);

  if (!localItem) {
    return (
      <div style={{ 
        padding: '4rem', 
        textAlign: 'center', 
        color: 'rgba(255, 255, 255, 0.5)' 
      }}>
        <h2>Item not found</h2>
        <button className="editor-button primary" onClick={onBack}>
          ← Back to Table View
        </button>
      </div>
    );
  }

  const renderTextInput = (
    label: string,
    path: string,
    value: string,
    maxLength: number,
    placeholder: string = ''
  ) => {
    const isWarning = value.length > maxLength;
    return (
      <div className="editor-form-group">
        <label className="editor-form-label">{label}</label>
        <input
          type="text"
          className={`editor-form-input ${isWarning ? 'warning' : ''}`}
          value={value}
          onChange={(e) => handleFieldChange(path, e.target.value)}
          placeholder={placeholder}
        />
        {value.length > 0 && (
          <span className={`editor-form-hint ${isWarning ? 'warning' : ''}`}>
            {value.length}/{maxLength} {isWarning ? '⚠️ Too long!' : 'characters'}
          </span>
        )}
      </div>
    );
  };

  // Removed unused renderTextarea function

  return (
    <div className="editor-detail-container">
      <div style={{ marginBottom: '2rem' }}>
        <button className="editor-button" onClick={onBack}>
          ← Back to Table View
        </button>
      </div>

      {/* BASIC INFORMATION */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        <div className="editor-detail-section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
          📋 Basic Information
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            className="editor-form-input"
            value={localItem.id}
            disabled
            placeholder="ID"
            style={{ opacity: 0.6, cursor: 'not-allowed', flex: '0 0 140px' }}
          />
          <select
            className="editor-form-select"
            value={localItem.level}
            onChange={(e) => handleFieldChange('level', parseInt(e.target.value))}
            style={{ flex: '0 0 100px' }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
              <option key={level} value={level}>Level {level}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={localItem.published !== false}
              onChange={(e) => handleFieldChange('published', e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '0.9rem' }}>{localItem.published !== false ? '✅ Published' : '❌ Unpublished'}</span>
          </label>
        </div>
      </div>

      {/* BASE ENTRY */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        <div className="editor-detail-section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
          🎯 Base Entry
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            className="editor-form-input"
            value={localItem.base.word || ''}
            onChange={(e) => handleFieldChange('base.word', e.target.value)}
            placeholder="Base Word"
            style={{ flex: 1 }}
          />
          <select
            className="editor-form-select"
            value={localItem.base.type}
            onChange={(e) => {
              handleFieldChange('base.type', e.target.value);
              if (e.target.value === 'image') {
                // Open file picker automatically
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (event: any) => {
                  const file = event.target?.files?.[0];
                  if (file) {
                    // In a real app, you would upload the file and get a URL
                    // For now, show a dialog with instructions
                    const imagePath = `/content/assets/images/${localItem.theme}/${localItem.chapter}/${file.name}`;
                    handleFieldChange('base.image', imagePath);
                    alert(`Image selected: ${file.name}\n\nRecommended path:\n${imagePath}\n\nPlace image files in:\n/public/content/assets/images/[theme]/[chapter]/`);
                  }
                };
                input.click();
              }
            }}
            style={{ flex: '0 0 120px' }}
          >
            <option value="word">Word</option>
            <option value="phrase">Phrase</option>
            <option value="image">Image</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            className="editor-form-input"
            value={localItem.base.context || ''}
            onChange={(e) => handleFieldChange('base.context', e.target.value)}
            placeholder="Base Context (optional)"
            style={{ flex: 1 }}
          />
        </div>
        {localItem.base.type === 'image' && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              className="editor-form-input"
              value={localItem.base.image || ''}
              onChange={(e) => handleFieldChange('base.image', e.target.value)}
              placeholder="/content/assets/images/[theme]/[chapter]/image.png"
              style={{ flex: 1 }}
            />
            <button
              className="editor-button small"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (event: any) => {
                  const file = event.target?.files?.[0];
                  if (file) {
                    const imagePath = `/content/assets/images/${localItem.theme}/${localItem.chapter}/${file.name}`;
                    handleFieldChange('base.image', imagePath);
                    alert(`Image selected: ${file.name}\n\nPlace file at:\n/public${imagePath}`);
                  }
                };
                input.click();
              }}
              style={{ padding: '0.4rem 0.8rem' }}
            >
              📁 Browse
            </button>
          </div>
        )}
      </div>

      {/* CORRECT ENTRIES */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>✅ Correct Entries ({localItem.correct.length})</span>
          <button className="editor-button small primary" onClick={handleAddCorrect} style={{ padding: '0.4rem 0.8rem' }}>
            + Add
          </button>
        </div>
        {localItem.correct.map((correct, index) => (
          <div key={index} style={{ 
            background: 'rgba(76, 175, 80, 0.08)', 
            borderRadius: '6px', 
            padding: '0.75rem', 
            marginBottom: '0.75rem',
            border: '1px solid rgba(76, 175, 80, 0.25)'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="editor-form-input"
                    value={correct.entry.word || ''}
                    onChange={(e) => handleFieldChange(`correct[${index}].entry.word`, e.target.value)}
                    placeholder="Correct Answer"
                    style={{ flex: 1 }}
                  />
                  <select
                    className="editor-form-select"
                    value={correct.entry.type}
                    onChange={(e) => handleFieldChange(`correct[${index}].entry.type`, e.target.value)}
                    style={{ flex: '0 0 100px' }}
                  >
                    <option value="word">Word</option>
                    <option value="phrase">Phrase</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <textarea
                  className="editor-form-textarea"
                  value={correct.context || ''}
                  onChange={(e) => handleFieldChange(`correct[${index}].context`, e.target.value)}
                  placeholder="Context"
                  rows={2}
                  style={{ resize: 'none', minHeight: '50px' }}
                />
              </div>
              {localItem.correct.length > 1 && (
                <button 
                  className="editor-button small danger" 
                  onClick={() => handleRemoveCorrect(index)}
                  style={{ padding: '0.5rem', minWidth: '70px', flexShrink: 0 }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* DISTRACTOR ENTRIES */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>❌ Distractor Entries ({localItem.distractors.length})</span>
          <button className="editor-button small primary" onClick={handleAddDistractor} style={{ padding: '0.4rem 0.8rem' }}>
            + Add
          </button>
        </div>
        {localItem.distractors.map((distractor, index) => (
          <div key={index} style={{ 
            background: 'rgba(244, 67, 54, 0.08)', 
            borderRadius: '6px', 
            padding: '0.75rem', 
            marginBottom: '0.75rem',
            border: '1px solid rgba(244, 67, 54, 0.25)'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="editor-form-input"
                    value={distractor.entry.word || ''}
                    onChange={(e) => handleFieldChange(`distractors[${index}].entry.word`, e.target.value)}
                    placeholder="Distractor Word"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className="editor-form-input"
                    value={distractor.redirect || ''}
                    onChange={(e) => handleFieldChange(`distractors[${index}].redirect`, e.target.value)}
                    placeholder="Redirect to..."
                    style={{ flex: 1 }}
                  />
                </div>
                <textarea
                  className="editor-form-textarea"
                  value={distractor.context || ''}
                  onChange={(e) => handleFieldChange(`distractors[${index}].context`, e.target.value)}
                  placeholder="Context"
                  rows={2}
                  style={{ resize: 'none', minHeight: '50px' }}
                />
              </div>
              {localItem.distractors.length > 1 && (
                <button 
                  className="editor-button small danger" 
                  onClick={() => handleRemoveDistractor(index)}
                  style={{ padding: '0.5rem', minWidth: '70px', flexShrink: 0 }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* RELATED ITEMS */}
      <div className="editor-detail-section">
        <div className="editor-detail-section-title">
          🔗 Related Items
        </div>
        <div className="editor-form-group">
          <label className="editor-form-label">Search Items</label>
          <input
            type="text"
            className="editor-form-input"
            placeholder="Type to search items..."
            value={relatedSearch}
            onChange={(e) => setRelatedSearch(e.target.value)}
          />
        </div>
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto', 
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          {filteredRelatedItems.slice(0, 50).map(relatedItem => {
            const isSelected = localItem.meta.related?.includes(relatedItem.id);
            return (
              <label
                key={relatedItem.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: isSelected ? 'rgba(33, 150, 243, 0.2)' : 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  border: isSelected ? '1px solid rgba(33, 150, 243, 0.5)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleRelated(relatedItem.id)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontFamily: 'monospace', opacity: 0.7, fontSize: '0.85rem' }}>
                  {relatedItem.id}
                </span>
                <span style={{ flex: 1 }}>
                  {relatedItem.base.word || '(no word)'}
                </span>
                <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>
                  Level {relatedItem.level}
                </span>
              </label>
            );
          })}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <strong>Selected ({localItem.meta.related?.length || 0}):</strong>
          {localItem.meta.related && localItem.meta.related.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {localItem.meta.related.map(relatedId => (
                <span
                  key={relatedId}
                  style={{
                    background: 'rgba(33, 150, 243, 0.3)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {relatedId}
                  <button
                    onClick={() => handleToggleRelated(relatedId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '1rem',
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.5, marginTop: '0.5rem' }}>No related items selected</p>
          )}
        </div>
      </div>

      {/* META INFORMATION */}
      <div className="editor-detail-section">
        <div className="editor-detail-section-title">
          📝 Meta Information
        </div>
        <div className="editor-form-row">
          {renderTextInput('Source', 'meta.source', localItem.meta.source || '', 100, 'Source reference')}
          <div className="editor-form-group">
            <label className="editor-form-label">Tags (comma-separated)</label>
            <input
              type="text"
              className="editor-form-input"
              value={localItem.meta.tags?.join(', ') || ''}
              onChange={(e) => handleFieldChange('meta.tags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>
      </div>

      {/* VISUAL & SPAWN CONFIGURATION */}
      <div className="editor-detail-section">
        <div className="editor-detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🎨 Visual & Spawn Configuration</span>
          <button
            className="editor-button primary"
            onClick={() => {
              const randomized = randomConfigGenerator.applyRandomToItem(localItem, allItems);
              setLocalItem(randomized);
              onItemChange(randomized);
            }}
            title="Generate random visual and spawn configs (ensures uniqueness)"
          >
            🎲 Randomize All
          </button>
        </div>

        {/* Base Visual Config */}
        <VisualConfig
          config={localItem.base.visual}
          onChange={(newConfig) => handleFieldChange('base.visual', newConfig)}
          label="🎯 Base Entry Visual"
          showPreview={true}
        />

        {/* Correct Entries Config */}
        {localItem.correct.map((correct, index) => (
          <div key={`correct-config-${index}`}>
            <VisualConfig
              config={correct.visual}
              onChange={(newConfig) => handleFieldChange(`correct[${index}].visual`, newConfig)}
              label={`✅ Correct #${index + 1} - Visual`}
              showPreview={false}
            />
            <SpawnConfig
              config={correct}
              onChange={(newConfig) => handleFieldChange(`correct[${index}]`, newConfig)}
              label={`✅ Correct #${index + 1} - Spawn & Behavior`}
            />
          </div>
        ))}

        {/* Distractor Entries Config */}
        {localItem.distractors.map((distractor, index) => (
          <div key={`distractor-config-${index}`}>
            <VisualConfig
              config={distractor.visual}
              onChange={(newConfig) => handleFieldChange(`distractors[${index}].visual`, newConfig)}
              label={`❌ Distractor #${index + 1} - Visual`}
              showPreview={false}
            />
            <SpawnConfig
              config={distractor}
              onChange={(newConfig) => handleFieldChange(`distractors[${index}]`, newConfig)}
              label={`❌ Distractor #${index + 1} - Spawn & Behavior`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

