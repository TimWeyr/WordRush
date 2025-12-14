import { useMemo } from 'react';
import type { Item } from '@/types/content.types';

interface ValidationIssue {
  type: 'error' | 'warning' | 'success';
  itemId: string;
  message: string;
}

interface ValidationPanelProps {
  items: Item[];
  onJumpToItem: (itemId: string) => void;
}

const MAX_CONTEXT_LENGTH = 60;

export function ValidationPanel({ items, onJumpToItem }: ValidationPanelProps) {
  const validation = useMemo(() => {
    const issues: ValidationIssue[] = [];
    const validItems: string[] = [];

    // Check for duplicate IDs
    const idCounts = new Map<string, number>();
    items.forEach(item => {
      const count = idCounts.get(item.id) || 0;
      idCounts.set(item.id, count + 1);
    });

    idCounts.forEach((count, id) => {
      if (count > 1) {
        issues.push({
          type: 'error',
          itemId: id,
          message: `Duplicate ID "${id}" (${count} times)`,
        });
      }
    });

    // Check each item
    items.forEach(item => {
      let hasIssues = false;

      // Check missing base word
      if (!item.base.word || item.base.word.trim() === '') {
        issues.push({
          type: 'error',
          itemId: item.id,
          message: 'Missing base word',
        });
        hasIssues = true;
      }

      // Check correct entries
      if (item.correct.length === 0) {
        issues.push({
          type: 'error',
          itemId: item.id,
          message: 'No correct entries defined',
        });
        hasIssues = true;
      }

      item.correct.forEach((correct, index) => {
        if (!correct.entry.word || correct.entry.word.trim() === '') {
          issues.push({
            type: 'error',
            itemId: item.id,
            message: `Correct entry ${index + 1}: Missing word`,
          });
          hasIssues = true;
        }

        if (correct.context.length > MAX_CONTEXT_LENGTH) {
          issues.push({
            type: 'warning',
            itemId: item.id,
            message: `Correct ${index + 1} context too long (${correct.context.length} chars)`,
          });
        }
      });

      // Check distractors
      if (item.distractors.length < 2) {
        issues.push({
          type: 'warning',
          itemId: item.id,
          message: `Only ${item.distractors.length} distractor(s) (recommend 3+)`,
        });
      }

      item.distractors.forEach((distractor, index) => {
        if (!distractor.entry.word || distractor.entry.word.trim() === '') {
          issues.push({
            type: 'error',
            itemId: item.id,
            message: `Distractor ${index + 1}: Missing word`,
          });
          hasIssues = true;
        }

        if (distractor.context.length > MAX_CONTEXT_LENGTH) {
          issues.push({
            type: 'warning',
            itemId: item.id,
            message: `Distractor ${index + 1} context too long (${distractor.context.length} chars)`,
          });
        }
      });

      // Check for duplicate words within item
      const words = [
        item.base.word,
        ...item.correct.map(c => c.entry.word),
        ...item.distractors.map(d => d.entry.word),
      ].filter(w => w);

      const wordSet = new Set(words.map(w => w?.toLowerCase()));
      if (wordSet.size < words.length) {
        issues.push({
          type: 'warning',
          itemId: item.id,
          message: 'Duplicate words within item',
        });
      }

      // Check visual config
      if (!item.base.visual.color) {
        issues.push({
          type: 'warning',
          itemId: item.id,
          message: 'Base entry missing color',
        });
      }

      // If no issues, mark as valid
      if (!hasIssues) {
        validItems.push(item.id);
      }
    });

    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    return {
      issues,
      validItems,
      errorCount,
      warningCount,
    };
  }, [items]);

  return (
    <div className="editor-validation-panel">
      <div className="editor-validation-title">
        ✅ Validation
      </div>

      <div className="editor-validation-summary">
        <div className="editor-validation-stat">
          <span style={{ color: '#4CAF50' }}>✅ Valid</span>
          <span style={{ fontWeight: 600 }}>{validation.validItems.length}</span>
        </div>
        {validation.warningCount > 0 && (
          <div className="editor-validation-stat">
            <span style={{ color: '#FFC107' }}>⚠️ Warnings</span>
            <span style={{ fontWeight: 600 }}>{validation.warningCount}</span>
          </div>
        )}
        {validation.errorCount > 0 && (
          <div className="editor-validation-stat">
            <span style={{ color: '#f44336' }}>❌ Errors</span>
            <span style={{ fontWeight: 600 }}>{validation.errorCount}</span>
          </div>
        )}
      </div>

      {validation.issues.length > 0 && (
        <>
          <hr style={{ 
            border: 'none', 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
            margin: '1rem 0' 
          }} />

          <div className="editor-validation-issues">
            {validation.issues.slice(0, 20).map((issue, index) => (
              <div key={index} className={`editor-validation-issue ${issue.type}`}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}>
                  <strong>{issue.itemId}</strong>
                  <button
                    className="editor-button small"
                    onClick={() => onJumpToItem(issue.itemId)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    Jump
                  </button>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  {issue.type === 'error' && '❌ '}
                  {issue.type === 'warning' && '⚠️ '}
                  {issue.message}
                </div>
              </div>
            ))}

            {validation.issues.length > 20 && (
              <div style={{ 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.85rem',
                marginTop: '1rem',
              }}>
                +{validation.issues.length - 20} more issues
              </div>
            )}
          </div>
        </>
      )}

      {validation.issues.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem 1rem',
          color: '#4CAF50',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            All items validated!
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.25rem' }}>
            No errors or warnings found.
          </div>
        </div>
      )}
    </div>
  );
}

