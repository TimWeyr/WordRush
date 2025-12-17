import { useState, useEffect, useRef } from 'react';
import { useToast } from '../Toast/ToastContainer';

interface TextParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (parsedData: ParsedItemData[]) => void; // Array von Items!
  chapterId: string;
}

export interface ParsedItemData {
  base: string;
  baseContext?: string; // Optional context for base word (after comma in b. line)
  corrects: Array<{ word: string; context: string; order: number }>;
  distractors: Array<{ word: string; redirect: string; context: string }>;
  level: number;
  source?: string; // Optional source (from s. line)
  detail?: string; // Optional detail (from s. line)
}

interface ValidationError {
  line: number;
  message: string;
}

export function TextParserModal({ isOpen, onClose, onSave }: TextParserModalProps) {
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Helper: Check if currentItem is complete and valid
  const isItemComplete = (item: Partial<ParsedItemData> | null): item is ParsedItemData => {
    if (!item) return false;
    if (typeof item.base !== 'string') return false;
    if (!Array.isArray(item.corrects)) return false;
    if (item.corrects.length === 0) return false;
    return true;
  };
  
  // Helper: Convert partial item to complete item
  const completeItem = (item: Partial<ParsedItemData>, defaultLevel: number): ParsedItemData => {
    return {
      base: item.base!,
      baseContext: item.baseContext, // Preserve optional base context
      corrects: item.corrects!,
      distractors: item.distractors || [],
      level: item.level || defaultLevel,
      source: item.source, // Optional source
      detail: item.detail, // Optional detail
    };
  };

  // Parse text into structured data - MULTIPLE ITEMS SUPPORT
  const parseText = (inputText: string): { data: ParsedItemData[] | null; errors: ValidationError[] } => {
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const parseErrors: ValidationError[] = [];
    
    const items: ParsedItemData[] = [];
    let currentItem: Partial<ParsedItemData> | null = null;
    let currentLevel: number = 1; // Default level für alle Items

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const lowerLine = line.toLowerCase();
      
      // Base word - STARTET NEUES ITEM
      if (lowerLine.startsWith('b.')) {
        // Speichere vorheriges Item, falls vorhanden
        if (isItemComplete(currentItem)) {
          items.push(completeItem(currentItem, currentLevel));
        }
        
        // Starte neues Item - unterstützt optionalen Context nach Komma
        const content = line.substring(2).trim();
        const parts = content.split(',').map(p => p.trim());
        const baseWord = parts[0] || '';
        const baseContext = parts[1] || undefined; // Optional context
        
        if (baseWord.length === 0) {
          parseErrors.push({ line: lineNum, message: 'Base word cannot be empty' });
          currentItem = null;
        } else {
          currentItem = {
            base: baseWord,
            baseContext: baseContext, // Optional context from b. line
            corrects: [],
            distractors: [],
            level: currentLevel, // Verwende aktuelles Level
          };
        }
      }
      // Correct entry - ZU AKTUELLEM ITEM HINZUFÜGEN
      else if (lowerLine.startsWith('c.')) {
        if (!currentItem) {
          parseErrors.push({ line: lineNum, message: 'Correct entry must come after a base word (b.)' });
          return;
        }
        
        const content = line.substring(2).trim();
        const parts = content.split(',').map(p => p.trim());
        
        if (parts.length < 1) {
          parseErrors.push({ line: lineNum, message: 'Correct entry must have at least a word' });
        } else {
          const word = parts[0] || '';
          const context = parts[1] || '';
          const orderStr = parts[2] || '0';
          const order = parseInt(orderStr, 10);
          
          if (isNaN(order)) {
            parseErrors.push({ line: lineNum, message: `Invalid order number: ${orderStr}` });
          } else if (word.length === 0) {
            parseErrors.push({ line: lineNum, message: 'Correct word cannot be empty' });
          } else {
            currentItem.corrects!.push({ word, context, order });
          }
        }
      }
      // Distractor entry - ZU AKTUELLEM ITEM HINZUFÜGEN
      else if (lowerLine.startsWith('d.')) {
        if (!currentItem) {
          parseErrors.push({ line: lineNum, message: 'Distractor entry must come after a base word (b.)' });
          return;
        }
        
        const content = line.substring(2).trim();
        const parts = content.split(',').map(p => p.trim());
        
        if (parts.length < 1) {
          parseErrors.push({ line: lineNum, message: 'Distractor entry must have at least a word' });
        } else {
          const word = parts[0] || '';
          const redirect = parts[1] || '';
          const context = parts[2] || '';
          
          if (word.length === 0) {
            parseErrors.push({ line: lineNum, message: 'Distractor word cannot be empty' });
          } else {
            currentItem.distractors!.push({ word, redirect, context });
          }
        }
      }
      // Source/Detail - OPTIONAL, GILT NUR FÜR AKTUELLES ITEM
      else if (lowerLine.startsWith('s.')) {
        if (!currentItem) {
          parseErrors.push({ line: lineNum, message: 'Source entry must come after a base word (b.)' });
          return;
        }
        
        const content = line.substring(2).trim();
        const parts = content.split(',').map(p => p.trim());
        
        if (parts.length < 1) {
          parseErrors.push({ line: lineNum, message: 'Source entry must have at least a source' });
        } else {
          const source = parts[0] || '';
          const detail = parts[1] || '';
          
          if (source.length === 0) {
            parseErrors.push({ line: lineNum, message: 'Source cannot be empty' });
          } else {
            currentItem.source = source;
            currentItem.detail = detail || undefined; // Optional detail
          }
        }
      }
      // Level - SETZT LEVEL FÜR ALLE FOLGENDEN ITEMS
      else if (lowerLine.startsWith('l.')) {
        const levelStr = line.substring(2).trim();
        const parsedLevel = parseInt(levelStr, 10);
        
        if (isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 10) {
          parseErrors.push({ line: lineNum, message: `Invalid level: ${levelStr} (must be 1-10)` });
        } else {
          currentLevel = parsedLevel;
          // Setze auch für aktuelles Item, falls vorhanden
          if (currentItem) {
            currentItem.level = parsedLevel;
          }
        }
      }
      // Unknown line
      else {
        parseErrors.push({ line: lineNum, message: `Unknown line format: ${line}` });
      }
    });
    
    // Speichere letztes Item
    if (isItemComplete(currentItem)) {
      items.push(completeItem(currentItem, currentLevel));
    }
    
    // Validation rules für alle Items
    if (items.length === 0) {
      parseErrors.push({ line: 0, message: 'At least one item (b. line) is required' });
    }
    
    // Validiere jedes Item
    items.forEach((item, itemIndex) => {
      if (!item.base) {
        parseErrors.push({ line: 0, message: `Item ${itemIndex + 1}: Base word is required` });
      }
      if (item.corrects.length === 0) {
        parseErrors.push({ line: 0, message: `Item ${itemIndex + 1}: At least one correct entry is required` });
      }
    });

    if (parseErrors.length > 0) {
      return { data: null, errors: parseErrors };
    }

    return {
      data: items,
      errors: [],
    };
  };

  const handleValidate = () => {
    const result = parseText(text);
    setErrors(result.errors);
    
    if (result.errors.length === 0 && result.data) {
      const itemCount = result.data.length;
      showToast(`✅ Text is valid! Ready to save ${itemCount} item${itemCount > 1 ? 's' : ''}.`, 'success', 3000);
    } else {
      const errorMessages = result.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n');
      showToast(`❌ Validation failed:\n${errorMessages}`, 'error', 5000);
    }
  };

  const handleSave = () => {
    const result = parseText(text);
    
    if (result.errors.length > 0) {
      const errorMessages = result.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n');
      showToast(`❌ Cannot save: Validation errors:\n${errorMessages}`, 'error', 5000);
      return;
    }

    if (!result.data) {
      showToast('❌ No data to save', 'error');
      return;
    }

    onSave(result.data);
    // Don't clear text - keep it for potential reuse
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Auto-validate on Enter (new line)
      setTimeout(() => handleValidate(), 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
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
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f35 0%, #0a0e1a 100%)',
          borderRadius: '16px',
          padding: '2rem',
          width: '80%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.5rem' }}>
            Create New Items (Text Parser)
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem',
              lineHeight: 1,
            }}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`b. Basewort 1, base context
c. correct1, context1, 0
c. correct2, context2, 1
d. distractor1, redirect1, context1
s. wikipedia, eine bps ist eine störung bla.....
l. 1

b. Basewort 2
c. correct1, context1, 0
d. distractor1, redirect1, context1
l. 2`}
          style={{
            flex: 1,
            minHeight: '400px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.9)',
            resize: 'vertical',
            marginBottom: '1rem',
          }}
        />

        {/* Error Display */}
        {errors.length > 0 && (
          <div
            style={{
              background: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              maxHeight: '150px',
              overflowY: 'auto',
            }}
          >
            <div style={{ color: '#f44336', fontWeight: 600, marginBottom: '0.5rem' }}>
              Validation Errors:
            </div>
            {errors.map((error, index) => (
              <div key={index} style={{ color: '#f44336', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                {error.line > 0 ? `Line ${error.line}: ` : ''}{error.message}
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            className="editor-button"
            onClick={handleValidate}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            🔍 Prüfen
          </button>
          <button
            className="editor-button primary"
            onClick={handleSave}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            💾 Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

