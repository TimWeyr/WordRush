import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { useEditorMobile, useEditorMobileSectionInitiallyOpen } from '@/hooks/useEditorMobile';
import { useNavigate, useParams } from 'react-router-dom';
import { EditorHeader } from './EditorHeader';
import { EditorSidebar } from './EditorSidebar';
import { TableView } from './TableView';
import { DetailView } from './DetailView';
import { ValidationPanel } from './ValidationPanel';
import { MetadataEditor } from './MetadataEditor';
import { useToast } from '../Toast/ToastContainer';
import { jsonLoader } from '@/infra/utils/JSONLoader';
import { jsonWriter } from '@/infra/utils/JSONWriter';
import type { Universe, Theme, Item } from '@/types/content.types';
import './Editor.css';

function EditorLayoutContent() {
  const navigate = useNavigate();
  const { universe: universeParam, theme: themeParam, chapter: chapterParam, itemId } = useParams();
  const { showToast, showConfirm } = useToast();

  const [universes, setUniverses] = useState<Universe[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isEditorMobile = useEditorMobile();
  const [metadataEditorOpen, setMetadataEditorOpen] = useState(() => useEditorMobileSectionInitiallyOpen());

  useEffect(() => {
    setMetadataEditorOpen(!isEditorMobile);
  }, [isEditorMobile]);

  /** Mobile: hide header + sidebar while scrolling down in the main editor for more vertical space */
  const editorContentRef = useRef<HTMLDivElement>(null);
  const lastContentScrollTop = useRef(0);
  const [editorScrollChromeHidden, setEditorScrollChromeHidden] = useState(false);

  const handleEditorContentScroll = useCallback(() => {
    if (!isEditorMobile) return;
    const el = editorContentRef.current;
    if (!el) return;
    const st = el.scrollTop;
    const prev = lastContentScrollTop.current;
    const delta = st - prev;
    lastContentScrollTop.current = st;

    if (st <= 12) {
      setEditorScrollChromeHidden(false);
      return;
    }
    if (delta > 5 && st > 48) {
      setEditorScrollChromeHidden(true);
    } else if (delta < -5) {
      setEditorScrollChromeHidden(false);
    }
  }, [isEditorMobile]);

  useEffect(() => {
    if (!isEditorMobile) {
      setEditorScrollChromeHidden(false);
    }
  }, [isEditorMobile]);

  // View mode: 'table' or 'detail'
  const [viewMode, setViewMode] = useState<'table' | 'detail'>(itemId ? 'detail' : 'table');

  useEffect(() => {
    setEditorScrollChromeHidden(false);
    requestAnimationFrame(() => {
      lastContentScrollTop.current = editorContentRef.current?.scrollTop ?? 0;
    });
  }, [itemId, viewMode, selectedChapter, selectedUniverse?.id, selectedTheme?.id]);

  // Load universes on mount
  useEffect(() => {
    loadUniverses();
  }, []);

  // Load data when params change
  useEffect(() => {
    console.log('🟣 [EditorLayout] URL params changed:');
    console.log('🟣 universeParam:', universeParam);
    console.log('🟣 themeParam:', themeParam);
    console.log('🟣 chapterParam:', chapterParam);
    
    if (universeParam && themeParam && chapterParam) {
      console.log('✅ All params present, loading chapter data...');
      loadChapterData(universeParam, themeParam, chapterParam);
    } else {
      console.warn('⚠️ Missing URL params - cannot load chapter');
    }
  }, [universeParam, themeParam, chapterParam]);

  // Set selected item when itemId param changes
  useEffect(() => {
    if (itemId) {
      setSelectedItemId(itemId);
      setViewMode('detail');
    }
  }, [itemId]);

  // AutoSave removed - all changes are saved explicitly to Supabase via jsonWriter
  // No LocalStorage drafts needed anymore

  const loadUniverses = async () => {
    setLoading(true);
    try {
      const loadedUniverses = await jsonLoader.loadUniverses();
      setUniverses(loadedUniverses);
    } catch (error) {
      console.error('Failed to load universes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChapterData = async (universeId: string, themeId: string, chapterId: string) => {
    console.log('🟢 [EditorLayout] loadChapterData() called with:');
    console.log('🟢 universeId:', universeId);
    console.log('🟢 themeId:', themeId);
    console.log('🟢 chapterId:', chapterId);
    
    setLoading(true);
    setLoadingProgress({ current: 0, total: 0, message: 'Loading chapter data...' });
    try {
      // Load universe
      console.log('📖 Loading universe:', universeId);
      const universe = await jsonLoader.loadUniverse(universeId);
      if (!universe) throw new Error(`Universe ${universeId} not found`);
      console.log('✅ Universe loaded:', universe.id);
      setSelectedUniverse(universe);

      // Load theme
      console.log('📖 Loading theme:', themeId);
      const theme = await jsonLoader.loadTheme(universeId, themeId);
      if (!theme) throw new Error(`Theme ${themeId} not found`);
      console.log('✅ Theme loaded:', theme.id);
      setSelectedTheme(theme);

      console.log('✅ Chapter set:', chapterId);
      setSelectedChapter(chapterId);

      // Draft functionality removed - all data is loaded from Supabase directly
      // No LocalStorage caching needed

      // Load chapter items (including unpublished for editing)
      console.log('📖 [EditorLayout] Loading chapter items...');
      const loadedItems = await jsonLoader.loadChapter(universeId, themeId, chapterId, false);
      console.log(`✅ [EditorLayout] Loaded ${loadedItems.length} items`);
      console.log(`   Item IDs from DB:`, loadedItems.map(i => i.id));
      console.log(`   Current items in state:`, items.map(i => i.id));
      setItems(loadedItems);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('❌ Failed to load chapter data:', error);
      showToast(`Failed to load chapter: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUniverseChange = async (universeId: string) => {
    const universe = universes.find(u => u.id === universeId);
    if (universe) {
      console.log('🌍 [EditorLayout] Universe changed to:', universeId);
      setSelectedUniverse(universe);
      setSelectedTheme(null);
      setSelectedChapter('');
      setSelectedItemId(null);
      setItems([]); // Clear items - will be loaded when chapter is selected
      
      navigate('/editor');
      showToast(`Selected universe: ${universe.name}`, 'info', 2000);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    if (!selectedUniverse) return;
    
    try {
      setLoading(true);
      const theme = await jsonLoader.loadTheme(selectedUniverse.id, themeId);
      if (theme) {
        console.log('🎨 [EditorLayout] Theme changed to:', themeId);
        setSelectedTheme(theme);
        setSelectedChapter('');
        setSelectedItemId(null);
        setItems([]); // Clear items - will be loaded when chapter is selected
        
        showToast(`Selected theme: ${theme.name}`, 'info', 2000);
        navigate(`/editor/${selectedUniverse.id}/${themeId}`);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      showToast('Failed to load theme', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChapterChange = async (chapterId: string) => {
    if (!selectedUniverse || !selectedTheme) return;
    
    console.log('📚 [EditorLayout] Chapter changed to:', chapterId);
    console.log('   Loading items for this chapter only...');
    
    setSelectedChapter(chapterId);
    navigate(`/editor/${selectedUniverse.id}/${selectedTheme.id}/${chapterId}`);
    
    // Load chapter items asynchronously
    // (loadChapterData will be called by useEffect when URL changes)
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    setViewMode('detail');
    // When "auto-load all theme items" is active, selectedChapter is '' but the item
    // knows its own chapter. Use item.chapter as fallback so the URL stays valid and
    // the detail view gets the correct chapterId for saving.
    const effectiveChapter = selectedChapter
      || items.find(i => i.id === itemId)?.chapter
      || '';
    if (effectiveChapter && effectiveChapter !== selectedChapter) {
      setSelectedChapter(effectiveChapter);
    }
    navigate(`/editor/${selectedUniverse?.id}/${selectedTheme?.id}/${effectiveChapter}/${itemId}`);
  };

  const handleBackToTable = () => {
    setSelectedItemId(null);
    setViewMode('table');
    navigate(`/editor/${selectedUniverse?.id}/${selectedTheme?.id}/${selectedChapter}`);
  };

  const handleCreateUniverse = async (universeData: any) => {
    try {
      console.log('🌌 Creating new universe:', universeData);
      const result = await jsonWriter.createUniverse(universeData);
      if (result.success) {
        showToast(
          `✅ Universe "${universeData.name}" created successfully!\n` +
          `⚠️ Note: New universes are automatically loaded from the database. No code changes needed!`,
          'success',
          5000
        );
        await loadUniverses(); // Reload universes
        // Find and select the newly created universe
        const updatedUniverses = await jsonLoader.loadUniverses();
        const newUniverse = updatedUniverses.find(u => u.id === universeData.id);
        if (newUniverse) {
          setSelectedUniverse(newUniverse);
          handleUniverseChange(universeData.id); // Auto-select new universe
        }
      } else {
        throw new Error(result.error || 'Failed to create universe');
      }
    } catch (error) {
      console.error('❌ Failed to create universe:', error);
      showToast(`Failed to create universe: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleCreateTheme = async (themeData: any) => {
    if (!selectedUniverse) {
      showToast('Please select a universe first!', 'error');
      return;
    }
    
    try {
      console.log('🪐 Creating new theme:', themeData);
      const result = await jsonWriter.createTheme(selectedUniverse.id, themeData);
      if (result.success) {
        showToast(`✅ Theme "${themeData.name}" created successfully!`, 'success');
        
        // Invalidate cache for this universe to force reload with new theme
        jsonLoader.invalidateUniverseCache(selectedUniverse.id);
        
        // Reload universes list first
        await loadUniverses();
        
        // Reload the selected universe to get the new theme in the themes array
        const updatedUniverse = await jsonLoader.loadUniverse(selectedUniverse.id);
        if (updatedUniverse) {
          console.log('✅ Updated universe themes:', updatedUniverse.themes);
          setSelectedUniverse(updatedUniverse);
          
          // Verify the new theme is in the universe's themes array
          if (updatedUniverse.themes.includes(themeData.id)) {
            // Wait a bit to ensure state is updated, then load and select the theme
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Load the theme object and set it
            const newTheme = await jsonLoader.loadTheme(selectedUniverse.id, themeData.id);
            if (newTheme) {
              setSelectedTheme(newTheme);
              showToast(`✅ Theme "${themeData.name}" selected!`, 'success', 2000);
              navigate(`/editor/${selectedUniverse.id}/${themeData.id}`);
            } else {
              // Fallback: use handleThemeChange
              handleThemeChange(themeData.id);
            }
          } else {
            console.warn('⚠️ New theme not found in universe themes array:', {
              themeId: themeData.id,
              availableThemes: updatedUniverse.themes
            });
            handleThemeChange(themeData.id);
          }
        } else {
          throw new Error('Failed to reload universe after theme creation');
        }
      } else {
        throw new Error(result.error || 'Failed to create theme');
      }
    } catch (error) {
      console.error('❌ Failed to create theme:', error);
      showToast(`Failed to create theme: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleCreateChapter = async (chapterData: any) => {
    if (!selectedUniverse || !selectedTheme) {
      showToast('Please select a universe and theme first!', 'error');
      return;
    }
    
    try {
      console.log('🌙 Creating new chapter:', chapterData);
      const result = await jsonWriter.createChapter(selectedUniverse.id, selectedTheme.id, chapterData);
      if (result.success) {
        showToast(`✅ Chapter "${chapterData.title}" created successfully!`, 'success');
        
        // Invalidate cache for this theme to force reload with new chapter
        jsonLoader.invalidateThemeCache(selectedUniverse.id, selectedTheme.id);
        
        // Reload theme to get updated chapters
        const updatedTheme = await jsonLoader.loadTheme(selectedUniverse.id, selectedTheme.id);
        if (updatedTheme) {
          console.log('✅ Updated theme chapters:', Object.keys(updatedTheme.chapters));
          setSelectedTheme(updatedTheme);
          
          // Verify the new chapter is in the theme's chapters map
          if (updatedTheme.chapters[chapterData.id]) {
            // Wait a bit to ensure state is updated
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Auto-select new chapter after theme is updated
            setSelectedChapter(chapterData.id);
            handleChapterChange(chapterData.id);
          } else {
            console.warn('⚠️ New chapter not found in theme chapters map:', {
              chapterId: chapterData.id,
              availableChapters: Object.keys(updatedTheme.chapters)
            });
            // Fallback: just set the chapter ID
            setSelectedChapter(chapterData.id);
            handleChapterChange(chapterData.id);
          }
        } else {
          throw new Error('Failed to reload theme after chapter creation');
        }
      } else {
        throw new Error(result.error || 'Failed to create chapter');
      }
    } catch (error) {
      console.error('❌ Failed to create chapter:', error);
      showToast(`Failed to create chapter: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleSave = async () => {
    console.log('🔵 [EditorLayout] handleSave() CALLED!');
    console.log('🔵 viewMode:', viewMode);
    console.log('🔵 selectedUniverse:', selectedUniverse?.id);
    console.log('🔵 selectedTheme:', selectedTheme?.id);
    console.log('🔵 selectedChapter:', selectedChapter);
    console.log('🔵 selectedItemId:', selectedItemId);
    console.log('🔵 items.length:', items.length);
    
    if (!selectedUniverse || !selectedTheme || !selectedChapter) {
      console.warn('⚠️ [EditorLayout] Save aborted - missing selection!');
      return;
    }

    console.log('🟢 [EditorLayout] All checks passed, starting save...');
    setSaving(true);
    try {
      // In Detail View: Save only the current item
      if (viewMode === 'detail' && selectedItemId) {
        const currentItem = items.find(i => i.id === selectedItemId);
        if (!currentItem) {
          showToast('❌ Item not found', 'error');
          return;
        }

        console.log(`💾 [EditorLayout] Saving single item: ${currentItem.id} to Supabase...`);
        console.log('💾 Universe:', selectedUniverse.id);
        console.log('💾 Theme:', selectedTheme.id);
        console.log('💾 Chapter:', selectedChapter);
        
        const result = await jsonWriter.saveItem(
          selectedUniverse.id,
          selectedTheme.id,
          selectedChapter,
          currentItem
        );

        console.log('💾 Save result:', result);

        if (result.success) {
          setHasUnsavedChanges(false);
          showToast(`✅ Item ${currentItem.id} saved successfully!`, 'success');
        } else {
          showToast(
            `❌ Failed to save item: ${result.error || 'Unknown error'}`,
            'error'
          );
          console.warn('❌ Save error:', result.error);
        }
      } else {
        // Table View: Save all items (batch operation)
        console.log(`💾 [EditorLayout] Saving ${items.length} items to Supabase...`);
        console.log('💾 Universe:', selectedUniverse.id);
        console.log('💾 Theme:', selectedTheme.id);
        console.log('💾 Chapter:', selectedChapter);
        
        const result = await jsonWriter.saveChapter(
          selectedUniverse.id,
          selectedTheme.id,
          selectedChapter,
          items
        );

        console.log('💾 Save result:', result);

        if (result.success) {
          setHasUnsavedChanges(false);
          showToast(`✅ ${items.length} items saved successfully!`, 'success');
        } else {
          // Partial success - some items failed
          const errorCount = result.errors.length;
          const successCount = items.length - errorCount;
          showToast(
            `⚠️ Saved ${successCount}/${items.length} items. ${errorCount} failed.`,
            'warning'
          );
          console.warn('❌ Save errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('❌ [EditorLayout] Failed to save:', error);
      showToast(
        `❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      console.log('🔵 [EditorLayout] setSaving(false)');
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!selectedUniverse || !selectedTheme || !selectedChapter) return;

    showConfirm(
      'Are you sure you want to discard all unsaved changes?',
      () => {
        // Reload data from Supabase (discard local changes)
        loadChapterData(selectedUniverse.id, selectedTheme.id, selectedChapter);
        showToast('Changes discarded - reloaded from database', 'info');
      },
      'Discard',
      'Cancel'
    );
  };

  const handleItemsChange = (updatedItems: Item[]) => {
    setItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const handlePlayChapter = () => {
    if (!selectedUniverse || !selectedTheme || !selectedChapter) return;
    
    // Open game in new window with current chapter
    const gameUrl = `/?universe=${selectedUniverse.id}&theme=${selectedTheme.id}`;
    window.open(gameUrl, '_blank', 'noopener,noreferrer');
    showToast(`🎮 Opening game for ${selectedUniverse.name} - ${selectedTheme.name}`, 'info', 2000);
  };

  const handlePlayItem = () => {
    if (!selectedUniverse || !selectedTheme || !selectedChapter || !selectedItemId) return;
    
    // Open game in new window with specific item
    const gameUrl = `/?universe=${selectedUniverse.id}&theme=${selectedTheme.id}`;
    window.open(gameUrl, '_blank', 'noopener,noreferrer');
    showToast(`🎮 Opening game for item ${selectedItemId}`, 'info', 2000);
  };

  if (loading) {
    return (
      <div className="editor-layout">
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '2rem'
        }}>
          <div style={{ 
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 600
          }}>
            {loadingProgress?.message || 'Loading...'}
          </div>
          {loadingProgress && loadingProgress.total > 0 && (
            <>
              <div style={{ 
                width: '400px',
                maxWidth: '80vw',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(loadingProgress.current / loadingProgress.total) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2196F3, #64B5F6)',
                  transition: 'width 0.3s ease',
                  borderRadius: '4px'
                }} />
              </div>
              <div style={{
                fontSize: '0.95rem',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                {loadingProgress.current} / {loadingProgress.total} items
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`editor-layout${isEditorMobile && editorScrollChromeHidden ? ' editor-layout--mobile-chrome-hidden' : ''}`}
      style={{
      '--theme-primary': selectedTheme?.colorPrimary || selectedUniverse?.colorPrimary || '#2196F3',
      '--theme-accent': selectedTheme?.colorAccent || selectedUniverse?.colorAccent || '#64B5F6',
    } as CSSProperties}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <EditorHeader
          universe={selectedUniverse}
          theme={selectedTheme}
          chapter={selectedChapter}
          hasUnsavedChanges={hasUnsavedChanges}
          saving={saving}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onPlayChapter={handlePlayChapter}
          onPlayItem={viewMode === 'detail' ? handlePlayItem : undefined}
          onBack={() => navigate('/')}
        />

        <div className="editor-body">
          <EditorSidebar
          universes={universes}
          selectedUniverse={selectedUniverse}
          selectedTheme={selectedTheme}
          selectedChapter={selectedChapter}
          items={items}
          onUniverseChange={handleUniverseChange}
          onThemeChange={handleThemeChange}
          onChapterChange={handleChapterChange}
          onItemSelect={handleItemSelect}
          onCreateUniverse={handleCreateUniverse}
          onCreateTheme={handleCreateTheme}
          onCreateChapter={handleCreateChapter}
          onLoadAllThemeItems={(themeItems) => {
            // Load all theme items into TableView
            setItems(themeItems);
            setSelectedChapter(''); // Clear chapter selection since we're showing all theme items
            showToast(`📊 Showing ${themeItems.length} items from entire theme`, 'info', 2000);
          }}
        />

        <div className="editor-main">
          <div
            className="editor-content"
            ref={editorContentRef}
            onScroll={handleEditorContentScroll}
          >
            {!selectedUniverse ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '4rem', 
                color: 'rgba(255, 255, 255, 0.5)' 
              }}>
                <h2>Welcome to WordRush Editor</h2>
                <p>Select a Universe from the sidebar to get started.</p>
              </div>
            ) : (
              <>
                {/* Metadata Editor — toggle row on mobile */}
                {isEditorMobile && (
                  <button
                    type="button"
                    className="editor-metadata-collapse-toggle"
                    onClick={() => setMetadataEditorOpen((o) => !o)}
                    aria-expanded={metadataEditorOpen}
                  >
                    <span className="editor-metadata-collapse-title">Metadata Editor</span>
                    <span className="editor-metadata-collapse-summary">
                      {[selectedUniverse?.name, selectedTheme?.name || selectedTheme?.id, selectedChapter]
                        .filter(Boolean)
                        .join(' · ') || 'Universe, Theme, Chapter'}
                    </span>
                    <span className="editor-metadata-collapse-chevron">{metadataEditorOpen ? '▲' : '▼'}</span>
                  </button>
                )}
                {(!isEditorMobile || metadataEditorOpen) && (
                <MetadataEditor
                  universe={selectedUniverse}
                  theme={selectedTheme}
                  chapter={selectedChapter}
                  chapterConfig={selectedTheme?.chapters[selectedChapter]}
                  onSaveUniverse={async (updated) => {
                    console.log('💾 [EditorLayout] Save Universe:', updated);
                    try {
                      setSaving(true);
                      const uuid = await jsonWriter.supabaseLoader.getUniverseUuid(updated.id);
                      if (!uuid) {
                        showToast('❌ Failed to get universe UUID', 'error');
                        return;
                      }
                      const result = await jsonWriter.saveUniverse(updated, uuid);
                      if (result.success) {
                        showToast('✅ Universe settings saved!', 'success');
                        setHasUnsavedChanges(false);
                      } else {
                        showToast(`❌ Failed to save universe: ${result.error}`, 'error');
                      }
                    } catch (error) {
                      console.error('❌ Error saving universe:', error);
                      showToast('❌ Error saving universe', 'error');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  onSaveTheme={async (updated) => {
                    console.log('💾 [EditorLayout] Save Theme:', updated);
                    try {
                      setSaving(true);
                      const uuid = await jsonWriter.supabaseLoader.getThemeUuid(updated.id);
                      if (!uuid) {
                        showToast('❌ Failed to get theme UUID', 'error');
                        return;
                      }
                      const result = await jsonWriter.saveTheme(updated, uuid);
                      if (result.success) {
                        showToast('✅ Theme settings saved!', 'success');
                        setHasUnsavedChanges(false);
                      } else {
                        showToast(`❌ Failed to save theme: ${result.error}`, 'error');
                      }
                    } catch (error) {
                      console.error('❌ Error saving theme:', error);
                      showToast('❌ Error saving theme', 'error');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  onSaveChapter={async (chapterId, config) => {
                    console.log('💾 [EditorLayout] Save Chapter:', chapterId, config);
                    try {
                      setSaving(true);
                      const uuid = await jsonWriter.supabaseLoader.getChapterUuid(chapterId);
                      if (!uuid) {
                        showToast('❌ Failed to get chapter UUID', 'error');
                        return;
                      }
                      const result = await jsonWriter.saveChapterMetadata(chapterId, uuid, config);
                      if (result.success) {
                        showToast('✅ Chapter settings saved!', 'success');
                        setHasUnsavedChanges(false);
                      } else {
                        showToast(`❌ Failed to save chapter: ${result.error}`, 'error');
                      }
                    } catch (error) {
                      console.error('❌ Error saving chapter:', error);
                      showToast('❌ Error saving chapter', 'error');
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
                )}

                {/* Items Editor - Show TableView when chapter is selected OR when items are loaded */}
                {(selectedChapter || items.length > 0) && selectedTheme && selectedUniverse ? (
                  viewMode === 'table' ? (
                    <TableView
                      items={items}
                      onItemsChange={handleItemsChange}
                      onItemSelect={handleItemSelect}
                      chapterId={selectedChapter}
                      themeId={selectedTheme?.id}
                      universeId={selectedUniverse?.id}
                      theme={selectedTheme}
                    />
                  ) : (
                    <DetailView
                      item={items.find(i => i.id === selectedItemId) || null}
                      allItems={items}
                      onItemChange={(updatedItem) => {
                        const updatedItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
                        handleItemsChange(updatedItems);
                      }}
                      onBack={handleBackToTable}
                      universeId={selectedUniverse?.id}
                      theme={selectedTheme}
                      chapterId={selectedChapter}
                    />
                  )
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    color: 'rgba(255, 255, 255, 0.6)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    marginTop: '2rem',
                  }}>
                    <h3>📝 Metadata Editor Active</h3>
                    <p>
                      {!selectedTheme && 'Select a Theme from the sidebar to continue editing.'}
                      {selectedTheme && !selectedChapter && 'Select a Chapter from the sidebar to edit items.'}
                    </p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '1rem' }}>
                      Use the buttons above to edit Universe, Theme, or Chapter settings.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

          {selectedChapter && items.length > 0 && (
            <ValidationPanel items={items} onJumpToItem={handleItemSelect} />
          )}
        </div>
      </div>
    </div>
  );
}

export function EditorLayout() {
  return <EditorLayoutContent />;
}

