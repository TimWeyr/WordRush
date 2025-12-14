import type { Universe, Theme } from '@/types/content.types';

interface EditorHeaderProps {
  universe: Universe | null;
  theme: Theme | null;
  chapter: string;
  hasUnsavedChanges: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onPlayChapter: () => void;
  onPlayItem?: () => void;
  onBack: () => void;
}

export function EditorHeader({
  universe,
  theme,
  chapter,
  hasUnsavedChanges,
  saving,
  onSave,
  onDiscard,
  onPlayChapter,
  onPlayItem,
  onBack,
}: EditorHeaderProps) {
  return (
    <div className="editor-header">
      <div className="editor-header-left">
        <button className="editor-header-back" onClick={onBack}>
          ← Back
        </button>
        
        <div className="editor-breadcrumb">
          <span>WordRush Editor</span>
          {universe && (
            <>
              <span className="editor-breadcrumb-separator">›</span>
              <span>{universe.name}</span>
            </>
          )}
          {theme && (
            <>
              <span className="editor-breadcrumb-separator">›</span>
              <span>{theme.name}</span>
            </>
          )}
          {chapter && (
            <>
              <span className="editor-breadcrumb-separator">›</span>
              <span>{chapter}</span>
            </>
          )}
        </div>
      </div>

      <div className="editor-header-right">
        {hasUnsavedChanges && (
          <button className="editor-header-button danger" onClick={onDiscard}>
            🗑️ Discard Changes
          </button>
        )}

        {chapter && (
          <>
            <button className="editor-header-button" onClick={onPlayChapter}>
              ▶️ Play Chapter
            </button>
            {onPlayItem && (
              <button className="editor-header-button" onClick={onPlayItem}>
                🎮 Play Item
              </button>
            )}
          </>
        )}

        <button 
          className="editor-header-button primary" 
          onClick={() => {
            console.log('🟦 [EditorHeader] Save button CLICKED!');
            console.log('🟦 hasUnsavedChanges:', hasUnsavedChanges);
            console.log('🟦 saving:', saving);
            console.log('🟦 disabled:', !hasUnsavedChanges || saving);
            console.log('🟦 onSave function:', onSave);
            onSave();
          }}
          disabled={!hasUnsavedChanges || saving}
        >
          {saving ? '💾 Saving...' : hasUnsavedChanges ? '💾 Save Changes' : '✅ Saved'}
        </button>
      </div>
    </div>
  );
}

