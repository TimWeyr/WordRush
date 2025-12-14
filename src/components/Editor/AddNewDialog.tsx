import { useState } from 'react';

interface AddNewDialogProps {
  type: 'universe' | 'theme' | 'chapter';
  universeId?: string;
  themeId?: string;
  onAdd: (data: any) => void;
  onCancel: () => void;
}

export function AddNewDialog({ type, universeId: _universeId, themeId: _themeId, onAdd, onCancel }: AddNewDialogProps) {
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    description: '',
    icon: '',
    colorPrimary: '#2196F3',
    colorAccent: '#64B5F6',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id || !formData.name) {
      alert('ID and Name are required!');
      return;
    }

    let newData: any;

    if (type === 'universe') {
      newData = {
        id: formData.id,
        name: formData.name,
        description: formData.description,
        colorPrimary: formData.colorPrimary,
        colorAccent: formData.colorAccent,
        backgroundGradient: [formData.colorPrimary, formData.colorAccent],
        icon: formData.icon || '🌌',
        available: true,
        language: 'de',
        themes: [],
        meta: {
          author: 'Editor',
          version: '1.0',
          created: new Date().toISOString(),
        },
      };
    } else if (type === 'theme') {
      newData = {
        id: formData.id,
        name: formData.name,
        description: formData.description,
        colorPrimary: formData.colorPrimary,
        colorAccent: formData.colorAccent,
        backgroundGradient: [formData.colorPrimary, formData.colorAccent],
        icon: formData.icon || '🪐',
        available: true,
        language: 'de',
        chapters: {},
        meta: {
          author: 'Editor',
          version: '1.0',
          created: new Date().toISOString(),
        },
      };
    } else {
      // Chapter
      newData = {
        id: formData.id,
        title: formData.name,
        backgroundGradient: [formData.colorPrimary, formData.colorAccent],
        spawnRate: 1.0,
        waveDuration: 30000,
      };
    }

    onAdd(newData);
  };

  const getTitle = () => {
    switch (type) {
      case 'universe': return '🌌 Add New Universe';
      case 'theme': return '🪐 Add New Theme';
      case 'chapter': return '🌙 Add New Chapter';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1f35 0%, #0a0e1a 100%)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '2rem', color: 'white' }}>
          {getTitle()}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="editor-form-group">
            <label className="editor-form-label">ID *</label>
            <input
              type="text"
              className="editor-form-input"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').replace(/^[^a-z]+/, '').replace(/-+/g, '-').replace(/_+/g, '_') })}
              placeholder="e.g., my-universe, business-english, chapter-01"
              required
              pattern="[a-z][a-z0-9_-]*"
            />
            <span className="editor-form-hint">
              Must start with a letter. Only lowercase letters, numbers, hyphens, and underscores allowed. Used in URLs.
            </span>
          </div>

          <div className="editor-form-group">
            <label className="editor-form-label">Name *</label>
            <input
              type="text"
              className="editor-form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={type === 'chapter' ? 'e.g., Chapter Title' : 'e.g., My Universe'}
              required
            />
          </div>

          {type !== 'chapter' && (
            <>
              <div className="editor-form-group">
                <label className="editor-form-label">Description</label>
                <textarea
                  className="editor-form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description..."
                  rows={3}
                />
              </div>

              <div className="editor-form-group">
                <label className="editor-form-label">Icon (Emoji)</label>
                <input
                  type="text"
                  className="editor-form-input"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder={type === 'universe' ? '🌌' : '🪐'}
                  maxLength={2}
                />
              </div>
            </>
          )}

          <div className="editor-form-row">
            <div className="editor-form-group">
              <label className="editor-form-label">Primary Color</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.colorPrimary}
                  onChange={(e) => setFormData({ ...formData, colorPrimary: e.target.value })}
                  style={{ width: '50px', height: '40px', cursor: 'pointer', borderRadius: '6px' }}
                />
                <input
                  type="text"
                  className="editor-form-input"
                  value={formData.colorPrimary}
                  onChange={(e) => setFormData({ ...formData, colorPrimary: e.target.value })}
                />
              </div>
            </div>
            <div className="editor-form-group">
              <label className="editor-form-label">Accent Color</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.colorAccent}
                  onChange={(e) => setFormData({ ...formData, colorAccent: e.target.value })}
                  style={{ width: '50px', height: '40px', cursor: 'pointer', borderRadius: '6px' }}
                />
                <input
                  type="text"
                  className="editor-form-input"
                  value={formData.colorAccent}
                  onChange={(e) => setFormData({ ...formData, colorAccent: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="submit"
              className="editor-button primary"
              style={{ flex: 1 }}
            >
              ✅ Create {type === 'universe' ? 'Universe' : type === 'theme' ? 'Theme' : 'Chapter'}
            </button>
            <button
              type="button"
              className="editor-button"
              onClick={onCancel}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

