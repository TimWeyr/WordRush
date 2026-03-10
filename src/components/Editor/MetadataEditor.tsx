import { useState, useEffect } from 'react';
import type { Universe, Theme } from '@/types/content.types';
import { GradientPicker } from './GradientPicker';

interface MetadataEditorProps {
  universe: Universe | null;
  theme: Theme | null;
  chapter: string;
  chapterConfig: any;
  onSaveUniverse?: (universe: Universe) => void;
  onSaveTheme?: (theme: Theme) => void;
  onSaveChapter?: (chapterId: string, config: any) => void;
}

export function MetadataEditor({
  universe,
  theme,
  chapter,
  chapterConfig,
  onSaveUniverse,
  onSaveTheme,
  onSaveChapter,
}: MetadataEditorProps) {
  const [activeSection, setActiveSection] = useState<'universe' | 'theme' | 'chapter' | null>(null);
  const [localUniverse, setLocalUniverse] = useState<Universe | null>(universe);
  const [localTheme, setLocalTheme] = useState<Theme | null>(theme);
  const [localChapterConfig, setLocalChapterConfig] = useState<any>(chapterConfig);

  // Sync local state when props change (e.g. different chapter/theme selected)
  useEffect(() => { setLocalUniverse(universe); }, [universe]);
  useEffect(() => { setLocalTheme(theme); }, [theme]);
  useEffect(() => { setLocalChapterConfig(chapterConfig); }, [chapterConfig]);

  if (!universe && !theme && !chapter) {
    return null;
  }

  const handleUniverseFieldChange = (field: string, value: any) => {
    if (!localUniverse) return;
    setLocalUniverse({
      ...localUniverse,
      [field]: value,
    });
  };

  const handleThemeFieldChange = (field: string, value: any) => {
    if (!localTheme) return;
    setLocalTheme({
      ...localTheme,
      [field]: value,
    });
  };

  const handleChapterFieldChange = (field: string, value: any) => {
    setLocalChapterConfig({
      ...localChapterConfig,
      [field]: value,
    });
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1rem',
      }}>
        <div style={{ 
          fontSize: '1.2rem', 
          fontWeight: 600, 
          marginBottom: '1.5rem',
          color: 'white',
        }}>
          🌍 Metadata Editor
        </div>

        {/* Toggle Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {universe && (
            <button
              className={`editor-button ${activeSection === 'universe' ? 'primary' : ''}`}
              onClick={() => setActiveSection(activeSection === 'universe' ? null : 'universe')}
            >
              🌌 Universe Settings
            </button>
          )}
          {theme && (
            <button
              className={`editor-button ${activeSection === 'theme' ? 'primary' : ''}`}
              onClick={() => setActiveSection(activeSection === 'theme' ? null : 'theme')}
            >
              🪐 Theme Settings
            </button>
          )}
          {chapter && (
            <button
              className={`editor-button ${activeSection === 'chapter' ? 'primary' : ''}`}
              onClick={() => setActiveSection(activeSection === 'chapter' ? null : 'chapter')}
            >
              🌙 Chapter Settings
            </button>
          )}
        </div>

        {/* Universe Editor */}
        {activeSection === 'universe' && localUniverse && (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '1.5rem',
            marginBottom: '1rem',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Universe: {localUniverse.name}</h3>
            
            <div className="editor-form-row">
              <div className="editor-form-group">
                <label className="editor-form-label">Name</label>
                <input
                  type="text"
                  className="editor-form-input"
                  value={localUniverse.name}
                  onChange={(e) => handleUniverseFieldChange('name', e.target.value)}
                />
              </div>
              <div className="editor-form-group">
                <label className="editor-form-label">Icon</label>
                <input
                  type="text"
                  className="editor-form-input"
                  value={localUniverse.icon}
                  onChange={(e) => handleUniverseFieldChange('icon', e.target.value)}
                  placeholder="🌌"
                />
              </div>
            </div>

            <div className="editor-form-group">
              <label className="editor-form-label">Description</label>
              <textarea
                className="editor-form-textarea"
                value={localUniverse.description}
                onChange={(e) => handleUniverseFieldChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="editor-form-row">
              <div className="editor-form-group">
                <label className="editor-form-label">Primary Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={localUniverse.colorPrimary}
                    onChange={(e) => handleUniverseFieldChange('colorPrimary', e.target.value)}
                    style={{ width: '50px', height: '40px', cursor: 'pointer', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    className="editor-form-input"
                    value={localUniverse.colorPrimary}
                    onChange={(e) => handleUniverseFieldChange('colorPrimary', e.target.value)}
                  />
                </div>
              </div>
              <div className="editor-form-group">
                <label className="editor-form-label">Accent Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={localUniverse.colorAccent}
                    onChange={(e) => handleUniverseFieldChange('colorAccent', e.target.value)}
                    style={{ width: '50px', height: '40px', cursor: 'pointer', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    className="editor-form-input"
                    value={localUniverse.colorAccent}
                    onChange={(e) => handleUniverseFieldChange('colorAccent', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="editor-form-group">
              <label className="editor-form-label">Ship Skin (Optional)</label>
              <input
                type="text"
                className="editor-form-input"
                value={localUniverse.shipSkin || ''}
                onChange={(e) => handleUniverseFieldChange('shipSkin', e.target.value)}
                placeholder="default, medical_ship, etc."
              />
            </div>

            <div className="editor-form-group">
              <label className="editor-form-label">AI Model (Optional)</label>
              <select
                className="editor-form-select"
                value={localUniverse.aiModel || ''}
                onChange={(e) => handleUniverseFieldChange('aiModel', e.target.value)}
              >
                <option value="">No AI Model</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-sonnet">Claude Sonnet</option>
                <option value="claude-haiku">Claude Haiku</option>
              </select>
            </div>

            {onSaveUniverse && (
              <button
                className="editor-button primary"
                onClick={() => onSaveUniverse(localUniverse)}
                style={{ marginTop: '1rem' }}
              >
                💾 Save Universe Settings
              </button>
            )}
          </div>
        )}

        {/* Theme Editor */}
        {activeSection === 'theme' && localTheme && (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '1.5rem',
            marginBottom: '1rem',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Theme: {localTheme.name}</h3>
            
            <div className="editor-form-row">
              <div className="editor-form-group">
                <label className="editor-form-label">Name</label>
                <input
                  type="text"
                  className="editor-form-input"
                  value={localTheme.name}
                  onChange={(e) => handleThemeFieldChange('name', e.target.value)}
                />
              </div>
              <div className="editor-form-group">
                <label className="editor-form-label">Icon</label>
                <input
                  type="text"
                  className="editor-form-input"
                  value={localTheme.icon}
                  onChange={(e) => handleThemeFieldChange('icon', e.target.value)}
                  placeholder="🪐"
                />
              </div>
            </div>

            <div className="editor-form-group">
              <label className="editor-form-label">Description</label>
              <textarea
                className="editor-form-textarea"
                value={localTheme.description}
                onChange={(e) => handleThemeFieldChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="editor-form-row">
              <div className="editor-form-group">
                <label className="editor-form-label">Primary Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={localTheme.colorPrimary}
                    onChange={(e) => handleThemeFieldChange('colorPrimary', e.target.value)}
                    style={{ width: '50px', height: '40px', cursor: 'pointer', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    className="editor-form-input"
                    value={localTheme.colorPrimary}
                    onChange={(e) => handleThemeFieldChange('colorPrimary', e.target.value)}
                  />
                </div>
              </div>
              <div className="editor-form-group">
                <label className="editor-form-label">Accent Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={localTheme.colorAccent}
                    onChange={(e) => handleThemeFieldChange('colorAccent', e.target.value)}
                    style={{ width: '50px', height: '40px', cursor: 'pointer', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    className="editor-form-input"
                    value={localTheme.colorAccent}
                    onChange={(e) => handleThemeFieldChange('colorAccent', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {onSaveTheme && (
              <button
                className="editor-button primary"
                onClick={() => onSaveTheme(localTheme)}
                style={{ marginTop: '1rem' }}
              >
                💾 Save Theme Settings
              </button>
            )}
          </div>
        )}

        {/* Chapter Editor */}
        {activeSection === 'chapter' && chapter && (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '1.5rem',
            marginBottom: '1rem',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Chapter: {chapter}</h3>
            
            <div className="editor-form-group">
              <label className="editor-form-label">Title (Display Name)</label>
              <input
                type="text"
                className="editor-form-input"
                value={localChapterConfig?.title || ''}
                onChange={(e) => handleChapterFieldChange('title', e.target.value)}
                placeholder={chapter}
              />
              <span className="editor-form-hint">
                If empty, the chapter ID will be used as title
              </span>
            </div>

            <div className="editor-form-row">
              <div className="editor-form-group">
                <label className="editor-form-label">Chapter ID</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    padding: '0.4rem 0.6rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: 'rgba(255,255,255,0.5)',
                    userSelect: 'text',
                    flex: 1,
                  }}>
                    {chapter}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(`cid. ${chapter}`)}
                    title={`Kopiere "cid. ${chapter}"`}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '4px',
                      padding: '0.35rem 0.5rem',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.45)',
                      fontSize: '0.8rem',
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                  >
                    📋
                  </button>
                </div>
              </div>
              <div className="editor-form-group">
                <label className="editor-form-label">Spawn Rate</label>
                <input
                  type="number"
                  className="editor-form-input"
                  value={localChapterConfig?.spawnRate || 1.0}
                  onChange={(e) => handleChapterFieldChange('spawnRate', parseFloat(e.target.value))}
                  step="0.1"
                  min="0.1"
                  max="5"
                />
              </div>
              <div className="editor-form-group">
                <label className="editor-form-label">Wave Duration (ms)</label>
                <input
                  type="number"
                  className="editor-form-input"
                  value={localChapterConfig?.waveDuration || 30000}
                  onChange={(e) => handleChapterFieldChange('waveDuration', parseInt(e.target.value))}
                  step="1000"
                />
              </div>
            </div>

            <GradientPicker
              colors={localChapterConfig?.backgroundGradient || ['#1a237e', '#283593']}
              onChange={(colors) => handleChapterFieldChange('backgroundGradient', colors)}
              label="🎨 Background Gradient"
            />

            {onSaveChapter && (
              <button
                className="editor-button primary"
                onClick={() => onSaveChapter(chapter, localChapterConfig)}
                style={{ marginTop: '1rem' }}
              >
                💾 Save Chapter Settings
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

