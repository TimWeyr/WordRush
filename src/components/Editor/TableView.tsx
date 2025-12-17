import React, { useState, useMemo } from 'react';
import type { Item } from '@/types/content.types';
import { jsonWriter } from '@/infra/utils/JSONWriter';
import { useToast } from '../Toast/ToastContainer';
import { SplitDropdownButton } from './SplitDropdownButton';
import { TextParserModal, type ParsedItemData } from './TextParserModal';

interface TableViewProps {
  items: Item[];
  onItemsChange: (items: Item[]) => void;
  onItemSelect: (itemId: string) => void;
  chapterId?: string;
  themeId?: string;
  universeId?: string;
}

const MAX_CONTEXT_LENGTH = 60;

export function TableView({ items, onItemsChange, onItemSelect, chapterId, themeId, universeId }: TableViewProps) {
  const { showToast, showConfirm } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'level' | 'word'>('id');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [showTextParserModal, setShowTextParserModal] = useState(false);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = items;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = items.filter(item => 
        item.id.toLowerCase().includes(query) ||
        item.base.word?.toLowerCase().includes(query) ||
        item.base.context?.toLowerCase().includes(query) ||
        item.correct.some(c => c.entry.word?.toLowerCase().includes(query) || c.context.toLowerCase().includes(query)) ||
        item.distractors.some(d => d.entry.word?.toLowerCase().includes(query) || d.context.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'id':
          return a.id.localeCompare(b.id);
        case 'level':
          return a.level - b.level || a.id.localeCompare(b.id);
        case 'word':
          return (a.base.word || '').localeCompare(b.base.word || '') || a.id.localeCompare(b.id);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [items, searchQuery, sortBy]);

  const handleCellChange = (itemId: string, path: string, value: any) => {
    const updatedItems = items.map(item => {
      if (item.id !== itemId) return item;

      const newItem = { ...item };
      const parts = path.split('.');

      // Navigate to the correct property and update it
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

      return newItem;
    });

    onItemsChange(updatedItems);
  };

  const handleToggleSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleBulkLevelChange = (delta: number) => {
    if (selectedItems.size === 0) return;

    const updatedItems = items.map(item => {
      if (!selectedItems.has(item.id)) return item;
      return {
        ...item,
        level: Math.max(1, Math.min(10, item.level + delta)),
      };
    });

    onItemsChange(updatedItems);
    setSelectedItems(new Set());
  };

  const handleBulkPublishToggle = () => {
    if (selectedItems.size === 0) return;

    const updatedItems = items.map(item => {
      if (!selectedItems.has(item.id)) return item;
      return {
        ...item,
        published: item.published === false ? true : false,
      };
    });

    onItemsChange(updatedItems);
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedItems.size} item(s)?`
    );

    if (confirmed) {
      const updatedItems = items.filter(item => !selectedItems.has(item.id));
      onItemsChange(updatedItems);
      setSelectedItems(new Set());
    }
  };

  // 💾 Save single item
  const handleSaveItem = async (item: Item) => {
    if (!universeId || !themeId || !chapterId) {
      showToast('❌ Missing universe/theme/chapter ID', 'error');
      return;
    }

    setSavingItems(prev => new Set(prev).add(item.id));
    
    try {
      console.log(`💾 [TableView] Saving item ${item.id}...`);
      console.log(`   Current items in state BEFORE save:`, items.map(i => i.id));
      
      const result = await jsonWriter.saveItem(universeId, themeId, chapterId, item);
      
      if (result.success) {
        console.log(`✅ [TableView] Item ${item.id} saved successfully`);
        console.log(`   Current items in state AFTER save:`, items.map(i => i.id));
        showToast(`💾 Item ${item.id} saved!`, 'success', 2000);
      } else {
        console.error(`❌ [TableView] Failed to save ${item.id}:`, result.error);
        showToast(`❌ Failed to save ${item.id}: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error(`❌ [TableView] Exception saving ${item.id}:`, error);
      showToast(`❌ Error saving ${item.id}`, 'error');
    } finally {
      setSavingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // 🗑️ Delete single item
  const handleDeleteItem = async (item: Item) => {
    showConfirm(
      `Delete item ${item.id}?\n\nThis will permanently delete:\n• Base: ${item.base.word || '(no word)'}\n• ${item.correct.length} correct entries\n• ${item.distractors.length} distractors`,
      async () => {
        setDeletingItems(prev => new Set(prev).add(item.id));
        
        try {
          const result = await jsonWriter.deleteItem(item.id);
          
          if (result.success) {
            // Remove from local state
            const updatedItems = items.filter(i => i.id !== item.id);
            onItemsChange(updatedItems);
            showToast(`🗑️ Item ${item.id} deleted`, 'success', 2000);
          } else {
            showToast(`❌ Failed to delete ${item.id}: ${result.error}`, 'error');
          }
        } catch (error) {
          showToast(`❌ Error deleting ${item.id}`, 'error');
          console.error('Delete error:', error);
        } finally {
          setDeletingItems(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }
      },
      'Delete',
      'Cancel'
    );
  };

  const handleAddNewItem = () => {
    if (!chapterId || !themeId) {
      alert('Cannot create new item: Chapter or Theme not selected');
      return;
    }

    // Generate new ID
    const maxId = items.reduce((max, item) => {
      const match = item.id.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0]);
        return Math.max(max, num);
      }
      return max;
    }, 0);

    const newId = `${chapterId.substring(0, 3).toUpperCase()}_${String(maxId + 1).padStart(3, '0')}`;

    // Helper: Generate random color
    const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    
    // Helper: Random variant
    const variants = ['hexagon', 'star', 'bubble', 'spike', 'square', 'diamond'] as const;
    const randomVariant = () => variants[Math.floor(Math.random() * variants.length)];
    
    // Helper: Random spawn position (0.1 to 0.9)
    const randomSpawn = () => 0.1 + Math.random() * 0.8;

    const newItem: Item = {
      id: newId,
      theme: themeId,
      chapter: chapterId,
      level: 1,
      published: false,
      base: {
        word: '',
        type: 'word',
        visual: {
          color: randomColor(),
          variant: randomVariant(),
          fontSize: 0.9 + Math.random() * 0.3, // 0.9 to 1.2
        },
      },
      correct: [{
        entry: {
          word: '',
          type: 'word',
        },
        spawnPosition: randomSpawn(),
        spawnSpread: 0.05 + Math.random() * 0.05, // 0.05 to 0.1
        speed: 0.9 + Math.random() * 0.2, // 0.9 to 1.1
        points: 10,
        pattern: 'single',
        context: '',
        visual: {
          color: randomColor(),
          variant: randomVariant(),
          fontSize: 0.9 + Math.random() * 0.3,
        },
      }],
      distractors: [{
        entry: {
          word: '',
          type: 'word',
        },
        spawnPosition: randomSpawn(),
        spawnSpread: 0.05 + Math.random() * 0.05,
        speed: 1.1 + Math.random() * 0.3, // 1.1 to 1.4
        points: 10,
        damage: 1,
        redirect: '',
        context: '',
        visual: {
          color: randomColor(),
          variant: randomVariant(),
          fontSize: 0.9 + Math.random() * 0.3,
        },
      }],
      meta: {
        source: '',
        tags: [],
        related: [],
        difficultyScaling: {
          speedMultiplierPerReplay: 0.1,
          colorContrastFade: false,
        },
      },
    };

    const updatedItems = [...items, newItem];
    onItemsChange(updatedItems);
    
    // Stay in table view and scroll to new item
    setTimeout(() => {
      const newItemElement = document.querySelector(`[data-item-id="${newId}"]`);
      if (newItemElement) {
        newItemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    showToast(`✅ New item ${newId} created with randomized configs`, 'success', 3000);
  };

  const handleSaveParsedItem = async (parsedDataArray: ParsedItemData[]) => {
    if (!chapterId || !themeId) {
      showToast('Cannot create items: Chapter or Theme not selected', 'error');
      return;
    }

    const newItems: Item[] = [];
    let currentMaxId = items.reduce((max, item) => {
      const match = item.id.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0]);
        return Math.max(max, num);
      }
      return max;
    }, 0);

    const prefix = chapterId.substring(0, 3).toUpperCase();
    
    // Helper functions for randomization (same as handleAddNewItem)
    const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    const variants = ['hexagon', 'star', 'bubble', 'spike', 'square', 'diamond'] as const;
    const randomVariant = () => variants[Math.floor(Math.random() * variants.length)];
    const randomSpawn = () => 0.1 + Math.random() * 0.8;

    // Erstelle alle Items
    for (const parsedData of parsedDataArray) {
      currentMaxId++;
      const newId = `${prefix}_${String(currentMaxId).padStart(3, '0')}`;

      const correctEntries = parsedData.corrects.map((c) => ({
        entry: {
          word: c.word,
          type: 'word' as const,
        },
        spawnPosition: randomSpawn(),
        spawnSpread: 0.05 + Math.random() * 0.05,
        speed: 0.9 + Math.random() * 0.2,
        points: 10,
        pattern: 'single' as const,
        context: c.context,
        visual: {
          color: randomColor(),
          variant: randomVariant(),
          fontSize: 0.9 + Math.random() * 0.3,
        },
        collectionOrder: c.order,
      }));

      const distractors = parsedData.distractors.map((d) => ({
        entry: {
          word: d.word,
          type: 'word' as const,
        },
        spawnPosition: randomSpawn(),
        spawnSpread: 0.05 + Math.random() * 0.05,
        speed: 1.1 + Math.random() * 0.3,
        points: -10,
        damage: 1,
        redirect: d.redirect,
        context: d.context,
        visual: {
          color: randomColor(),
          variant: randomVariant(),
          fontSize: 0.9 + Math.random() * 0.3,
        },
      }));

      const newItem: Item = {
        id: newId,
        theme: themeId,
        chapter: chapterId,
        level: parsedData.level,
        published: false,
        base: {
          word: parsedData.base,
          type: 'word',
          context: parsedData.baseContext, // Optional context from text parser
          visual: {
            color: randomColor(),
            variant: randomVariant(),
            fontSize: 0.9 + Math.random() * 0.3,
          },
        },
        correct: correctEntries,
        distractors: distractors,
        meta: {
          source: parsedData.source || '',
          detail: parsedData.detail,
          tags: [],
          related: [],
          difficultyScaling: {
            speedMultiplierPerReplay: 0.1,
            colorContrastFade: false,
          },
        },
      };

      newItems.push(newItem);
    }

    // Alle Items zur Liste hinzufügen
    const updatedItems = [...items, ...newItems];
    onItemsChange(updatedItems);

    // Alle Items in DB speichern
    const savePromises = newItems.map(item => 
      jsonWriter.saveItem(universeId || '', themeId, chapterId, item)
    );
    
    try {
      setSavingItems(prev => {
        const next = new Set(prev);
        newItems.forEach(item => next.add(item.id));
        return next;
      });
      
      const results = await Promise.all(savePromises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length === 0) {
        showToast(`✅ ${newItems.length} item${newItems.length > 1 ? 's' : ''} created and saved successfully!`, 'success', 3000);
        setShowTextParserModal(false);
        
        // Scroll zum letzten neuen Item
        setTimeout(() => {
          const lastItemId = newItems[newItems.length - 1].id;
          const lastItemElement = document.querySelector(`[data-item-id="${lastItemId}"]`);
          if (lastItemElement) {
            lastItemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        showToast(`⚠️ ${failed.length} of ${newItems.length} item${newItems.length > 1 ? 's' : ''} failed to save`, 'error');
      }
    } catch (error) {
      console.error('Failed to save parsed items:', error);
      showToast(`❌ Failed to save items: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setSavingItems(prev => {
        const next = new Set(prev);
        newItems.forEach(item => next.delete(item.id));
        return next;
      });
    }
  };

  const handleQuickClone = (item: Item) => {
    // Generate new ID
    const maxId = items.reduce((max, i) => {
      const match = i.id.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0]);
        return Math.max(max, num);
      }
      return max;
    }, 0);

    const newId = `${item.chapter.substring(0, 3).toUpperCase()}_${String(maxId + 1).padStart(3, '0')}`;

    // Clone item with randomized spawn configs
    const clonedItem: Item = {
      ...item,
      id: newId,
      published: false,
      correct: item.correct.map(c => ({
        ...c,
        spawnPosition: 0.2 + Math.random() * 0.6,
        spawnSpread: 0.03 + Math.random() * 0.07,
        speed: 0.8 + Math.random() * 0.5,
      })),
      distractors: item.distractors.map(d => ({
        ...d,
        spawnPosition: 0.2 + Math.random() * 0.6,
        spawnSpread: 0.03 + Math.random() * 0.07,
        speed: 1.0 + Math.random() * 0.6,
      })),
    };

    const updatedItems = [...items, clonedItem];
    onItemsChange(updatedItems);
    onItemSelect(newId); // Jump to detail view
  };

  const handleAddCorrectEntry = (itemId: string) => {
    const updatedItems = items.map(item => {
      if (item.id !== itemId) return item;

      const newCorrect = {
        entry: {
          word: '',
          type: 'word' as const,
        },
        spawnPosition: 0.5,
        spawnSpread: 0.05,
        speed: 1.0,
        points: 10,
        pattern: 'single' as const,
        context: '',
        visual: {
          color: '#4CAF50',
          variant: 'hexagon' as const,
          fontSize: 1.0,
        },
      };

      return {
        ...item,
        correct: [...item.correct, newCorrect],
      };
    });

    onItemsChange(updatedItems);
  };

  const handleAddDistractorEntry = (itemId: string) => {
    const updatedItems = items.map(item => {
      if (item.id !== itemId) return item;

      const newDistractor = {
        entry: {
          word: '',
          type: 'word' as const,
        },
        spawnPosition: 0.5,
        spawnSpread: 0.05,
        speed: 1.2,
        points: -10,
        damage: 1,
        redirect: '',
        context: '',
        visual: {
          color: '#f44336',
          variant: 'spike' as const,
          fontSize: 1.0,
        },
      };

      return {
        ...item,
        distractors: [...item.distractors, newDistractor],
      };
    });

    onItemsChange(updatedItems);
  };

  const renderTextInput = (
    item: Item,
    path: string,
    value: string,
    maxLength: number = MAX_CONTEXT_LENGTH
  ) => {
    const isWarning = value.length > maxLength;
    return (
      <div className="editor-table-cell">
        <input
          type="text"
          className={`editor-table-input ${isWarning ? 'warning' : ''}`}
          value={value}
          onChange={(e) => handleCellChange(item.id, path, e.target.value)}
        />
        {value.length > 0 && (
          <span className={`editor-char-counter ${isWarning ? 'warning' : ''}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="editor-table-container">
      <div className="editor-table-header">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            className="editor-table-search"
            placeholder="🔍 Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <select
            className="editor-table-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'id' | 'level' | 'word')}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="id">Sort by ID</option>
            <option value="level">Sort by Level</option>
            <option value="word">Sort by Word</option>
          </select>
        </div>

        <div className="editor-table-actions">
          {selectedItems.size > 0 && (
            <>
              <button className="editor-button small" onClick={() => handleBulkLevelChange(-1)}>
                Level -1
              </button>
              <button className="editor-button small" onClick={() => handleBulkLevelChange(1)}>
                Level +1
              </button>
              <button className="editor-button small" onClick={handleBulkPublishToggle}>
                Toggle Published
              </button>
              <button className="editor-button small danger" onClick={handleBulkDelete}>
                Delete ({selectedItems.size})
              </button>
            </>
          )}
          <SplitDropdownButton
            mainLabel="+ New Item"
            mainAction={handleAddNewItem}
            options={[
              {
                label: 'Text Parser',
                icon: '📝',
                action: () => setShowTextParserModal(true),
              },
            ]}
            className="small primary"
          />
        </div>
      </div>

      {/* Text Parser Modal */}
      {chapterId && (
        <TextParserModal
          isOpen={showTextParserModal}
          onClose={() => setShowTextParserModal(false)}
          onSave={handleSaveParsedItem}
          chapterId={chapterId}
        />
      )}

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table className="editor-table editor-table-3line" style={{ minWidth: 'max(100%, 1800px)' }}>
          <thead>
            <tr>
              {/* Actions first! */}
              <th rowSpan={3} style={{ width: '90px', borderRight: '2px solid rgba(255, 255, 255, 0.2)' }}>Actions</th>
              
              {/* Checkbox */}
              <th rowSpan={3} style={{ 
                width: '30px', 
                padding: '0.5rem 0.3rem',
                background: 'rgba(33, 150, 243, 0.08)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                verticalAlign: 'top'
              }}>
                <input
                  type="checkbox"
                  checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                  onChange={handleSelectAll}
                  style={{ 
                    width: '18px', 
                    height: '18px',
                    cursor: 'pointer'
                  }}
                  title="Select all"
                />
              </th>
              
              {/* Combined ID / Level / Published */}
              <th rowSpan={3} style={{ 
                width: '110px', 
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                background: 'rgba(33, 150, 243, 0.05)',
                borderRight: '2px solid rgba(255, 255, 255, 0.15)',
                verticalAlign: 'top',
                padding: '0.5rem 0.3rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center' }}>
                  <div>🏷️ ID</div>
                  <div>📊 Level</div>
                  <div>✓ Pub</div>
                </div>
              </th>
              
              <th colSpan={6} style={{ background: 'rgba(100, 100, 255, 0.12)', borderBottom: '2px solid rgba(255, 255, 255, 0.2)' }}>
                🎯 Base
              </th>
            </tr>
            <tr>
              <th style={{ width: '35px' }} title="Color">🎨</th>
              <th style={{ minWidth: '200px', flex: '1 1 300px' }}>Word</th>
              <th style={{ minWidth: '200px', flex: '1 1 300px' }}>Context</th>
              <th style={{ width: '30px' }} title="Variant">✦</th>
              <th style={{ width: '30px' }} title="Font Size">A</th>
              <th style={{ width: '30px' }} title="Glow">✨</th>
              <th style={{ width: '30px' }} title="Pulsate">💓</th>
            </tr>
            <tr>
              <th colSpan={6} style={{ background: 'rgba(76, 175, 80, 0.15)', padding: '0.3rem', fontSize: '0.8rem' }}>
                ✅ Correct Entries
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, itemIndex) => (
              <React.Fragment key={item.id}>
                {/* Spacing row between rounds */}
                {itemIndex > 0 && (
                  <tr style={{ height: '12px', background: 'transparent' }}>
                    <td colSpan={100} style={{ padding: 0, border: 'none', background: 'transparent' }}></td>
                  </tr>
                )}
                
                {/* Line 1: Base Entry Row */}
                <tr key={`${item.id}-base`} className="editor-table-3line-row" data-item-id={item.id}>
                  {/* Actions Column - FIRST! */}
                  <td rowSpan={3} style={{ verticalAlign: 'middle', borderRight: '2px solid rgba(255,255,255,0.2)', padding: '0.3rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <button
                        className="editor-button small"
                        onClick={() => handleSaveItem(item)}
                        disabled={savingItems.has(item.id)}
                        style={{ 
                          padding: '0.3rem 0.4rem', 
                          fontSize: '0.7rem',
                          width: '100%',
                          background: savingItems.has(item.id) ? 'rgba(100, 100, 100, 0.5)' : 'rgba(33, 150, 243, 0.3)',
                          cursor: savingItems.has(item.id) ? 'not-allowed' : 'pointer'
                        }}
                        title="Save this item to database"
                      >
                        {savingItems.has(item.id) ? '⏳' : '💾'}
                      </button>
                      <button
                        className="editor-button small danger"
                        onClick={() => handleDeleteItem(item)}
                        disabled={deletingItems.has(item.id)}
                        style={{ 
                          padding: '0.3rem 0.4rem', 
                          fontSize: '0.7rem',
                          width: '100%',
                          cursor: deletingItems.has(item.id) ? 'not-allowed' : 'pointer'
                        }}
                        title="Delete this item from database"
                      >
                        {deletingItems.has(item.id) ? '⏳' : '🗑️'}
                      </button>
                      <button
                        className="editor-button small primary"
                        onClick={() => onItemSelect(item.id)}
                        style={{ padding: '0.3rem 0.4rem', fontSize: '0.7rem', width: '100%' }}
                        title="Edit item in detail view"
                      >
                        ✏️
                      </button>
                      <button
                        className="editor-button small"
                        onClick={() => handleQuickClone(item)}
                        style={{ padding: '0.3rem 0.4rem', fontSize: '0.7rem', width: '100%' }}
                        title="Clone with random spawn"
                      >
                        📋
                      </button>
                    </div>
                  </td>
                  
                  {/* Checkbox */}
                  <td rowSpan={3} style={{ 
                    verticalAlign: 'middle', 
                    borderRight: '1px solid rgba(255,255,255,0.1)', 
                    padding: '0.5rem 0.3rem',
                    background: 'rgba(33, 150, 243, 0.03)',
                    textAlign: 'center'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                      style={{ 
                        width: '18px', 
                        height: '18px',
                        cursor: 'pointer'
                      }}
                      title={`Select ${item.id}`}
                    />
                  </td>
                  
                  {/* Combined ID / Level / Published */}
                  <td rowSpan={3} style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.7rem', 
                    verticalAlign: 'middle', 
                    borderRight: '2px solid rgba(255,255,255,0.15)', 
                    padding: '0.4rem 0.3rem',
                    background: 'rgba(33, 150, 243, 0.02)',
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                      <div style={{ fontWeight: 500, fontSize: '0.75rem' }}>{item.id}</div>
                      <select
                        className="editor-table-input"
                        value={item.level}
                        onChange={(e) => handleCellChange(item.id, 'level', parseInt(e.target.value))}
                        style={{ 
                          padding: '0.2rem', 
                          width: '50px', 
                          fontSize: '0.7rem',
                          textAlign: 'center',
                          fontWeight: 600
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                          <option key={level} value={level}> {level}</option>
                        ))}
                      </select>
                      <input
                        type="checkbox"
                        checked={item.published !== false}
                        onChange={(e) => handleCellChange(item.id, 'published', e.target.checked)}
                        style={{ 
                          width: '16px', 
                          height: '16px',
                          cursor: 'pointer'
                        }}
                        title={item.published !== false ? 'Published' : 'Unpublished'}
                      />
                    </div>
                  </td>
                  <td style={{ background: 'rgba(100, 100, 255, 0.08)', textAlign: 'center', padding: '0.3rem' }}>
                    <input
                      type="color"
                      value={item.base.visual.color}
                      onChange={(e) => handleCellChange(item.id, 'base.visual.color', e.target.value)}
                      style={{ 
                        width: '28px', 
                        height: '28px', 
                        border: '2px solid rgba(255,255,255,0.3)', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={item.base.visual.color}
                    />
                  </td>
                  <td style={{ background: 'rgba(100, 100, 255, 0.08)' }}>
                    {renderTextInput(item, 'base.word', item.base.word || '', 40)}
                  </td>
                  <td style={{ background: 'rgba(100, 100, 255, 0.08)' }}>
                    {renderTextInput(item, 'base.context', item.base.context || '', 40)}
                  </td>
                  <td style={{ background: 'rgba(100, 100, 255, 0.08)', textAlign: 'center', fontSize: '0.85rem', padding: '0.3rem' }}>
                    {item.base.visual.variant === 'hexagon' && '⬡'}
                    {item.base.visual.variant === 'star' && '★'}
                    {item.base.visual.variant === 'bubble' && '○'}
                    {item.base.visual.variant === 'spike' && '✦'}
                    {item.base.visual.variant === 'square' && '■'}
                    {item.base.visual.variant === 'diamond' && '◆'}
                  </td>
                  <td style={{ background: 'rgba(100, 100, 255, 0.08)', textAlign: 'center', fontSize: '0.7rem', padding: '0.3rem' }}>
                    {(item.base.visual.fontSize || 1.0).toFixed(1)}
                  </td>
                  <td style={{ background: 'rgba(100, 100, 255, 0.08)', textAlign: 'center', padding: '0.3rem' }}>
                    {(item.base.visual as any).glow ? '✨' : ''}
                  </td>
                  <td style={{ background: 'rgba(100, 100, 255, 0.08)', textAlign: 'center', padding: '0.3rem' }}>
                    {item.base.visual.pulsate ? '💓' : ''}
                  </td>
                </tr>

                {/* Line 2: Correct Entries Row */}
                <tr key={`${item.id}-correct`} className="editor-table-3line-row" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td colSpan={9} style={{ background: 'rgba(76, 175, 80, 0.15)', padding: '0.5rem' }}>
                    <div className="editor-entry-container">
                      {item.correct.map((correct, index) => (
                        <div key={index} className="editor-entry-item">
                          <input
                            type="color"
                            value={correct.visual.color}
                            onChange={(e) => handleCellChange(item.id, `correct[${index}].visual.color`, e.target.value)}
                            style={{ 
                              width: '24px', 
                              height: '24px', 
                              border: '2px solid rgba(76, 175, 80, 0.5)', 
                              borderRadius: '4px',
                              cursor: 'pointer',
                              padding: 0,
                              flexShrink: 0
                            }}
                            title={correct.visual.color}
                          />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, flexShrink: 0 }}>
                            #{index + 1}
                          </span>
                          {renderTextInput(item, `correct[${index}].entry.word`, correct.entry.word || '', 25)}
                          <span style={{ fontSize: '0.7rem', opacity: 0.5, flexShrink: 0 }}>→</span>
                          {renderTextInput(item, `correct[${index}].context`, correct.context || '', 50)}
                        </div>
                      ))}
                      <button
                        className="editor-button small"
                        onClick={() => handleAddCorrectEntry(item.id)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', flexShrink: 0 }}
                        title="Add correct entry"
                      >
                        + ✅
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Line 3: Distractor Entries Row */}
                <tr key={`${item.id}-distractor`} className="editor-table-3line-row" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '2px solid rgba(255, 255, 255, 0.15)' }}>
                  <td colSpan={9} style={{ background: 'rgba(244, 67, 54, 0.12)', padding: '0.5rem' }}>
                    <div className="editor-entry-container">
                      {item.distractors.map((distractor, index) => (
                        <div key={index} className="editor-entry-item">
                          <input
                            type="color"
                            value={distractor.visual.color}
                            onChange={(e) => handleCellChange(item.id, `distractors[${index}].visual.color`, e.target.value)}
                            style={{ 
                              width: '24px', 
                              height: '24px', 
                              border: '2px solid rgba(244, 67, 54, 0.5)', 
                              borderRadius: '4px',
                              cursor: 'pointer',
                              padding: 0,
                              flexShrink: 0
                            }}
                            title={distractor.visual.color}
                          />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, flexShrink: 0 }}>
                            #{index + 1}
                          </span>
                          {renderTextInput(item, `distractors[${index}].entry.word`, distractor.entry.word || '', 25)}
                          <span style={{ fontSize: '0.7rem', opacity: 0.5, flexShrink: 0 }}>↪</span>
                          {renderTextInput(item, `distractors[${index}].redirect`, distractor.redirect || '', 20)}
                          <span style={{ fontSize: '0.7rem', opacity: 0.5, flexShrink: 0 }}>→</span>
                          {renderTextInput(item, `distractors[${index}].context`, distractor.context || '', 50)}
                        </div>
                      ))}
                      <button
                        className="editor-button small"
                        onClick={() => handleAddDistractorEntry(item.id)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', flexShrink: 0 }}
                        title="Add distractor entry"
                      >
                        + ❌
                      </button>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filteredItems.length === 0 && (
        <div style={{ 
          padding: '4rem', 
          textAlign: 'center', 
          color: 'rgba(255, 255, 255, 0.5)' 
        }}>
          {searchQuery ? 'No items match your search.' : 'No items in this chapter yet.'}
        </div>
      )}
    </div>
  );
}

