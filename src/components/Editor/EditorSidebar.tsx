import { useState, useMemo, useEffect } from 'react';
import type { Universe, Theme, Item } from '@/types/content.types';
import { AddNewDialog } from './AddNewDialog';
import { useToast } from '../Toast/ToastContainer';
import { SearchableDropdown } from './SearchableDropdown';
import { jsonLoader } from '@/infra/utils/JSONLoader';

type SearchScope = 'chapter' | 'theme' | 'universe';

interface EditorSidebarProps {
  universes: Universe[];
  selectedUniverse: Universe | null;
  selectedTheme: Theme | null;
  selectedChapter: string;
  items: Item[];
  onUniverseChange: (universeId: string) => void;
  onThemeChange: (themeId: string) => void;
  onChapterChange: (chapterId: string) => void;
  onItemSelect: (itemId: string) => void;
  onCreateUniverse: (data: any) => void;
  onCreateTheme: (data: any) => void;
  onCreateChapter: (data: any) => void;
  onLoadAllThemeItems?: (themeItems: Item[]) => void; // Callback to load all theme items into TableView
}

export function EditorSidebar({
  universes,
  selectedUniverse,
  selectedTheme,
  selectedChapter,
  items,
  onUniverseChange,
  onThemeChange,
  onChapterChange,
  onItemSelect,
  onCreateUniverse,
  onCreateTheme,
  onCreateChapter,
  onLoadAllThemeItems,
}: EditorSidebarProps) {
  const { showToast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState<'universe' | 'theme' | 'chapter' | null>(null);
  
  // New state for search scope
  // Default to 'theme' if theme is selected but no chapter, otherwise 'chapter'
  const [searchScope, setSearchScope] = useState<SearchScope>('theme');
  const [scopedItems, setScopedItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Auto-load all theme items when checkbox is enabled
  const [autoLoadThemeItems, setAutoLoadThemeItems] = useState(false);

  // Get themes from selected universe
  const themes = useMemo(() => {
    return selectedUniverse?.themes || [];
  }, [selectedUniverse]);

  // Get chapters from selected theme
  const chapters = useMemo(() => {
    if (!selectedTheme) return [];
    return Object.keys(selectedTheme.chapters);
  }, [selectedTheme]);

  // Auto-load theme items when checkbox is enabled and theme changes
  useEffect(() => {
    const loadAllThemeItems = async () => {
      if (!autoLoadThemeItems || !selectedTheme || !selectedUniverse || !onLoadAllThemeItems) {
        return;
      }

      // Switch to theme scope
      setSearchScope('theme');

      // Load all items from all chapters in theme
      setLoadingItems(true);
      try {
        const allItems: Item[] = [];
        const chapterIds = Object.keys(selectedTheme.chapters);
        
        for (const chapterId of chapterIds) {
          const chapterItems = await jsonLoader.loadChapter(
            selectedUniverse.id,
            selectedTheme.id,
            chapterId,
            false // Don't filter published in editor
          );
          allItems.push(...chapterItems);
        }

        // Filter out items with null/undefined chapter or theme
        const validItems = allItems.filter(item => item.chapter && item.theme);
        
        // Pass to parent to load into TableView
        onLoadAllThemeItems(validItems);
        
        showToast(`✅ Loaded ${validItems.length} items from theme into table`, 'success', 2000);
      } catch (error) {
        console.error('Failed to load all theme items:', error);
        showToast(`❌ Failed to load theme items`, 'error', 3000);
      } finally {
        setLoadingItems(false);
      }
    };

    loadAllThemeItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadThemeItems, selectedTheme?.id, selectedUniverse?.id]);

  // Load items based on search scope
  useEffect(() => {
    const loadScopedItems = async () => {
      if (searchScope === 'chapter') {
        // Use current chapter items (no loading needed)
        // Filter out items with null/undefined chapter or theme
        const validItems = items.filter(item => item.chapter && item.theme);
        setScopedItems(validItems);
        
        const invalidCount = items.length - validItems.length;
        if (invalidCount > 0) {
          console.warn(`⚠️ Filtered out ${invalidCount} items with missing chapter/theme`);
        }
        return;
      }

      if (!selectedUniverse) {
        setScopedItems([]);
        return;
      }

      setLoadingItems(true);
      try {
        let allItems: Item[] = [];

        if (searchScope === 'theme' && selectedTheme) {
          // Load all chapters in current theme
          const chapterIds = Object.keys(selectedTheme.chapters);
          for (const chapterId of chapterIds) {
            const chapterItems = await jsonLoader.loadChapter(
              selectedUniverse.id,
              selectedTheme.id,
              chapterId,
              false // Don't filter published in editor
            );
            allItems.push(...chapterItems);
          }
        } else if (searchScope === 'universe') {
          // Load all themes and chapters in universe
          for (const themeId of selectedUniverse.themes) {
            const theme = await jsonLoader.loadTheme(selectedUniverse.id, themeId);
            if (theme) {
              const chapterIds = Object.keys(theme.chapters);
              for (const chapterId of chapterIds) {
                const chapterItems = await jsonLoader.loadChapter(
                  selectedUniverse.id,
                  themeId,
                  chapterId,
                  false
                );
                allItems.push(...chapterItems);
              }
            }
          }
        }

        // Filter out items with null/undefined chapter or theme
        const validItems = allItems.filter(item => item.chapter && item.theme);
        const invalidCount = allItems.length - validItems.length;
        
        if (invalidCount > 0) {
          console.warn(`⚠️ Filtered out ${invalidCount} items with missing chapter/theme from ${searchScope}`);
          showToast(`⚠️ ${invalidCount} items skipped (missing chapter/theme)`, 'warning', 3000);
        }

        setScopedItems(validItems);
        showToast(`✅ Loaded ${validItems.length} items from ${searchScope}`, 'success', 2000);
      } catch (error) {
        console.error('Failed to load scoped items:', error);
        showToast(`❌ Failed to load items from ${searchScope}`, 'error', 3000);
        setScopedItems([]);
      } finally {
        setLoadingItems(false);
      }
    };

    loadScopedItems();
  }, [searchScope, selectedUniverse, selectedTheme, items, showToast]);

  // Handle item selection with automatic navigation
  const handleItemSelect = async (itemId: string) => {
    const selectedItem = scopedItems.find(i => i.id === itemId);
    if (!selectedItem) {
      console.warn('⚠️ Item not found:', itemId);
      return;
    }

    // Validate that item has required fields
    if (!selectedItem.chapter) {
      console.error('❌ Item has no chapter:', selectedItem);
      showToast(`❌ Item ${itemId} has no chapter assigned`, 'error', 3000);
      return;
    }

    if (!selectedItem.theme) {
      console.error('❌ Item has no theme:', selectedItem);
      showToast(`❌ Item ${itemId} has no theme assigned`, 'error', 3000);
      return;
    }

    // Check if we need to navigate to different theme/chapter
    const needsThemeChange = selectedTheme?.id !== selectedItem.theme;
    const needsChapterChange = selectedChapter !== selectedItem.chapter;

    if (needsThemeChange) {
      // Navigate to different theme first
      showToast(`🔄 Switching to theme: ${selectedItem.theme}`, 'info', 2000);
      onThemeChange(selectedItem.theme);
      
      // Wait a bit for theme to load, then change chapter
      setTimeout(() => {
        onChapterChange(selectedItem.chapter);
        setTimeout(() => {
          onItemSelect(itemId);
        }, 300);
      }, 300);
    } else if (needsChapterChange) {
      // Just change chapter
      showToast(`🔄 Switching to chapter: ${selectedItem.chapter}`, 'info', 2000);
      onChapterChange(selectedItem.chapter);
      
      // Wait for chapter to load, then select item
      setTimeout(() => {
        onItemSelect(itemId);
      }, 300);
    } else {
      // Same chapter, just select
      onItemSelect(itemId);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalItems = items.length;
    const publishedItems = items.filter(i => i.published !== false).length;
    const unpublishedItems = totalItems - publishedItems;
    
    const levels = new Set(items.map(i => i.level));
    const levelCount = levels.size;

    return {
      totalItems,
      publishedItems,
      unpublishedItems,
      levelCount,
    };
  }, [items]);

  const getChapterTitle = (chapterId: string): string => {
    if (!selectedTheme) return chapterId;
    const chapterConfig = selectedTheme.chapters[chapterId];
    return chapterConfig?.title || chapterId;
  };

  // Format item label with context
  const formatItemLabel = (item: Item): string => {
    const baseLabel = `${item.id} - ${item.base.word || '(no word)'}`;
    
    if (searchScope === 'chapter') {
      return baseLabel;
    } else if (searchScope === 'theme') {
      const chapterLabel = item.chapter || '(no chapter)';
      return `${baseLabel} [${chapterLabel}]`;
    } else {
      const themeLabel = item.theme || '(no theme)';
      const chapterLabel = item.chapter || '(no chapter)';
      return `${baseLabel} [${themeLabel} / ${chapterLabel}]`;
    }
  };

  return (
    <div className="editor-sidebar">
      {/* Navigation Section */}
      <div className="editor-sidebar-section">
        <div className="editor-sidebar-title">Navigation</div>

        {/* Universe Dropdown */}
        <SearchableDropdown
          value={selectedUniverse?.id || ''}
          options={universes.map(u => ({ value: u.id, label: u.name }))}
          onChange={(value) => value && onUniverseChange(value)}
          placeholder="Select Universe..."
          searchPlaceholder="🔍 Search universes..."
          label="Universe"
          onAdd={() => setShowAddDialog('universe')}
          showLoadAll={true}
          onLoadAll={() => {
            showToast('📥 Loading all items for universe... (not yet implemented)', 'info', 3000);
          }}
        />

        {/* Theme Dropdown */}
        {selectedUniverse && (
          <>
            <SearchableDropdown
              value={selectedTheme?.id || ''}
              options={themes.map(t => ({ value: t, label: t }))}
              onChange={(value) => value && onThemeChange(value)}
              placeholder="Select Theme..."
              searchPlaceholder="🔍 Search themes..."
              label="Theme"
              onAdd={() => setShowAddDialog('theme')}
            />
            
            {/* Auto-load Theme Items Checkbox */}
            {selectedTheme && (
              <div style={{ 
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <input
                    type="checkbox"
                    checked={autoLoadThemeItems}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setAutoLoadThemeItems(isChecked);
                      if (isChecked) {
                        // Switch to theme scope when checkbox is enabled
                        setSearchScope('theme');
                      }
                    }}
                    style={{ marginRight: '0.5rem' }}
                  />
                  📥 Auto-load all theme items in table
                </label>
              </div>
            )}
          </>
        )}

        {/* Chapter Dropdown */}
        {selectedTheme && (
          <SearchableDropdown
            value={selectedChapter}
            options={chapters.map(c => ({ 
              value: c, 
              label: getChapterTitle(c) 
            }))}
            onChange={(value) => value && onChapterChange(value)}
            placeholder="Select Chapter..."
            searchPlaceholder="🔍 Search chapters..."
            label="Chapter"
            onAdd={() => setShowAddDialog('chapter')}
          />
        )}

        {/* Item Dropdown - Show when universe is selected */}
        {selectedUniverse && (
          <>
            <SearchableDropdown
              value=""
              options={scopedItems.map(item => ({ 
                value: item.id, 
                label: formatItemLabel(item)
              }))}
              onChange={(value) => value && handleItemSelect(value)}
              placeholder={loadingItems ? "Loading items..." : scopedItems.length === 0 ? "No items found..." : "Jump to Item..."}
              searchPlaceholder="🔍 Search items..."
              label="Jump to Item"
              disabled={loadingItems || scopedItems.length === 0}
            />
            
            {/* Search Scope Radio Buttons */}
            <div style={{ 
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '0.5rem',
                fontWeight: 500
              }}>
                Search Scope:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: selectedChapter ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  color: searchScope === 'chapter' ? '#4CAF50' : 'rgba(255, 255, 255, 0.7)',
                  opacity: selectedChapter ? 1 : 0.4
                }}>
                  <input
                    type="radio"
                    value="chapter"
                    checked={searchScope === 'chapter'}
                    onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                    disabled={!selectedChapter}
                    style={{ marginRight: '0.5rem' }}
                  />
                  🔹 Current Chapter
                  {searchScope === 'chapter' && !loadingItems && ` (${scopedItems.length} items)`}
                </label>
                
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: selectedTheme ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  color: searchScope === 'theme' ? '#4CAF50' : 'rgba(255, 255, 255, 0.7)',
                  opacity: selectedTheme ? 1 : 0.4
                }}>
                  <input
                    type="radio"
                    value="theme"
                    checked={searchScope === 'theme'}
                    onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                    disabled={!selectedTheme}
                    style={{ marginRight: '0.5rem' }}
                  />
                  🔸 Current Theme
                  {searchScope === 'theme' && !loadingItems && ` (${scopedItems.length} items)`}
                </label>
                
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: selectedUniverse ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  color: searchScope === 'universe' ? '#4CAF50' : 'rgba(255, 255, 255, 0.7)',
                  opacity: selectedUniverse ? 1 : 0.4
                }}>
                  <input
                    type="radio"
                    value="universe"
                    checked={searchScope === 'universe'}
                    onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                    disabled={!selectedUniverse}
                    style={{ marginRight: '0.5rem' }}
                  />
                  🌌 Current Universe
                  {searchScope === 'universe' && !loadingItems && ` (${scopedItems.length} items)`}
                </label>
              </div>
              
              {loadingItems && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.75rem', 
                  color: '#4CAF50',
                  fontStyle: 'italic'
                }}>
                  ⏳ Loading items...
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Stats Section */}
      {selectedChapter && (
        <div className="editor-sidebar-section">
          <div className="editor-sidebar-title">Chapter Stats</div>
          <div className="editor-stats">
            <div className="editor-stat-item">
              <span className="editor-stat-label">Total Items</span>
              <span className="editor-stat-value">{stats.totalItems}</span>
            </div>
            <div className="editor-stat-item">
              <span className="editor-stat-label">Published</span>
              <span className="editor-stat-value" style={{ color: '#4CAF50' }}>
                {stats.publishedItems}
              </span>
            </div>
            {stats.unpublishedItems > 0 && (
              <div className="editor-stat-item">
                <span className="editor-stat-label">Unpublished</span>
                <span className="editor-stat-value" style={{ color: '#FFC107' }}>
                  {stats.unpublishedItems}
                </span>
              </div>
            )}
            <div className="editor-stat-item">
              <span className="editor-stat-label">Levels</span>
              <span className="editor-stat-value">{stats.levelCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Add New Dialog */}
      {showAddDialog && (
        <AddNewDialog
          type={showAddDialog}
          universeId={selectedUniverse?.id}
          themeId={selectedTheme?.id}
          onAdd={(data) => {
            console.log('📝 New data:', data);
            
            // Call the appropriate create handler
            if (showAddDialog === 'universe') {
              onCreateUniverse(data);
            } else if (showAddDialog === 'theme') {
              onCreateTheme(data);
            } else if (showAddDialog === 'chapter') {
              onCreateChapter(data);
            }
            
            setShowAddDialog(null);
          }}
          onCancel={() => setShowAddDialog(null)}
        />
      )}
    </div>
  );
}

