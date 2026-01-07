import { useState, useMemo, useEffect, useRef } from 'react';
import type { Item, CorrectEntry, DistractorEntry, Theme } from '@/types/content.types';
import { VisualConfig } from './VisualConfig';
import { SpawnConfig } from './SpawnConfigCompact';
import { randomConfigGenerator } from '@/utils/RandomConfigGenerator';
import { jsonLoader } from '@/infra/utils/JSONLoader';
import { jsonWriter } from '@/infra/utils/JSONWriter';
import { supabaseLoader } from '@/infra/utils/SupabaseLoader';
import { useToast } from '../Toast/ToastContainer';
import { TextParserModal } from './TextParserModal';
import { SearchableDropdown } from './SearchableDropdown';

interface DetailViewProps {
  item: Item | null;
  allItems: Item[];
  onItemChange: (item: Item) => void;
  onBack: () => void;
  universeId?: string;
  theme?: Theme | null;
  chapterId?: string;
}

// Removed unused constants

export function DetailView({ item, allItems, onItemChange, onBack, universeId, theme, chapterId }: DetailViewProps) {
  const [localItem, setLocalItem] = useState<Item | null>(item);
  const [relatedSearch, setRelatedSearch] = useState('');
  const [allThemeTags, setAllThemeTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTextParserModal, setShowTextParserModal] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagSuggestionsRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Filter states for Related Items
  const [selectedFilterTheme, setSelectedFilterTheme] = useState<string>(theme?.id || '');
  const [selectedFilterChapter, setSelectedFilterChapter] = useState<string>(chapterId || '');
  const [filteredItems, setFilteredItems] = useState<Item[]>(allItems);
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);
  const [selectedFilterThemeObj, setSelectedFilterThemeObj] = useState<Theme | null>(theme || null);

  // Move/Copy states
  const [moveTargetTheme, setMoveTargetTheme] = useState<string>(theme?.id || '');
  const [moveTargetChapter, setMoveTargetChapter] = useState<string>(chapterId || '');
  const [moveTargetThemeObj, setMoveTargetThemeObj] = useState<Theme | null>(theme || null);
  const [moveAvailableChapters, setMoveAvailableChapters] = useState<string[]>([]);
  const [moveInProgress, setMoveInProgress] = useState(false);

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
      speed: 1.0,
      points: 10,
      damage: 1,
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

  // Load universe and all themes when universeId changes
  useEffect(() => {
    const loadUniverseAndThemes = async () => {
      if (!universeId) return;
      
      try {
        const universe = await jsonLoader.loadUniverse(universeId);
        if (universe) {
          // Load all themes
          const themes: Theme[] = [];
          for (const themeId of universe.themes) {
            try {
              const themeObj = await jsonLoader.loadTheme(universeId, themeId);
              if (themeObj) {
                themes.push(themeObj);
              }
            } catch (error) {
              console.warn(`Failed to load theme ${themeId}:`, error);
            }
          }
          setAvailableThemes(themes);
          
          // Initialize filter theme if not set and theme prop is available
          if (theme && (!selectedFilterTheme || selectedFilterTheme !== theme.id)) {
            setSelectedFilterTheme(theme.id);
            setSelectedFilterThemeObj(theme);
          } else if (!selectedFilterTheme && themes.length > 0 && theme) {
            // Fallback: find theme in loaded themes
            const foundTheme = themes.find(t => t.id === theme.id);
            if (foundTheme) {
              setSelectedFilterTheme(foundTheme.id);
              setSelectedFilterThemeObj(foundTheme);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load universe:', error);
      }
    };
    
    loadUniverseAndThemes();
  }, [universeId, theme]);

  // Update available chapters when filter theme changes
  useEffect(() => {
    if (selectedFilterThemeObj) {
      const chapters = Object.keys(selectedFilterThemeObj.chapters);
      setAvailableChapters(chapters);
      
      // If current chapter is not in available chapters, clear it
      if (selectedFilterChapter && !chapters.includes(selectedFilterChapter)) {
        setSelectedFilterChapter('');
      }
    } else {
      setAvailableChapters([]);
    }
  }, [selectedFilterThemeObj, selectedFilterChapter]);

  // Update available chapters for move/copy when target theme changes
  useEffect(() => {
    if (moveTargetThemeObj) {
      const chapters = Object.keys(moveTargetThemeObj.chapters);
      setMoveAvailableChapters(chapters);
      
      // If current chapter is not in available chapters, clear it
      if (moveTargetChapter && !chapters.includes(moveTargetChapter)) {
        setMoveTargetChapter('');
      }
    } else {
      setMoveAvailableChapters([]);
    }
  }, [moveTargetThemeObj, moveTargetChapter]);

  // Load items based on filter selection
  useEffect(() => {
    const loadFilteredItems = async () => {
      if (!universeId) return;
      
      try {
        let items: Item[] = [];
        
        if (selectedFilterChapter && selectedFilterThemeObj) {
          // Load items from specific chapter
          items = await jsonLoader.loadChapter(universeId, selectedFilterTheme, selectedFilterChapter, false);
          console.log(`📚 Loaded ${items.length} items from chapter: ${selectedFilterChapter}`);
        } else if (selectedFilterThemeObj) {
          // Load all items from theme
          const chapterIds = Object.keys(selectedFilterThemeObj.chapters);
          items = await jsonLoader.loadAllThemeItems(universeId, selectedFilterTheme, chapterIds);
          console.log(`🎨 Loaded ${items.length} items from theme: ${selectedFilterTheme}`);
        } else {
          // Fallback to allItems prop
          items = allItems;
        }
        
        setFilteredItems(items);
      } catch (error) {
        console.error('Failed to load filtered items:', error);
        setFilteredItems(allItems);
      }
    };
    
    loadFilteredItems();
  }, [universeId, selectedFilterTheme, selectedFilterChapter, selectedFilterThemeObj, allItems]);

  // Initialize filter values when props change
  useEffect(() => {
    if (theme && theme.id !== selectedFilterTheme) {
      setSelectedFilterTheme(theme.id);
      setSelectedFilterThemeObj(theme);
    }
    if (chapterId && chapterId !== selectedFilterChapter) {
      setSelectedFilterChapter(chapterId);
    }
  }, [theme, chapterId]);

  // Load all tags from theme when universe/theme changes
  useEffect(() => {
    const loadThemeTags = async () => {
      if (!universeId || !theme) return;
      
      try {
        const chapterIds = Object.keys(theme.chapters);
        const allThemeItems = await jsonLoader.loadAllThemeItems(universeId, theme.id, chapterIds);
        
        // Extract all unique tags from all items
        const tagsSet = new Set<string>();
        allThemeItems.forEach(item => {
          if (item.meta.tags) {
            item.meta.tags.forEach(tag => {
              if (tag && tag.trim()) {
                tagsSet.add(tag.trim());
              }
            });
          }
        });
        
        const sortedTags = Array.from(tagsSet).sort();
        setAllThemeTags(sortedTags);
        console.log(`🏷️ Loaded ${sortedTags.length} unique tags from theme`);
      } catch (error) {
        console.error('Failed to load theme tags:', error);
      }
    };
    
    loadThemeTags();
  }, [universeId, theme]);

  // Filter related items by search (using filteredItems instead of allItems)
  const filteredRelatedItems = useMemo(() => {
    if (!relatedSearch) return filteredItems;
    const search = relatedSearch.toLowerCase();
    return filteredItems.filter(i => 
      i.id !== localItem?.id && (
        i.id.toLowerCase().includes(search) ||
        i.base.word?.toLowerCase().includes(search)
      )
    );
  }, [filteredItems, relatedSearch, localItem]);

  // Handle filter theme change
  const handleFilterThemeChange = async (themeId: string) => {
    if (!universeId) return;
    
    try {
      const themeObj = await jsonLoader.loadTheme(universeId, themeId);
      if (themeObj) {
        setSelectedFilterTheme(themeId);
        setSelectedFilterThemeObj(themeObj);
        // Clear chapter selection when theme changes
        setSelectedFilterChapter('');
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      showToast('Failed to load theme', 'error');
    }
  };

  // Handle filter chapter change
  const handleFilterChapterChange = (chapterId: string) => {
    setSelectedFilterChapter(chapterId);
  };

  // Get chapter title helper
  const getChapterTitle = (chapterId: string): string => {
    if (!selectedFilterThemeObj) return chapterId;
    const chapterConfig = selectedFilterThemeObj.chapters[chapterId];
    return chapterConfig?.title || chapterId;
  };

  // Get chapter title for move target (uses moveTargetThemeObj)
  const getMoveChapterTitle = (chapterId: string): string => {
    if (!moveTargetThemeObj) return chapterId;
    const chapterConfig = moveTargetThemeObj.chapters[chapterId];
    return chapterConfig?.title || chapterId;
  };

  // Filter tag suggestions based on input
  const filteredTagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return allThemeTags.slice(0, 10); // Show first 10 if no input
    
    const input = tagInput.toLowerCase().trim();
    const currentTags = localItem?.meta.tags || [];
    
    return allThemeTags
      .filter(tag => 
        tag.toLowerCase().includes(input) && 
        !currentTags.includes(tag)
      )
      .slice(0, 10);
  }, [tagInput, allThemeTags, localItem?.meta.tags]);

  // Handle tag input changes
  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    setShowTagSuggestions(true);
  };

  // Add tag from input or suggestion
  const handleAddTag = (tag: string) => {
    if (!localItem || !tag.trim()) return;
    
    const trimmedTag = tag.trim();
    const currentTags = localItem.meta.tags || [];
    
    if (currentTags.includes(trimmedTag)) return; // Already exists
    
    const newTags = [...currentTags, trimmedTag];
    handleFieldChange('meta.tags', newTags);
    setTagInput('');
    setShowTagSuggestions(false);
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    if (!localItem) return;
    
    const currentTags = localItem.meta.tags || [];
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    handleFieldChange('meta.tags', newTags);
  };

  // Handle tag input key events
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    } else if (e.key === 'ArrowDown' && filteredTagSuggestions.length > 0) {
      e.preventDefault();
      // Focus first suggestion (could be enhanced with keyboard navigation)
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tagInputRef.current && 
        !tagInputRef.current.contains(event.target as Node) &&
        tagSuggestionsRef.current &&
        !tagSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowTagSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!item || !localItem) return false;
    return JSON.stringify(item) !== JSON.stringify(localItem);
  }, [item, localItem]);

  // Save item to database
  const handleSave = async () => {
    if (!localItem || !universeId || !theme || !chapterId) {
      showToast('❌ Missing required information to save', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await jsonWriter.saveItem(universeId, theme.id, chapterId, localItem);
      
      if (result.success) {
        showToast(`✅ Item ${localItem.id} saved successfully!`, 'success');
        // Update the original item prop by calling onItemChange
        onItemChange(localItem);
        onBack();
      } else {
        showToast(`❌ Failed to save item: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      showToast(`❌ Error saving item: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle back button - save if there are changes
  const handleBack = async () => {
    if (hasUnsavedChanges) {
      await handleSave();
    } else {
      onBack();
    }
  };

  // Handle discard - go back without saving
  const handleDiscard = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('Are you sure you want to discard all unsaved changes?');
      if (confirmed) {
        // Reset to original item
        if (item) {
          setLocalItem(item);
        }
        onBack();
      }
    } else {
      onBack();
    }
  };

  // Handle move target theme change
  const handleMoveThemeChange = async (themeId: string) => {
    if (!universeId) return;
    
    try {
      const themeObj = await jsonLoader.loadTheme(universeId, themeId);
      if (themeObj) {
        setMoveTargetTheme(themeId);
        setMoveTargetThemeObj(themeObj);
        // Clear chapter selection when theme changes
        setMoveTargetChapter('');
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      showToast('Failed to load theme', 'error');
    }
  };

  // Handle move target chapter change
  const handleMoveChapterChange = (chapterId: string) => {
    setMoveTargetChapter(chapterId);
  };

  // Reset move/copy selections
  const handleCancelMove = () => {
    setMoveTargetTheme(theme?.id || '');
    setMoveTargetChapter(chapterId || '');
    setMoveTargetThemeObj(theme || null);
  };

  // Move item to different chapter
  const handleMoveItem = async () => {
    if (!localItem || !moveTargetChapter || !moveTargetThemeObj) {
      showToast('❌ Please select a target chapter', 'error');
      return;
    }

    // Check if already in target chapter
    if (chapterId === moveTargetChapter && theme?.id === moveTargetTheme) {
      showToast('⚠️ Item is already in this chapter', 'warning');
      return;
    }

    const confirmed = window.confirm(
      `Move item "${localItem.id}" to chapter "${getMoveChapterTitle(moveTargetChapter)}"?\n\n` +
      `This will update the item's chapter assignment.`
    );
    
    if (!confirmed) return;

    setMoveInProgress(true);
    try {
      const result = await supabaseLoader.moveRoundToChapter(localItem.id, moveTargetChapter);
      
      if (result.success) {
        const targetChapterTitle = getMoveChapterTitle(moveTargetChapter);
        showToast(
          `✅ Item moved successfully! You'll find it now in "${moveTargetThemeObj.name || moveTargetTheme}" → "${targetChapterTitle}"`,
          'success'
        );
        // Close detail view and return to table
        onBack();
      } else {
        showToast(`❌ Failed to move item: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error moving item:', error);
      showToast(`❌ Error moving item: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setMoveInProgress(false);
    }
  };

  // Copy item to different chapter
  const handleCopyItem = async () => {
    if (!localItem || !moveTargetChapter || !moveTargetThemeObj) {
      showToast('❌ Please select a target chapter', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Copy item "${localItem.id}" to chapter "${getMoveChapterTitle(moveTargetChapter)}"?\n\n` +
      `A new item with a new ID will be created in the target chapter.`
    );
    
    if (!confirmed) return;

    setMoveInProgress(true);
    try {
      const result = await supabaseLoader.copyRoundToChapter(localItem.id, moveTargetChapter);
      
      if (result.success && result.newRoundId) {
        const targetChapterTitle = getMoveChapterTitle(moveTargetChapter);
        showToast(
          `✅ Item copied successfully! New item "${result.newRoundId}" created in "${moveTargetThemeObj.name || moveTargetTheme}" → "${targetChapterTitle}"`,
          'success'
        );
        // Keep detail view open to continue editing original
      } else {
        showToast(`❌ Failed to copy item: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error copying item:', error);
      showToast(`❌ Error copying item: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setMoveInProgress(false);
    }
  };

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
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button 
          className="editor-button primary" 
          onClick={handleBack}
          disabled={saving}
        >
          {saving ? '💾 Saving...' : hasUnsavedChanges ? '💾 Save & Back' : '← Back to Table View'}
        </button>
        <button 
          className="editor-button" 
          onClick={() => setShowTextParserModal(true)}
          disabled={saving}
          title="Edit this item in text parser"
        >
          📝 Edit in Text Parser
        </button>
        {hasUnsavedChanges && (
          <button 
            className="editor-button" 
            onClick={handleDiscard}
            disabled={saving}
            style={{ opacity: 0.8 }}
          >
            Discard Changes
          </button>
        )}
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

      {/* MOVE/COPY ITEM SECTION */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        <div className="editor-detail-section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
          🔀 Move or Copy Item
        </div>
        <div style={{ 
          padding: '1rem', 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{ 
            fontSize: '0.9rem', 
            color: 'rgba(255, 255, 255, 0.7)', 
            marginBottom: '1rem' 
          }}>
            Current location: <strong>{theme?.name || theme?.id || '?'}</strong> → <strong>{getChapterTitle(chapterId || '')}</strong>
          </p>
          
          {universeId && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <SearchableDropdown
                  value={moveTargetTheme}
                  options={availableThemes.map(t => ({ value: t.id, label: t.name || t.id }))}
                  onChange={handleMoveThemeChange}
                  placeholder="Select Target Theme..."
                  searchPlaceholder="🔍 Search themes..."
                  label="Target Theme"
                />
              </div>
              {moveTargetThemeObj && (
                <div style={{ flex: 1 }}>
                  <SearchableDropdown
                    value={moveTargetChapter}
                    options={moveAvailableChapters.map(c => ({ 
                      value: c, 
                      label: getMoveChapterTitle(c)
                    }))}
                    onChange={handleMoveChapterChange}
                    placeholder="Select Target Chapter..."
                    searchPlaceholder="🔍 Search chapters..."
                    label="Target Chapter"
                  />
                </div>
              )}
            </div>
          )}

          {/* Show action buttons only if target chapter is selected AND different from current */}
          {moveTargetChapter && moveTargetThemeObj && (
            (moveTargetTheme !== theme?.id || moveTargetChapter !== chapterId) ? (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  className="editor-button"
                  onClick={handleCancelMove}
                  disabled={moveInProgress}
                  style={{ flex: '0 0 auto' }}
                >
                  ❌ Cancel
                </button>
                <button
                  className="editor-button primary"
                  onClick={handleMoveItem}
                  disabled={moveInProgress}
                  style={{ flex: 1 }}
                >
                  {moveInProgress ? '⏳ Moving...' : '🔀 Move Item'}
                </button>
                <button
                  className="editor-button"
                  onClick={handleCopyItem}
                  disabled={moveInProgress}
                  style={{ 
                    flex: 1,
                    background: 'rgba(76, 175, 80, 0.2)',
                    borderColor: 'rgba(76, 175, 80, 0.5)'
                  }}
                >
                  {moveInProgress ? '⏳ Copying...' : '📋 Copy Item'}
                </button>
              </div>
            ) : (
              <p style={{ 
                fontSize: '0.9rem', 
                color: 'rgba(255, 165, 0, 0.8)', 
                fontStyle: 'italic',
                marginTop: '1rem' 
              }}>
                ⚠️ Please select a different chapter to move or copy
              </p>
            )
          )}
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <textarea
                    className="editor-form-textarea"
                    value={correct.context || ''}
                    onChange={(e) => handleFieldChange(`correct[${index}].context`, e.target.value)}
                    placeholder="Context"
                    rows={2}
                    style={{ resize: 'none', minHeight: '50px', flex: 1 }}
                  />
                  <select
                    className="editor-form-select"
                    value={correct.level ?? 1}
                    onChange={(e) => handleFieldChange(`correct[${index}].level`, parseInt(e.target.value))}
                    style={{ flex: '0 0 80px' }}
                    title="Item Level"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                      <option key={level} value={level}>Lvl {level}</option>
                    ))}
                  </select>
                </div>
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <textarea
                    className="editor-form-textarea"
                    value={distractor.context || ''}
                    onChange={(e) => handleFieldChange(`distractors[${index}].context`, e.target.value)}
                    placeholder="Context"
                    rows={2}
                    style={{ resize: 'none', minHeight: '50px', flex: 1 }}
                  />
                  <select
                    className="editor-form-select"
                    value={distractor.level ?? 1}
                    onChange={(e) => handleFieldChange(`distractors[${index}].level`, parseInt(e.target.value))}
                    style={{ flex: '0 0 80px' }}
                    title="Item Level"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                      <option key={level} value={level}>Lvl {level}</option>
                    ))}
                  </select>
                </div>
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
        
        {/* Theme and Chapter Filter Dropdowns */}
        {universeId && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <SearchableDropdown
                value={selectedFilterTheme}
                options={availableThemes.map(t => ({ value: t.id, label: t.name || t.id }))}
                onChange={handleFilterThemeChange}
                placeholder="Select Theme..."
                searchPlaceholder="🔍 Search themes..."
                label="Filter by Theme"
              />
            </div>
            {selectedFilterThemeObj && (
              <div style={{ flex: 1 }}>
                <SearchableDropdown
                  value={selectedFilterChapter}
                  options={availableChapters.map(c => ({ 
                    value: c, 
                    label: getChapterTitle(c)
                  }))}
                  onChange={handleFilterChapterChange}
                  placeholder="All Chapters..."
                  searchPlaceholder="🔍 Search chapters..."
                  label="Filter by Chapter"
                />
              </div>
            )}
          </div>
        )}

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
          <div className="editor-form-group" style={{ position: 'relative' }}>
            <label className="editor-form-label">Tags</label>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.4rem', 
              padding: '0.4rem 0.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              minHeight: '40px',
              alignItems: 'center'
            }}>
              {/* Tag Pills */}
              {localItem.meta.tags && localItem.meta.tags.length > 0 && (
                <>
                  {localItem.meta.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '3px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.9)',
                      }}
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.5)',
                          cursor: 'pointer',
                          padding: '0',
                          fontSize: '1rem',
                          lineHeight: '1',
                          width: '16px',
                          height: '16px',
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                        }}
                        title="Remove tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </>
              )}
              {/* Tag Input */}
              <input
                ref={tagInputRef}
                type="text"
                className="editor-form-input"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onFocus={() => setShowTagSuggestions(true)}
                placeholder={localItem.meta.tags && localItem.meta.tags.length > 0 ? "Add tag..." : "Type to add tags..."}
                style={{
                  border: 'none',
                  background: 'transparent',
                  flex: 1,
                  minWidth: '120px',
                  outline: 'none',
                  color: 'white',
                  fontSize: '0.9rem',
                  padding: '0.2rem 0',
                }}
              />
            </div>
            {/* Autocomplete Suggestions */}
            {showTagSuggestions && filteredTagSuggestions.length > 0 && (
              <div
                ref={tagSuggestionsRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.2rem',
                  background: 'rgba(15, 15, 20, 0.98)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  padding: '0.25rem',
                  zIndex: 1000,
                  maxHeight: '180px',
                  overflowY: 'auto',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {filteredTagSuggestions.map((tag) => (
                  <div
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    style={{
                      padding: '0.4rem 0.6rem',
                      cursor: 'pointer',
                      borderRadius: '3px',
                      fontSize: '0.875rem',
                      transition: 'background 0.15s',
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}
            {tagInput.trim() && !allThemeTags.some(t => t.toLowerCase() === tagInput.toLowerCase().trim()) && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', opacity: 0.6, color: 'rgba(255, 255, 255, 0.6)' }}>
                Press Enter to add "{tagInput.trim()}" as new tag
              </div>
            )}
          </div>
        </div>
        <div className="editor-form-row" style={{ marginTop: '1rem' }}>
          <div className="editor-form-group" style={{ flex: 1 }}>
            <label className="editor-form-label">Detail</label>
            <textarea
              className="editor-form-textarea"
              value={localItem.meta.detail || ''}
              onChange={(e) => handleFieldChange('meta.detail', e.target.value)}
              placeholder="Additional detail information"
              rows={4}
              style={{ 
                resize: 'vertical', 
                minHeight: '100px',
                fontSize: '0.95rem',
              }}
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
      
      {/* Text Parser Modal */}
      {chapterId && localItem && (
        <TextParserModal
          isOpen={showTextParserModal}
          onClose={() => setShowTextParserModal(false)}
          onSave={(parsedDataArray) => {
            if (parsedDataArray.length === 0) return;
            const parsedData = parsedDataArray[0]; // Only use first item
            
            // Apply changes from parsed data to localItem
            const updatedItem: Item = {
              ...localItem,
              level: parsedData.level,
              base: {
                ...localItem.base,
                context: parsedData.baseContext
              },
              correct: parsedData.corrects.map((c, idx) => {
                const existing = localItem.correct[idx];
                return existing ? {
                  ...existing,
                  context: c.context,
                  collectionOrder: c.order,
                  level: c.level
                } : existing;
              }).filter(Boolean) as CorrectEntry[],
              distractors: parsedData.distractors.map((d, idx) => {
                const existing = localItem.distractors[idx];
                return existing ? {
                  ...existing,
                  redirect: d.redirect,
                  context: d.context,
                  level: d.level
                } : existing;
              }).filter(Boolean) as DistractorEntry[],
              meta: {
                ...localItem.meta,
                source: parsedData.source ?? localItem.meta.source,
                detail: parsedData.detail ?? localItem.meta.detail,
                tags: parsedData.tags ?? localItem.meta.tags
              }
            };
            
            setLocalItem(updatedItem);
            setShowTextParserModal(false);
            showToast('✅ Changes applied from text parser', 'success', 2000);
          }}
          chapterId={chapterId}
          initialItem={localItem}
          initialChapterId={chapterId}
        />
      )}
    </div>
  );
}

