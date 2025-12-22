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
  baseContext?: string; // Optional context for base word (after pipe in b. line)
  corrects: Array<{ word: string; context: string; order: number }>;
  distractors: Array<{ word: string; redirect: string; context: string }>;
  level: number;
  source?: string; // Optional source (from s. line)
  detail?: string; // Optional detail (from s. line)
  tags?: string[]; // Optional tags (from t. line, pipe-separated)
}

interface ValidationError {
  line: number;
  message: string;
}

interface CursorInfo {
  lineType: string;
  fieldIndex: number;
  format: string;
  fieldNames: string[];
  hasTooManyFields: boolean;
  actualPipeCount: number;
}

export function TextParserModal({ isOpen, onClose, onSave }: TextParserModalProps) {
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [cursorInfo, setCursorInfo] = useState<CursorInfo | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens and initialize cursor info
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      // Initialize cursor info to show summary if text is empty
      const info = getCursorInfo(textareaRef.current);
      setCursorInfo(info);
    }
  }, [isOpen]);
  
  // Update cursor info when text changes (especially when text becomes empty)
  useEffect(() => {
    if (textareaRef.current) {
      const info = getCursorInfo(textareaRef.current);
      setCursorInfo(info);
    }
  }, [text]);

  // Helper: Get current line and cursor position info
  const getCursorInfo = (textarea: HTMLTextAreaElement): CursorInfo | null => {
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    const textInLineBeforeCursor = currentLine;
    
    // Count pipes before cursor in current line
    const pipesBeforeCursor = (textInLineBeforeCursor.match(/\|/g) || []).length;
    
    // Detect line type
    const trimmedLine = currentLine.trim().toLowerCase();
    let lineType: string | null = null;
    let format = '';
    let fieldNames: string[] = [];
    
    if (trimmedLine.startsWith('b.')) {
      lineType = 'base';
      format = 'b. Basewort | base context';
      fieldNames = ['Basewort', 'base context'];
    } else if (trimmedLine.startsWith('c.')) {
      lineType = 'correct';
      format = 'c. word | context | order';
      fieldNames = ['word', 'context', 'order'];
    } else if (trimmedLine.startsWith('d.')) {
      lineType = 'distractor';
      format = 'd. word | redirect | context';
      fieldNames = ['word', 'redirect', 'context'];
    } else if (trimmedLine.startsWith('s.')) {
      lineType = 'source';
      format = 's. source | detail';
      fieldNames = ['source', 'detail'];
    } else if (trimmedLine.startsWith('t.')) {
      lineType = 'tags';
      format = 't. tag | tag | tag | ...';
      fieldNames = ['tag']; // Special handling for tags
    } else if (trimmedLine.startsWith('l.')) {
      lineType = 'level';
      format = 'l. level';
      fieldNames = ['level'];
    } else if (trimmedLine.startsWith('#')) {
      lineType = 'comment';
      format = '# comment';
      fieldNames = [];
    }
    
    if (lineType === 'comment') {
      return { 
        lineType: 'comment',
        fieldIndex: 0,
        format: '# comment',
        fieldNames: [],
        hasTooManyFields: false,
        actualPipeCount: 0
      };
    }
    
    if (lineType) {
      // For tags, fieldIndex is based on pipe count (any position is valid)
      if (lineType === 'tags') {
        return { 
          lineType, 
          fieldIndex: pipesBeforeCursor, 
          format, 
          fieldNames,
          hasTooManyFields: false, // Tags can have unlimited fields
          actualPipeCount: pipesBeforeCursor
        };
      }
      
      // For other types, field index: 0 = first field (in prefix), 1 = after first pipe, etc.
      // Check if there are too many pipes
      const expectedPipeCount = fieldNames.length - 1; // e.g., 2 pipes for 3 fields
      const hasTooManyFields = pipesBeforeCursor > expectedPipeCount;
      const fieldIndex = Math.min(pipesBeforeCursor, fieldNames.length - 1);
      
      return { 
        lineType, 
        fieldIndex, 
        format, 
        fieldNames,
        hasTooManyFields,
        actualPipeCount: pipesBeforeCursor
      };
    }
    
    // No specific line type detected - return null to show summary
    return null;
  };

  // Handler für Cursor-Änderungen
  const handleCursorChange = (e: React.ChangeEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement> | React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const info = getCursorInfo(textarea);
    setCursorInfo(info);
  };

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
      tags: item.tags || [], // Optional tags
    };
  };

  // Parse text into structured data - MULTIPLE ITEMS SUPPORT
  const parseText = (inputText: string): { data: ParsedItemData[] | null; errors: ValidationError[] } => {
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('#'));
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
        
        // Starte neues Item - unterstützt optionalen Context nach Pipe
        const content = line.substring(2).trim();
        const parts = content.split('|').map(p => p.trim());
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
        const parts = content.split('|').map(p => p.trim());
        
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
        const parts = content.split('|').map(p => p.trim());
        
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
        const parts = content.split('|').map(p => p.trim());
        
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
      // Tags - OPTIONAL, GILT NUR FÜR AKTUELLES ITEM
      else if (lowerLine.startsWith('t.')) {
        if (!currentItem) {
          parseErrors.push({ line: lineNum, message: 'Tags entry must come after a base word (b.)' });
          return;
        }
        
        const content = line.substring(2).trim();
        if (content.length === 0) {
          parseErrors.push({ line: lineNum, message: 'Tags entry cannot be empty' });
        } else {
          // Split by pipe and filter empty tags
          const tags = content.split('|').map(t => t.trim()).filter(t => t.length > 0);
          if (tags.length === 0) {
            parseErrors.push({ line: lineNum, message: 'At least one tag is required' });
          } else {
            currentItem.tags = tags;
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
    // Update cursor info on key press
    setTimeout(() => handleCursorChange(e), 0);
  };

  // Render Format Hint
  const renderFormatHint = () => {
    // Always show hint - if no cursorInfo, show summary
    if (!cursorInfo) {
      return (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            color: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          <div style={{ marginBottom: '0.5rem', opacity: 0.7, fontSize: '0.8rem' }}>
            Verfügbare Befehle:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
            <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>b.</span> Basewort | base context</div>
            <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>c.</span> word | context | order</div>
            <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>d.</span> word | redirect | context</div>
            <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>s.</span> source | detail</div>
            <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>t.</span> tag | tag | tag | ...</div>
            <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>l.</span> level</div>
            <div><span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>#</span> comment (wird ignoriert)</div>
          </div>
        </div>
      );
    }
    
    const { format, fieldIndex, lineType, hasTooManyFields, fieldNames } = cursorInfo;
    
    // Special handling for comments
    if (lineType === 'comment') {
      return (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            color: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          <div> Format: 
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}># </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic' }}>Kommentar, wird nicht verarbeitet</span>
          </div>
 
        </div>
      );
    }
    
    // Special handling for tags
    if (lineType === 'tags') {
      return (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            color: 'rgba(255, 255, 255, 0.9)',
          }}
        >
      
          <div> Format: 
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>t. </span>
            <span
              style={{
                textDecoration: 'underline',
                textDecorationColor: '#4CAF50',
                textDecorationThickness: '2px',
                color: '#4CAF50',
                fontWeight: 600,
              }}
            >
              tag
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}> | </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>tag</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}> | </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>tag</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}> | ...</span>
          </div>

        </div>
      );
    }
    
    // For other line types
    const parts = format.split('|');
    const prefixWithFirstField = parts[0].trim(); // "d. word" etc.
    
    // Extract prefix (e.g., "d.") and first field (e.g., "word")
    const prefixMatch = prefixWithFirstField.match(/^([a-z]\.)\s*(.+)$/i);
    const prefix = prefixMatch ? prefixMatch[1] : prefixWithFirstField.split(' ')[0];
    const firstField = prefixMatch ? prefixMatch[2] : (prefixWithFirstField.includes(' ') ? prefixWithFirstField.split(' ').slice(1).join(' ') : '');
    
    const fields = parts.slice(1).map(p => p.trim()); // ["redirect", "context"]
    
    // Check if we're in an extra field beyond expected
    const expectedFieldCount = fieldNames.length;
    const isInExtraField = fieldIndex >= expectedFieldCount;
    
    return (
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: hasTooManyFields ? '1px solid rgba(255, 152, 0, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          color: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        <div> Format: 
          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{prefix} </span>
          {/* First field */}
          <span
            style={{
              textDecoration: fieldIndex === 0 ? 'underline' : 'none',
              textDecorationColor: fieldIndex === 0 ? '#4CAF50' : 'transparent',
              textDecorationThickness: fieldIndex === 0 ? '2px' : '0',
              color: fieldIndex === 0 ? '#4CAF50' : 'rgba(255, 255, 255, 0.9)',
              fontWeight: fieldIndex === 0 ? 600 : 400,
            }}
          >
            {firstField}
          </span>
          {/* Other fields */}
          {fields.map((field, index) => {
            const actualIndex = index + 1; // +1 because first field is index 0
            const isActive = actualIndex === fieldIndex;
            const isExtra = actualIndex >= expectedFieldCount;
            return (
              <span key={index}>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}> | </span>
                <span
                  style={{
                    textDecoration: isActive ? 'underline' : 'none',
                    textDecorationColor: isActive ? (isExtra ? '#FF9800' : '#4CAF50') : 'transparent',
                    textDecorationThickness: isActive ? '2px' : '0',
                    color: isActive 
                      ? (isExtra ? '#FF9800' : '#4CAF50')
                      : (isExtra ? 'rgba(255, 152, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)'),
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {field}
                </span>
              </span>
            );
          })}
          {/* Show extra fields if too many pipes */}
          {hasTooManyFields && (
            <>
              <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}> | </span>
              <span
                style={{
                  textDecoration: isInExtraField ? 'underline' : 'none',
                  textDecorationColor: isInExtraField ? '#FF9800' : 'transparent',
                  textDecorationThickness: isInExtraField ? '2px' : '0',
                  color: '#FF9800',
                  fontWeight: isInExtraField ? 600 : 400,
                }}
              >
                ⚠ extra
              </span>
            </>
          )}
        </div>
        {hasTooManyFields && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#FF9800' }}>
            ⚠ Nur {expectedFieldCount} Feld{expectedFieldCount > 1 ? 'er' : ''} erwartet: {fieldNames.join(', ')}. Zusätzliche Felder werden ignoriert.
          </div>
        )}
      </div>
    );
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
          height: '90vh',
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

        {/* Format Hint */}
        {cursorInfo && renderFormatHint()}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleCursorChange(e);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={handleCursorChange}
          onMouseUp={handleCursorChange}
          onClick={handleCursorChange}
          placeholder={`b. Basewort 1 | base context
c. correct1 | context1 | 0
c. correct2 | context2 | 1
d. distractor1 | redirect1 | context1
s. wikipedia | eine bps ist eine störung bla.....
t. tag1 | tag2 | tag3
l. 1

# Kommentarzeilen werden ignoriert
b. Basewort 2
c. correct1 | context1 | 0
d. distractor1 | redirect1 | context1
t. tag1 | tag2
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

