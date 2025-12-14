import { useState, useMemo } from 'react';
import type { Universe, Theme, Item } from '@/types/content.types';
import { AddNewDialog } from './AddNewDialog';
import { useToast } from '../Toast/ToastContainer';
import { SearchableDropdown } from './SearchableDropdown';

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
}: EditorSidebarProps) {
  const { showToast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState<'universe' | 'theme' | 'chapter' | null>(null);

  // Get themes from selected universe
  const themes = useMemo(() => {
    return selectedUniverse?.themes || [];
  }, [selectedUniverse]);

  // Get chapters from selected theme
  const chapters = useMemo(() => {
    if (!selectedTheme) return [];
    return Object.keys(selectedTheme.chapters);
  }, [selectedTheme]);

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
          <SearchableDropdown
            value={selectedTheme?.id || ''}
            options={themes.map(t => ({ value: t, label: t }))}
            onChange={(value) => value && onThemeChange(value)}
            placeholder="Select Theme..."
            searchPlaceholder="🔍 Search themes..."
            label="Theme"
            onAdd={() => setShowAddDialog('theme')}
            showLoadAll={true}
            onLoadAll={() => {
              showToast('📥 Loading all items for theme... (not yet implemented)', 'info', 3000);
            }}
          />
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

        {/* Item Dropdown */}
        {items.length > 0 && (
          <SearchableDropdown
            value=""
            options={items.map(item => ({ 
              value: item.id, 
              label: `${item.id} - ${item.base.word || '(no word)'}` 
            }))}
            onChange={(value) => value && onItemSelect(value)}
            placeholder="Jump to Item..."
            searchPlaceholder="🔍 Search items..."
            label="Jump to Item"
          />
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

