import { useState, useMemo, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import type { Item, CorrectEntry, DistractorEntry, Theme } from '@/types/content.types';
import { VisualConfig } from './VisualConfig';
import { SpawnConfig } from './SpawnConfigCompact';
import { randomConfigGenerator } from '@/utils/RandomConfigGenerator';
import { jsonLoader } from '@/infra/utils/JSONLoader';
import { jsonWriter } from '@/infra/utils/JSONWriter';
import { supabaseLoader } from '@/infra/utils/SupabaseLoader';
import { useToast } from '../Toast/ToastContainer';
import { TextParserModal } from './TextParserModal';
import { SearchableDropdown } from './SearchableDropdown';
import { useEditorMobile, useEditorMobileSectionInitiallyOpen } from '@/hooks/useEditorMobile';
import { uploadMediaFileToBucket } from '@/utils/media/uploadContentBucketMedia';

interface DetailViewProps {
  item: Item | null;
  allItems: Item[];
  onItemChange: (item: Item) => void;
  onBack: () => void;
  universeId?: string;
  theme?: Theme | null;
  chapterId?: string;
}

// Removed unused constants
const CONTEXT_EXPANDED_STORAGE_KEY = 'detailView_context_expanded_v1';

const STREETSMARTS_APP_ORIGIN = 'https://streetsmarts.vercel.app';

function streetSmartsItemUrl(itemId: string): string {
  return `${STREETSMARTS_APP_ORIGIN}/?entry=${encodeURIComponent(itemId)}`;
}

const BRACKET_CHIP_STYLE: CSSProperties = {
  padding: '0.05rem 0.35rem',
  borderRadius: '4px',
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'rgba(255,255,255,0.08)',
  fontSize: '0.88em',
};

// ─── Inline markup style constants ───────────────────────────────────────────
// Used by parseInlineContent for WYSIWYG rendering and by serializeInlineContent
// (via data-type attribute) for round-tripping back to source markup.
const GAP_CHIP_STYLE: CSSProperties = {
  borderBottom: '2px dashed rgba(251,191,36,0.7)',
  borderRadius: '2px',
  padding: '0 0.05em',
  background: 'rgba(251,191,36,0.1)',
};
const CODE_INLINE_STYLE: CSSProperties = {
  fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '3px',
  padding: '0.05em 0.3em',
  fontSize: '0.88em',
};
const HIGHLIGHT_STYLE: CSSProperties = {
  background: 'rgba(253,224,71,0.28)',
  borderRadius: '2px',
  padding: '0 0.15em',
};
const ABBR_CHIP_STYLE: CSSProperties = {
  borderBottom: '1px dotted rgba(96,165,250,0.75)',
  cursor: 'help',
  borderRadius: '2px',
  padding: '0 0.05em',
};
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Place the cursor inside a WysiwygContextEditor root at a given source-string offset.
 * Used to restore cursor position after innerHTML is reset on Enter.
 */
function placeCursorAtSourceOffset(root: HTMLElement, srcOffset: number): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Element | null;
  while ((node = walker.nextNode() as Element | null)) {
    if (!(node instanceof HTMLElement)) continue;
    if (!node.hasAttribute('data-sstart')) continue;
    const s0 = parseInt(node.getAttribute('data-sstart')!, 10);
    const slen = parseInt(node.getAttribute('data-slen')!, 10);
    if (srcOffset < s0 || srcOffset > s0 + slen) continue;
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType !== Node.TEXT_NODE) continue;
      const charOff = srcOffset - s0;
      const textLen = (child as Text).nodeValue?.length ?? 0;
      if (charOff > textLen) continue;
      try {
        const range = document.createRange();
        range.setStart(child, charOff);
        range.collapse(true);
        const sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      } catch { /* ignore */ }
      return;
    }
  }
}

/** Map browser selection inside a preview root to source string [start, end).
 *
 * Handles both TEXT_NODE endpoints (char offset) and ELEMENT_NODE endpoints
 * (child-index offset) that browsers produce at styled boundaries or after
 * keyboard/double-click selections.
 */
function getSourceSelectionOffsets(root: HTMLElement | null): { start: number; end: number } | null {
  if (!root) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  /** Source offset for a TEXT_NODE + char position within it. */
  const textNodeSrcOff = (node: Text, charOff: number): number | null => {
    let el: HTMLElement | null = node.parentElement;
    while (el && el !== root && !el.hasAttribute('data-sstart')) el = el.parentElement;
    if (!el || !el.hasAttribute('data-sstart')) return null;
    const s0 = parseInt(el.getAttribute('data-sstart')!, 10);
    const slen = parseInt(el.getAttribute('data-slen')!, 10);
    if (charOff < 0 || charOff > slen) return null;
    return s0 + charOff;
  };

  /** Deepest first text node inside a subtree. */
  const firstText = (node: Node): Text | null => {
    if (node.nodeType === Node.TEXT_NODE) return node as Text;
    for (let i = 0; i < node.childNodes.length; i++) {
      const t = firstText(node.childNodes[i]);
      if (t) return t;
    }
    return null;
  };

  /** Deepest last text node inside a subtree. */
  const lastText = (node: Node): Text | null => {
    if (node.nodeType === Node.TEXT_NODE) return node as Text;
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const t = lastText(node.childNodes[i]);
      if (t) return t;
    }
    return null;
  };

  /**
   * Resolve a (node, domOffset) pair:
   * - TEXT_NODE  → charOffset within text node
   * - ELEMENT    → domOffset is a child-index boundary;
   *               use end of (domOffset-1)-th child or start of subtree for 0
   */
  const offsetFor = (node: Node, domOff: number): number | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return textNodeSrcOff(node as Text, domOff);
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (domOff === 0) {
        const t = firstText(node);
        return t ? textNodeSrcOff(t, 0) : null;
      }
      // after the (domOff-1)-th child — use last text in that child at its end
      const child = node.childNodes[domOff - 1] ?? node.childNodes[node.childNodes.length - 1];
      if (!child) return null;
      const t = lastText(child);
      if (!t) return null;
      return textNodeSrcOff(t, t.nodeValue?.length ?? 0);
    }
    return null;
  };

  const a = offsetFor(range.startContainer, range.startOffset);
  const b = offsetFor(range.endContainer, range.endOffset);
  if (a === null || b === null) return null;
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

/** Gemeinsame Markup-Regeln (WordRush + streetsmarts): *+ / *- — kein *kursiv* an dieser Stelle */
function isSharedListMarkerAt(line: string, i: number): boolean {
  if (line[i] !== '*') return false;
  if (line.startsWith('**', i)) return false;
  let j = i + 1;
  while (j < line.length && (line[j] === '+' || line[j] === '-')) j++;
  if (j === i + 1) return false;
  return j < line.length && /\s/.test(line[j]);
}

/** *+ / *- / *++ … oder Legacy *␠ — gleiche Syntax in beiden Projekten */
function isListLine(line: string): boolean {
  return /^\s*\*(\++|-+)\s+/.test(line) || /^\s*\*\s+/.test(line);
}

function parseInlineContent(line: string, baseOffset: number, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < line.length) {
    // {Lückentext} — gap; inner content parsed recursively
    if (line[i] === '{') {
      const close = line.indexOf('}', i + 1);
      if (close !== -1) {
        const inner = line.slice(i + 1, close);
        const innerStart = baseOffset + i + 1;
        out.push(
          <span key={`${keyPrefix}-gap-${k++}`} data-type="gap" style={GAP_CHIP_STYLE}>
            {parseInlineContent(inner, innerStart, `${keyPrefix}-gi${k}`)}
          </span>
        );
        i = close + 1;
        continue;
      }
    }
    // (term)[Expansion] — abbreviation; term parsed recursively
    if (line[i] === '(') {
      const closeParen = line.indexOf(')', i + 1);
      if (closeParen !== -1 && line[closeParen + 1] === '[') {
        const closeBracket = line.indexOf(']', closeParen + 2);
        if (closeBracket !== -1) {
          const term = line.slice(i + 1, closeParen);
          const expansion = line.slice(closeParen + 2, closeBracket);
          const termStart = baseOffset + i + 1;
          out.push(
            <span
              key={`${keyPrefix}-abbr-${k++}`}
              data-type="abbr"
              data-expansion={expansion}
              style={ABBR_CHIP_STYLE}
              title={expansion}
            >
              {parseInlineContent(term, termStart, `${keyPrefix}-at${k}`)}
            </span>
          );
          i = closeBracket + 1;
          continue;
        }
      }
    }
    // ==Highlight==
    if (line.startsWith('==', i)) {
      const close = line.indexOf('==', i + 2);
      if (close !== -1) {
        const inner = line.slice(i + 2, close);
        const innerStart = baseOffset + i + 2;
        out.push(
          <mark key={`${keyPrefix}-hl-${k++}`} data-type="highlight" style={HIGHLIGHT_STYLE} data-sstart={innerStart} data-slen={inner.length}>
            {inner}
          </mark>
        );
        i = close + 2;
        continue;
      }
    }
    // `inline code`
    if (line[i] === '`') {
      const close = line.indexOf('`', i + 1);
      if (close !== -1 && close > i + 1) {
        const inner = line.slice(i + 1, close);
        const innerStart = baseOffset + i + 1;
        out.push(
          <code key={`${keyPrefix}-cd-${k++}`} data-type="code" style={CODE_INLINE_STYLE} data-sstart={innerStart} data-slen={inner.length}>
            {inner}
          </code>
        );
        i = close + 1;
        continue;
      }
    }
    // **bold**
    if (line.startsWith('**', i)) {
      const close = line.indexOf('**', i + 2);
      if (close !== -1) {
        const inner = line.slice(i + 2, close);
        const innerStart = baseOffset + i + 2;
        out.push(
          <strong key={`${keyPrefix}-b-${k++}`}>
            <span data-sstart={innerStart} data-slen={inner.length}>{inner}</span>
          </strong>
        );
        i = close + 2;
        continue;
      }
    }
    // *italic* (nicht *+ / *- Listenmarker)
    if (line[i] === '*' && !line.startsWith('**', i) && !isSharedListMarkerAt(line, i)) {
      const close = line.indexOf('*', i + 1);
      if (close !== -1 && close > i + 1) {
        const inner = line.slice(i + 1, close);
        if (!inner.includes('*') && !inner.includes('\n')) {
          const innerStart = baseOffset + i + 1;
          out.push(
            <em key={`${keyPrefix}-em-${k++}`}>
              <span data-sstart={innerStart} data-slen={inner.length}>{inner}</span>
            </em>
          );
          i = close + 1;
          continue;
        }
      }
    }
    // [Erklär-Chip]
    if (line[i] === '[') {
      const close = line.indexOf(']', i + 1);
      if (close !== -1) {
        const inner = line.slice(i + 1, close);
        const innerStart = baseOffset + i + 1;
        out.push(
          <span key={`${keyPrefix}-br-${k++}`} data-type="bracket" style={BRACKET_CHIP_STYLE} data-sstart={innerStart} data-slen={inner.length}>
            {inner}
          </span>
        );
        i = close + 1;
        continue;
      }
    }
    // Plain text run — advance until next possible markup start
    let j = i + 1;
    while (j < line.length) {
      const ch = line[j];
      if (ch === '{') break;
      if (ch === '(') {
        const cp = line.indexOf(')', j + 1);
        if (cp !== -1 && line[cp + 1] === '[') break;
      }
      if (line.startsWith('==', j)) break;
      if (ch === '`') break;
      if (line.startsWith('**', j)) break;
      if (ch === '[') break;
      if (ch === '*' && !line.startsWith('**', j)) {
        if (isSharedListMarkerAt(line, j)) break;
        const close = line.indexOf('*', j + 1);
        if (close !== -1 && close > j + 1) {
          const inner = line.slice(j + 1, close);
          if (!inner.includes('*') && !inner.includes('\n')) break;
        }
      }
      j++;
    }
    const run = line.slice(i, j);
    out.push(
      <span key={`${keyPrefix}-pl-${k++}`} data-sstart={baseOffset + i} data-slen={run.length}>{run}</span>
    );
    i = j;
  }
  return out;
}

function renderBulletLine(line: string, lineStart: number, keyPrefix: string): ReactNode {
  const sm = line.match(/^(\s*)(\*(\++|-+))(\s+)(.*)$/);
  if (sm) {
    const [, indent, marker, , sp, rest] = sm;
    const isOrdered = /-/.test(marker);
    const glyph = isOrdered ? '1.' : '•';
    const indentLen = indent.length;
    const markerStart = lineStart + indentLen;
    const contentOffset = lineStart + indent.length + marker.length + sp.length;
    return (
      <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start' }}>
        {indent ? (
          <span data-sstart={lineStart} data-slen={indent.length}>{indent}</span>
        ) : null}
        <span
          data-marker={marker}
          style={{ color: 'rgba(126,212,255,0.95)', flexShrink: 0 }}
          data-sstart={markerStart}
          data-slen={marker.length}
        >
          {glyph}
        </span>
        {sp ? (
          <span data-sstart={markerStart + marker.length} data-slen={sp.length}>{sp}</span>
        ) : null}
        <span style={{ flex: 1, minWidth: 0 }}>{parseInlineContent(rest, contentOffset, keyPrefix)}</span>
      </span>
    );
  }
  const legacy = line.match(/^(\s*\*\s+)(.*)$/);
  if (!legacy) {
    return <>{parseInlineContent(line, lineStart, keyPrefix)}</>;
  }
  const prefix = legacy[1];
  const rest = legacy[2];
  const starIdxInPrefix = prefix.indexOf('*');
  const beforeStar = prefix.slice(0, starIdxInPrefix);
  const afterStar = prefix.slice(starIdxInPrefix + 1);
  return (
    <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start' }}>
      {beforeStar ? (
        <span data-sstart={lineStart} data-slen={beforeStar.length}>{beforeStar}</span>
      ) : null}
      <span
        data-marker="*"
        style={{ color: 'rgba(126,212,255,0.95)', flexShrink: 0 }}
        data-sstart={lineStart + starIdxInPrefix}
        data-slen={1}
      >
        •
      </span>
      {afterStar ? (
        <span data-sstart={lineStart + starIdxInPrefix + 1} data-slen={afterStar.length}>{afterStar}</span>
      ) : null}
      <span style={{ flex: 1, minWidth: 0 }}>{parseInlineContent(rest, lineStart + prefix.length, keyPrefix)}</span>
    </span>
  );
}

function buildContextPreviewRich(text: string, collapsed: boolean, keyPrefix: string): ReactNode {
  const normalized = text.replace(/\\n/g, '\n');
  const lines: { line: string; start: number }[] = [];
  let pos = 0;
  const parts = normalized.split('\n');
  for (let i = 0; i < parts.length; i++) {
    lines.push({ line: parts[i], start: pos });
    pos += parts[i].length + (i < parts.length - 1 ? 1 : 0);
  }

  if (collapsed) {
    const first = lines[0]?.line ?? '';
    const firstStart = lines[0]?.start ?? 0;
    const isBullet = isListLine(first);
    const isH2c = first.startsWith('## ');
    const isH1c = !isH2c && first.startsWith('# ');
    const displayLine = isH2c ? first.slice(3) : isH1c ? first.slice(2) : first;
    const displayStart = isH2c ? firstStart + 3 : isH1c ? firstStart + 2 : firstStart;
    return (
      <div
        data-block-type={isH2c ? 'h2' : isH1c ? 'h1' : undefined}
        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {isBullet && !isH1c && !isH2c
          ? renderBulletLine(first, firstStart, `${keyPrefix}-c`)
          : <>{parseInlineContent(displayLine, displayStart, `${keyPrefix}-c`)}</>}
      </div>
    );
  }

  const blocks: ReactNode[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const { line, start } = lines[idx];
    if (idx > 0) {
      const nlAt = lines[idx - 1].start + lines[idx - 1].line.length;
      blocks.push(
        <span key={`${keyPrefix}-nl-${idx}`} data-sstart={nlAt} data-slen={1}>{'\n'}</span>
      );
    }
    const isH2 = line.startsWith('## ');
    const isH1 = !isH2 && line.startsWith('# ');
    const isBullet = !isH1 && !isH2 && isListLine(line);
    if (isH2) {
      blocks.push(
        <div key={`${keyPrefix}-ln-${idx}`} data-block-type="h2" className="ctx-h2">
          {parseInlineContent(line.slice(3), start + 3, `${keyPrefix}-l${idx}`)}
        </div>
      );
    } else if (isH1) {
      blocks.push(
        <div key={`${keyPrefix}-ln-${idx}`} data-block-type="h1" className="ctx-h1">
          {parseInlineContent(line.slice(2), start + 2, `${keyPrefix}-l${idx}`)}
        </div>
      );
    } else {
      blocks.push(
        <div key={`${keyPrefix}-ln-${idx}`}>
          {isBullet ? renderBulletLine(line, start, `${keyPrefix}-l${idx}`) : parseInlineContent(line, start, `${keyPrefix}-l${idx}`)}
        </div>
      );
    }
  }
  return <div style={{ whiteSpace: 'pre-wrap' }}>{blocks}</div>;
}

/** True if value looks like a web URL (http(s) or www…) — „URL öffnen“ anzeigen */
function isUrlOpenable(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  return /^https?:\/\//i.test(t) || /^www\./i.test(t);
}

function openUrlFromSource(raw: string): void {
  const t = raw.trim();
  if (!t) return;
  let url = t;
  if (/^www\./i.test(t)) url = `https://${t}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Meta `meta.source`: mehrere Einträge, getrennt durch `|` (URLs oder Freitext). */
function splitMetaSourcePipe(raw: string): string[] {
  const s = raw ?? '';
  if (!s.trim()) return [''];
  return s.split('|').map((p) => p.trim());
}

function joinMetaSourcePipe(lines: string[]): string {
  return lines.map((x) => x.trim()).filter((x) => x.length > 0).join('|');
}

function countMetaSources(raw: string): number {
  return splitMetaSourcePipe(raw).filter((x) => x.trim()).length;
}

/** Serialize WYSIWYG DOM (from buildContextPreviewRich / browser edits) back to source string */
function isBracketChipSpan(el: HTMLElement): boolean {
  // Legacy detection: spans with border style that don't have a data-type (old content)
  const dtype = el.getAttribute('data-type');
  if (dtype) return dtype === 'bracket';
  const st = el.getAttribute('style') || '';
  return el.tagName === 'SPAN' && st.includes('border') && st.includes('1px');
}

function serializeInlineContent(el: HTMLElement): string {
  let s = '';
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      s += child.textContent ?? '';
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const node = child as HTMLElement;
    const dtype = node.getAttribute('data-type');

    if (node.tagName === 'STRONG') { s += '**' + serializeInlineContent(node) + '**'; continue; }
    if (node.tagName === 'EM') { s += '*' + serializeInlineContent(node) + '*'; continue; }
    if (node.tagName === 'MARK') { s += '==' + (node.textContent ?? '') + '=='; continue; }
    if (node.tagName === 'CODE') { s += '`' + (node.textContent ?? '') + '`'; continue; }
    if (node.tagName === 'SPAN') {
      if (dtype === 'gap') { s += '{' + serializeInlineContent(node) + '}'; }
      else if (dtype === 'abbr') {
        const exp = node.getAttribute('data-expansion') ?? '';
        s += '(' + serializeInlineContent(node) + ')[' + exp + ']';
      } else if (isBracketChipSpan(node)) { s += '[' + (node.textContent ?? '') + ']'; }
      else { s += node.textContent ?? ''; }
      continue;
    }
    if (node.tagName === 'BR') { s += '\n'; continue; }
    s += node.textContent ?? '';
  }
  return s;
}

function serializeBulletLine(el: HTMLElement): string {
  const children = Array.from(el.children).filter((c) => c.tagName === 'SPAN') as HTMLElement[];
  let s = '';
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    const dm = c.getAttribute('data-marker');
    if (dm) {
      s += dm;
      const next = children[i + 1];
      if (next && /^\s+$/.test(next.textContent ?? '')) {
        s += next.textContent ?? '';
        i++;
      } else {
        s += ' ';
      }
      continue;
    }
    const t = c.textContent ?? '';
    if (t === '•') {
      s += '*';
      continue;
    }
    const style = c.getAttribute('style') || '';
    if (style.includes('flex') && (style.includes('min-width: 0') || style.includes('flex: 1'))) {
      s += serializeInlineContent(c);
    } else {
      s += t;
    }
  }
  return s;
}

function serializeLineDiv(div: HTMLElement): string {
  const flexBullet = Array.from(div.children).find(
    (c) => c.tagName === 'SPAN' && (c as HTMLElement).style.display === 'flex'
  ) as HTMLElement | undefined;
  if (flexBullet) {
    return serializeBulletLine(flexBullet);
  }
  return serializeInlineContent(div);
}

function serializeExpandedRoot(inner: HTMLElement): string {
  let out = '';
  for (const child of Array.from(inner.children)) {
    if (child.tagName === 'SPAN' && child.textContent === '\n') { out += '\n'; continue; }
    if (child.tagName === 'DIV') {
      const blockType = (child as HTMLElement).getAttribute('data-block-type');
      if (blockType === 'h1') out += '# ' + serializeLineDiv(child as HTMLElement);
      else if (blockType === 'h2') out += '## ' + serializeLineDiv(child as HTMLElement);
      else out += serializeLineDiv(child as HTMLElement);
      continue;
    }
    if (child.tagName === 'BR') { out += '\n'; }
  }
  return out;
}

function serializeFirstLineBlock(lineDiv: HTMLElement): string {
  const blockType = lineDiv.getAttribute('data-block-type');
  const prefix = blockType === 'h1' ? '# ' : blockType === 'h2' ? '## ' : '';
  const flexBullet = lineDiv.querySelector(':scope > span[style*="display: flex"]') as HTMLElement | null;
  if (flexBullet) return prefix + serializeBulletLine(flexBullet);
  return prefix + serializeInlineContent(lineDiv);
}

function serializeWysiwygDomToSource(root: HTMLElement): string {
  const trimmed = root.textContent?.replace(/\u00a0/g, ' ') ?? '';
  if (!trimmed.trim()) return '';

  const first = root.firstElementChild as HTMLElement | null;
  const st = first?.getAttribute('style') || '';

  if (!first || first.tagName === 'BR') {
    // Browser-native structure when typing into empty <br> field:
    // Chrome places text as a direct child text node (no wrapper element).
    // Fall back to reading inline content so the typed text is not erased.
    return serializeInlineContent(root);
  }

  if (st.includes('nowrap') || st.includes('text-overflow')) {
    // Our collapsed single-line wrapper
    return serializeFirstLineBlock(first);
  }

  if (st.includes('pre-wrap') || st.includes('white-space')) {
    // Our expanded multi-line wrapper (white-space: pre-wrap)
    return serializeExpandedRoot(first);
  }

  // Browser-created wrapper div without style (e.g. Chrome wraps typing in <div>text</div>).
  // serializeExpandedRoot would miss bare text nodes; read inline content instead.
  return serializeInlineContent(root);
}

function renderContextPreviewHtml(text: string, collapsed: boolean, keyPrefix: string): string {
  const normalized = (text || '').replace(/\\n/g, '\n');
  if (!normalized.length) {
    return '';
  }
  return renderToString(<>{buildContextPreviewRich(normalized, collapsed, keyPrefix)}</>);
}

interface WysiwygContextEditorProps {
  value: string;
  path: string;
  collapsed: boolean;
  keyPrefix: string;
  placeholder: string;
  itemId: string;
  minHeightExpanded: string;
  minHeightCollapsed: string;
  onValueChange: (path: string, next: string) => void;
  onWysiwygKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, path: string) => void;
  setPreviewRef: (el: HTMLDivElement | null) => void;
  onActivate?: () => void;
  /** Called synchronously after innerHTML is reset, so cursor can be restored. */
  onDidSetInnerHTML?: (el: HTMLDivElement) => void;
}

function WysiwygContextEditor({
  value,
  path,
  collapsed,
  keyPrefix,
  placeholder,
  itemId,
  minHeightExpanded,
  minHeightCollapsed,
  onValueChange,
  onWysiwygKeyDown,
  setPreviewRef,
  onActivate,
  onDidSetInnerHTML,
}: WysiwygContextEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedRef = useRef<string | null>(null);
  const prevItemIdRef = useRef(itemId);
  // Keep a ref to the latest callback so the effect doesn't re-run just because
  // a new function reference is passed every render — that would reset innerHTML
  // and erase unsaved (React-state-batched) user input.
  const onDidSetInnerHTMLRef = useRef(onDidSetInnerHTML);
  useLayoutEffect(() => { onDidSetInnerHTMLRef.current = onDidSetInnerHTML; });

  useLayoutEffect(() => {
    if (itemId !== prevItemIdRef.current) {
      prevItemIdRef.current = itemId;
      lastEmittedRef.current = null;
    }
  }, [itemId]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const normalized = (value || '').replace(/\\n/g, '\n');
    if (normalized !== lastEmittedRef.current) {
      lastEmittedRef.current = normalized;
      const html = renderContextPreviewHtml(normalized, collapsed, keyPrefix);
      el.innerHTML = html || `<br />`;
      if (!normalized.length) {
        el.setAttribute('data-placeholder', placeholder);
      } else {
        el.removeAttribute('data-placeholder');
      }
      onDidSetInnerHTMLRef.current?.(el);
    }
  // onDidSetInnerHTML intentionally excluded: we use the ref above so the effect
  // doesn't re-run (and reset innerHTML) just because the parent re-renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, collapsed, keyPrefix, placeholder, itemId]);

  const handleInput = () => {
    const el = rootRef.current;
    if (!el) return;
    el.removeAttribute('data-placeholder');
    const next = serializeWysiwygDomToSource(el);
    if (next === '') {
      el.innerHTML = '<br />';
      el.setAttribute('data-placeholder', placeholder);
      if (lastEmittedRef.current !== '') {
        lastEmittedRef.current = '';
        onValueChange(path, '');
      }
      return;
    }
    if (next !== lastEmittedRef.current) {
      lastEmittedRef.current = next;
      onValueChange(path, next);
    }
  };

  const setRef = (el: HTMLDivElement | null) => {
    rootRef.current = el;
    setPreviewRef(el);
  };

  return (
    <div
      ref={setRef}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className="editor-form-textarea editor-context-wysiwyg-root"
      onInput={handleInput}
      onKeyDown={(e) => onWysiwygKeyDown(e, path)}
      onFocus={() => onActivate?.()}
      onMouseUp={() => onActivate?.()}
      data-path={path}
      style={{
        flex: 1,
        minHeight: collapsed ? minHeightCollapsed : minHeightExpanded,
        maxHeight: collapsed ? minHeightCollapsed : 'none',
        padding: '0.6rem 0.75rem',
        lineHeight: 1.45,
        overflow: collapsed ? 'hidden' : 'auto',
        overflowWrap: 'anywhere',
        cursor: 'text',
        outline: 'none',
      }}
    />
  );
}

export function DetailView({ item, allItems, onItemChange, onBack, universeId, theme, chapterId }: DetailViewProps) {
  const [localItem, setLocalItem] = useState<Item | null>(item);
  const [relatedSearch, setRelatedSearch] = useState('');
  const [allThemeTags, setAllThemeTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTextParserModal, setShowTextParserModal] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagSuggestionsRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Filter states for Related Items
  const [selectedFilterTheme, setSelectedFilterTheme] = useState<string>(theme?.id || '');
  const [selectedFilterChapter, setSelectedFilterChapter] = useState<string>(chapterId || '');
  const [filteredItems, setFilteredItems] = useState<Item[]>(allItems);
  const [contextViewMode, setContextViewMode] = useState<'raw' | 'edited'>('raw');
  const [contextsExpanded, setContextsExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(CONTEXT_EXPANDED_STORAGE_KEY) !== '0';
  });
  const contextTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const contextPreviewRefs = useRef<Record<string, HTMLDivElement | null>>({});
  /** Pending cursor restore after innerHTML reset triggered by Enter key. */
  const wysiwygPendingCursorRef = useRef<{ path: string; offset: number } | null>(null);
  const [activeContextRefKey, setActiveContextRefKey] = useState<string>('baseContext');

  const isMobileDetail = useEditorMobile();
  const [mediaSectionOpen, setMediaSectionOpen] = useState(() => useEditorMobileSectionInitiallyOpen());
  const [moveSectionOpen, setMoveSectionOpen] = useState(() => useEditorMobileSectionInitiallyOpen());
  const [relatedSectionOpen, setRelatedSectionOpen] = useState(() => useEditorMobileSectionInitiallyOpen());
  const [metaSectionOpen, setMetaSectionOpen] = useState(() => useEditorMobileSectionInitiallyOpen());
  /** Desktop: Visual/Spawn standard eingeklappt; Mobil unverändert per Toggle. */
  const [visualSectionOpen, setVisualSectionOpen] = useState(false);

  const [mobileSourceModal, setMobileSourceModal] = useState<{
    kind: 'correct' | 'distractor';
    index: number;
    draft: string;
  } | null>(null);

  const [mobileDetailsModal, setMobileDetailsModal] = useState<{
    kind: 'correct' | 'distractor';
    index: number;
    draft: string;
  } | null>(null);

  /** Mehrere Quellen für `meta.source` (Pipe-getrennt), Desktop + Mobil */
  const [metaSourcesModal, setMetaSourcesModal] = useState<string[] | null>(null);

  useEffect(() => {
    const expanded = !isMobileDetail;
    setMediaSectionOpen(expanded);
    setMoveSectionOpen(expanded);
    setRelatedSectionOpen(expanded);
    setMetaSectionOpen(expanded);
  }, [isMobileDetail]);

  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    if (!contextsExpanded) {
      textarea.style.height = '38px';
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);
  const [selectedFilterThemeObj, setSelectedFilterThemeObj] = useState<Theme | null>(theme || null);

  // Move/Copy states
  const [moveTargetTheme, setMoveTargetTheme] = useState<string>(theme?.id || '');
  const [moveTargetChapter, setMoveTargetChapter] = useState<string>(chapterId || '');
  const [moveTargetThemeObj, setMoveTargetThemeObj] = useState<Theme | null>(theme || null);
  const [moveAvailableChapters, setMoveAvailableChapters] = useState<string[]>([]);
  const [moveInProgress, setMoveInProgress] = useState(false);

  // Update local item when prop changes
  if (item && localItem?.id !== item.id) {
    setLocalItem(item);
  }

  const handleFieldChange = (path: string, value: any) => {
    if (!localItem) return;

    const newItem = { ...localItem };
    const parts = path.split('.');
    
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

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  /** Storage-Pfad = Editor-URL: /editor/{universe}/{theme}/{chapter}/{itemId} → media-Bucket gleiche Segmente */
  const [uploadingMediaField, setUploadingMediaField] = useState<string | null>(null);

  const uploadMediaForCurrentItem = async (file: File, applyPath: string) => {
    if (!localItem) return;
    if (!universeId || !chapterId || !theme?.id) {
      showToast(
        '❌ Universe, Theme und Chapter werden für den Storage-Pfad benötigt (URL wie /editor/…/…/…/ItemId).',
        'error'
      );
      return;
    }
    setUploadingMediaField(applyPath);
    try {
      const { publicUrl } = await uploadMediaFileToBucket(file, {
        universeId,
        themeId: theme.id,
        chapterId,
        contentId: localItem.id,
      });
      handleFieldChange(applyPath, publicUrl);
      showToast('✅ Hochgeladen · URL gesetzt', 'success');
    } catch (e) {
      showToast(`❌ Upload: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setUploadingMediaField(null);
    }
  };

  const openImageFilePicker = (applyPath: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: Event) => {
      const f = (event.target as HTMLInputElement)?.files?.[0];
      if (f) void uploadMediaForCurrentItem(f, applyPath);
    };
    input.click();
  };

  type InlineKind =
    | 'bold'
    | 'italic'
    | 'brackets'
    | 'list'
    | 'listOrdered'
    | 'newline'
    | 'gap'
    | 'code'
    | 'highlight';
  type ToolbarKind = InlineKind | 'abbr' | 'h1' | 'h2';

  /** Listenzeilen-Präfix entfernen (*+ / *- / Legacy * ) — gemeinsame Syntax */
  const stripListLinePrefix = (line: string) => line.replace(/^\s*\*(\++|-+)?\s*/, '');

  const computeContextInsert = (selected: string, kind: InlineKind): string => {
    if (kind === 'bold') return `**${selected || ''}**`;
    if (kind === 'italic') return `*${selected || ''}*`;
    if (kind === 'brackets') return `[${selected || ''}]`;
    if (kind === 'gap') return `{${selected || ''}}`;
    if (kind === 'code') return `\`${selected || ''}\``;
    if (kind === 'highlight') return `==${selected || ''}==`;
    if (kind === 'newline') return `${selected}\\n`;
    if (kind === 'list') {
      if (!selected) return '*+ ';
      return selected.split('\n').map((l) => `*+ ${stripListLinePrefix(l)}`).join('\n');
    }
    if (kind === 'listOrdered') {
      if (!selected) return '*- ';
      return selected.split('\n').map((l) => `*- ${stripListLinePrefix(l)}`).join('\n');
    }
    return selected;
  };

  const applyContextFormatAtOffsets = (
    path: string,
    currentValue: string,
    start: number,
    end: number,
    kind: InlineKind
  ) => {
    const selected = currentValue.slice(start, end);
    const insert = computeContextInsert(selected, kind);
    handleFieldChange(path, currentValue.slice(0, start) + insert + currentValue.slice(end));
  };

  const applyContextFormat = (
    path: string,
    currentValue: string,
    textarea: HTMLTextAreaElement,
    kind: InlineKind
  ) => {
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = currentValue.slice(start, end);
    const insert = computeContextInsert(selected, kind);
    handleFieldChange(path, currentValue.slice(0, start) + insert + currentValue.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insert.length, start + insert.length);
      autoResizeTextarea(textarea);
    });
  };

  /** Toggle H1/H2 at the start of the current line (cursor-based). */
  const applyHeadingToggle = (path: string, currentValue: string, cursorPos: number, level: 1 | 2) => {
    const lineStart = currentValue.lastIndexOf('\n', cursorPos - 1) + 1;
    const lineEnd = currentValue.indexOf('\n', lineStart);
    const line = currentValue.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    let newLine: string;
    if (line.startsWith('## ')) {
      newLine = level === 2 ? line.slice(3) : '# ' + line.slice(3);
    } else if (line.startsWith('# ')) {
      newLine = level === 1 ? line.slice(2) : '## ' + line.slice(2);
    } else {
      newLine = (level === 1 ? '# ' : '## ') + line;
    }
    const end = lineEnd === -1 ? currentValue.length : lineEnd;
    handleFieldChange(path, currentValue.slice(0, lineStart) + newLine + currentValue.slice(end));
  };

  const handleContextKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>,
    path: string,
    currentValue: string
  ) => {
    if (!e.ctrlKey) return;
    const key = e.key.toLowerCase();
    const validKeys = ['f', 'k', 'h', 'g', 'e', 'm'];
    if (!validKeys.includes(key)) return;
    e.preventDefault();

    const kindMap: Record<string, InlineKind> = {
      f: 'bold', k: 'italic', h: 'brackets', g: 'gap', e: 'highlight', m: 'code',
    };
    const kind = kindMap[key];

    if (e.currentTarget instanceof HTMLTextAreaElement) {
      // Use textarea.value (DOM) — avoids stale React state causing text loss
      // The `currentValue` parameter is intentionally ignored here for the same reason
      applyContextFormat(path, e.currentTarget.value, e.currentTarget, kind);
      return;
    }
    const mapped = getSourceSelectionOffsets(e.currentTarget);
    if (!mapped) return;
    applyContextFormatAtOffsets(path, currentValue, mapped.start, mapped.end, kind);
  };

  /** Context + Details (gleiche Mini-Markup-Logik wie Context) */
  const getRichTextFieldByPath = (path: string): string => {
    if (!localItem) return '';
    if (path === 'base.context') return localItem.base.context || '';

    const correctMatch = path.match(/^correct\[(\d+)\]\.(context|details)$/);
    if (correctMatch) {
      const index = Number(correctMatch[1]);
      const field = correctMatch[2] as 'context' | 'details';
      const row = localItem.correct[index];
      if (!row) return '';
      return field === 'context' ? row.context || '' : row.details || '';
    }

    const distractorMatch = path.match(/^distractors\[(\d+)\]\.(context|details)$/);
    if (distractorMatch) {
      const index = Number(distractorMatch[1]);
      const field = distractorMatch[2] as 'context' | 'details';
      const row = localItem.distractors[index];
      if (!row) return '';
      return field === 'context' ? row.context || '' : row.details || '';
    }

    return '';
  };

  /**
   * Normalize raw field value for WYSIWYG toolbar operations.
   * data-sstart offsets are calculated from the normalized string (\\n → \n),
   * so we must slice the normalized version. Saving it back is safe because
   * buildContextPreviewRich handles both \\n and \n equivalently.
   */
  const getWysiwygNormalizedValue = (path: string): string =>
    getRichTextFieldByPath(path).replace(/\\n/g, '\n');

  /**
   * Fallback offset detection via range.toString() text search.
   * Covers cases where data-sstart walking fails (e.g. complex bullet DOM nesting).
   */
  const getFallbackSelectionOffsets = (
    root: HTMLElement | null,
    normalizedSource: string
  ): { start: number; end: number } | null => {
    if (!root) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (range.collapsed || !root.contains(range.commonAncestorContainer)) return null;
    const text = range.toString();
    if (!text) return null;
    const idx = normalizedSource.indexOf(text);
    if (idx === -1) return null;
    return { start: idx, end: idx + text.length };
  };

  const handleWysiwygKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, path: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Read from DOM directly — avoids stale React state when user just typed something
      const domValue = serializeWysiwygDomToSource(e.currentTarget);
      const currentValue = domValue || getWysiwygNormalizedValue(path);
      const mapped = getSourceSelectionOffsets(e.currentTarget);
      const start = mapped?.start ?? currentValue.length;
      const end = mapped?.end ?? currentValue.length;
      const next = currentValue.slice(0, start) + '\n' + currentValue.slice(end);
      wysiwygPendingCursorRef.current = { path, offset: start + 1 };
      handleFieldChange(path, next);
      return;
    }
    // For other keys: also use fresh DOM value to avoid stale state
    const domValue = serializeWysiwygDomToSource(e.currentTarget);
    handleContextKeyDown(e, path, domValue || getWysiwygNormalizedValue(path));
  };

  /**
   * Get the freshest available value for a WYSIWYG field.
   * Reads directly from the current DOM (bypasses React state batching) so
   * toolbar operations always work on what's actually visible, not a stale state snapshot.
   */
  const getWysiwygFreshValue = (refKey: string, path: string): string => {
    const previewEl = contextPreviewRefs.current[refKey];
    if (previewEl) {
      const dom = serializeWysiwygDomToSource(previewEl);
      if (dom) return dom;
    }
    return getWysiwygNormalizedValue(path);
  };

  const applyToolbarToContext = (path: string, refKey: string, kind: ToolbarKind) => {
    setActiveContextRefKey(refKey);

    const previewEl = contextPreviewRefs.current[refKey];
    const textarea = contextTextareaRefs.current[refKey];

    // Helper: get fresh value from DOM (bypasses React state batching for both modes)
    const getFreshCurrentValue = () =>
      textarea ? textarea.value : getWysiwygFreshValue(refKey, path);

    // ── Block operations (H1 / H2) ───────────────────────────────────────────
    if (kind === 'h1' || kind === 'h2') {
      const currentValue = getFreshCurrentValue();
      let cursorPos = currentValue.length;
      if (textarea) {
        cursorPos = textarea.selectionStart ?? currentValue.length;
      } else {
        const mapped = getSourceSelectionOffsets(previewEl) ?? getFallbackSelectionOffsets(previewEl, currentValue);
        if (mapped) cursorPos = mapped.start;
      }
      applyHeadingToggle(path, currentValue, cursorPos, kind === 'h1' ? 1 : 2);
      return;
    }

    // ── Abbreviation ─────────────────────────────────────────────────────────
    // IMPORTANT: save selection and content BEFORE window.prompt() steals focus
    // (the dialog moves focus away and loses the browser text selection).
    if (kind === 'abbr') {
      const currentValue = getFreshCurrentValue();
      if (textarea) {
        const s = textarea.selectionStart ?? currentValue.length;
        const e = textarea.selectionEnd ?? currentValue.length;
        const term = currentValue.slice(s, e) || 'Begriff';
        const expansion = window.prompt('Langform / Erklärung (Tooltip):');
        if (expansion === null) return;
        // Re-read after prompt — textarea.value is the authoritative DOM value
        const freshValue = textarea.value;
        const insert = `(${term})[${expansion}]`;
        const safeS = Math.min(s, freshValue.length);
        const safeE = Math.min(e, freshValue.length);
        handleFieldChange(path, freshValue.slice(0, safeS) + insert + freshValue.slice(safeE));
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(safeS + insert.length, safeS + insert.length);
        });
        return;
      }
      // WYSIWYG: read DOM value + selection BEFORE prompt
      const savedMapped =
        getSourceSelectionOffsets(previewEl) ?? getFallbackSelectionOffsets(previewEl, currentValue);
      const s = savedMapped?.start ?? currentValue.length;
      const e = savedMapped?.end ?? currentValue.length;
      const term = currentValue.slice(s, e) || 'Begriff';

      const expansion = window.prompt('Langform / Erklärung (Tooltip):');
      if (expansion === null) return;

      // Re-read DOM after prompt
      const freshValue = getWysiwygFreshValue(refKey, path);
      const insert = `(${term})[${expansion}]`;
      const safeS = Math.min(s, freshValue.length);
      const safeE = Math.min(e, freshValue.length);
      handleFieldChange(path, freshValue.slice(0, safeS) + insert + freshValue.slice(safeE));
      return;
    }

    // ── Inline operations ─────────────────────────────────────────────────────
    const inlineKind = kind as InlineKind;
    if (textarea) {
      // Use textarea.value (DOM) not state — same pattern as WYSIWYG getWysiwygFreshValue
      applyContextFormat(path, textarea.value, textarea, inlineKind);
      return;
    }
    // Use fresh DOM value so recent typing isn't lost (bypasses React state batching)
    const currentValue = getWysiwygFreshValue(refKey, path);
    const mapped = getSourceSelectionOffsets(previewEl) ?? getFallbackSelectionOffsets(previewEl, currentValue);
    let start: number, end: number;
    if (mapped) { start = mapped.start; end = mapped.end; }
    else if (currentValue === '') { start = 0; end = 0; }
    else return;
    applyContextFormatAtOffsets(path, currentValue, start, end, inlineKind);
  };

  const renderContextToolbar = (refKey: string, path: string) => {
    if (activeContextRefKey !== refKey) return null;

    // Zero-height sticky container trick:
    // The container has height:0 so it contributes NOTHING to layout (no shift when
    // appearing/disappearing). The toolbar is absolutely positioned relative to this
    // container and floats ABOVE the field. When the page is scrolled so that the
    // container would be above the viewport, the sticky kicks in and keeps it at top:8px,
    // so the toolbar stays visible without ever changing the document height.
    const stickyContainerStyle: CSSProperties = {
      position: 'sticky',
      top: '8px',
      height: 0,
      overflow: 'visible',
      zIndex: 10,
    };

    const toolbarStyle: CSSProperties = {
      position: 'absolute',
      bottom: '0',     // sits just above the sticky anchor line
      right: '0',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: '0.15rem',
      background: 'rgba(18,24,36,0.96)',
      border: '1px solid rgba(255,255,255,0.16)',
      borderRadius: '7px',
      padding: '0.2rem',
      backdropFilter: 'blur(6px)',
      boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
      maxWidth: '480px',
      transform: 'translateY(-100%)',  // shift the toolbar upward by its own height
    };

    const btn = (label: React.ReactNode, k: ToolbarKind, title: string, ariaLabel: string) => (
      <button
        className="editor-button small"
        type="button"
        title={title}
        aria-label={ariaLabel}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyToolbarToContext(path, refKey, k)}
        style={{ minWidth: 0, padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
      >
        {label}
      </button>
    );

    const separator = (
      <span style={{
        display: 'block',
        width: '1px',
        alignSelf: 'stretch',
        background: 'rgba(255,255,255,0.15)',
        margin: '0.1rem 0.2rem',
        flexShrink: 0,
      }} />
    );

    return (
      <div style={stickyContainerStyle}>
      <div style={toolbarStyle}>
        {btn('B', 'bold', 'Fett (**...**) | Strg+F', 'Fett')}
        {btn(<em>I</em>, 'italic', 'Kursiv (*...*) | Strg+K', 'Kursiv')}
        {btn('{ }', 'gap', 'Lückentext ({...}) | Strg+G', 'Lückentext')}
        {btn(<code style={{ fontSize: '0.75rem' }}>` `</code>, 'code', 'Inline-Code (`...`) | Strg+M', 'Code')}
        {btn('==', 'highlight', 'Highlight (==...==) | Strg+E', 'Highlight')}
        {btn('(A)', 'abbr', 'Abkürzung (term)[Langform]', 'Abkürzung')}
        {btn('H1', 'h1', 'Überschrift 1 (# am Zeilenanfang)', 'H1')}
        {btn('H2', 'h2', 'Überschrift 2 (## am Zeilenanfang)', 'H2')}
        {btn('*+', 'list', 'Aufzählung (*+ / *++ …, gemeinsames Markup)', 'Aufzählung')}
        {btn('*-', 'listOrdered', 'Nummeriert (*- / *-- …, gemeinsames Markup)', 'Nummerierte Liste')}
        {btn('\\n', 'newline', 'Zeilenumbruch (\\n)', 'Zeilenumbruch')}
        {btn('[ ]', 'brackets', 'Erklär-Chip ([...]) | Strg+H', 'Erklär-Chip')}
        {separator}
        <button
          className={`editor-button small ${contextViewMode === 'edited' ? 'primary' : ''}`}
          type="button"
          title={contextViewMode === 'raw' ? 'Zur WYSIWYG-Ansicht wechseln' : 'Zur Raw-Ansicht wechseln'}
          aria-label="Raw/WYSIWYG umschalten"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setContextViewMode((prev) => (prev === 'raw' ? 'edited' : 'raw'))}
          style={{ minWidth: 0, padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
        >
          {contextViewMode === 'raw' ? 'Raw' : 'WYSIWYG'}
        </button>
      </div>
      </div>
    );
  };

  const pasteClipboardToDraft = async (setDraft: (s: string) => void) => {
    try {
      const t = await navigator.clipboard.readText();
      setDraft(t);
    } catch {
      showToast('Zwischenablage konnte nicht gelesen werden.', 'error', 2500);
    }
  };

  const pasteClipboardToMetaSourceLines = async (setLines: (lines: string[]) => void) => {
    try {
      const t = await navigator.clipboard.readText();
      const parts = t.split('|').map((p) => p.trim());
      setLines(parts.length ? parts : ['']);
    } catch {
      showToast('Zwischenablage konnte nicht gelesen werden.', 'error', 2500);
    }
  };

  const handleAddCorrect = () => {
    if (!localItem) return;

    const newCorrect: CorrectEntry = {
      entry: {
        word: '',
        type: 'word',
      },
      spawnPosition: 0.5,
      spawnSpread: 0.05,
      speed: 1.0,
      points: 10,
      pattern: 'single',
      context: '',
      source: '',
      details: '',
      visual: {
        color: '#4CAF50',
        variant: 'hexagon',
        fontSize: 1.0,
      },
    };

    const newItem = {
      ...localItem,
      correct: [...localItem.correct, newCorrect],
    };

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  const handleRemoveCorrect = (index: number) => {
    if (!localItem) return;

    const newItem = {
      ...localItem,
      correct: localItem.correct.filter((_, i) => i !== index),
    };

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  const handleAddDistractor = () => {
    if (!localItem) return;

    const newDistractor: DistractorEntry = {
      entry: {
        word: '',
        type: 'word',
      },
      spawnPosition: 0.5,
      spawnSpread: 0.05,
      speed: 1.0,
      points: 10,
      damage: 1,
      redirect: '',
      context: '',
      source: '',
      details: '',
      visual: {
        color: '#f44336',
        variant: 'spike',
        fontSize: 1.0,
      },
    };

    const newItem = {
      ...localItem,
      distractors: [...localItem.distractors, newDistractor],
    };

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  const handleRemoveDistractor = (index: number) => {
    if (!localItem) return;

    const newItem = {
      ...localItem,
      distractors: localItem.distractors.filter((_, i) => i !== index),
    };

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  const handleToggleRelated = (relatedId: string) => {
    if (!localItem) return;

    const related = localItem.meta.related || [];
    const newRelated = related.includes(relatedId)
      ? related.filter(id => id !== relatedId)
      : [...related, relatedId];

    const newItem = {
      ...localItem,
      meta: {
        ...localItem.meta,
        related: newRelated,
      },
    };

    setLocalItem(newItem);
    onItemChange(newItem);
  };

  // Load universe and all themes when universeId changes
  useEffect(() => {
    const loadUniverseAndThemes = async () => {
      if (!universeId) return;
      
      try {
        const universe = await jsonLoader.loadUniverse(universeId);
        if (universe) {
          // Load all themes
          const themes: Theme[] = [];
          for (const themeId of universe.themes) {
            try {
              const themeObj = await jsonLoader.loadTheme(universeId, themeId);
              if (themeObj) {
                themes.push(themeObj);
              }
            } catch (error) {
              console.warn(`Failed to load theme ${themeId}:`, error);
            }
          }
          setAvailableThemes(themes);
          
          // Initialize filter theme if not set and theme prop is available
          if (theme && (!selectedFilterTheme || selectedFilterTheme !== theme.id)) {
            setSelectedFilterTheme(theme.id);
            setSelectedFilterThemeObj(theme);
          } else if (!selectedFilterTheme && themes.length > 0 && theme) {
            // Fallback: find theme in loaded themes
            const foundTheme = themes.find(t => t.id === theme.id);
            if (foundTheme) {
              setSelectedFilterTheme(foundTheme.id);
              setSelectedFilterThemeObj(foundTheme);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load universe:', error);
      }
    };
    
    loadUniverseAndThemes();
  }, [universeId, theme]);

  // Update available chapters when filter theme changes
  useEffect(() => {
    if (selectedFilterThemeObj) {
      const chapters = Object.keys(selectedFilterThemeObj.chapters);
      setAvailableChapters(chapters);
      
      // If current chapter is not in available chapters, clear it
      if (selectedFilterChapter && !chapters.includes(selectedFilterChapter)) {
        setSelectedFilterChapter('');
      }
    } else {
      setAvailableChapters([]);
    }
  }, [selectedFilterThemeObj, selectedFilterChapter]);

  // Update available chapters for move/copy when target theme changes
  useEffect(() => {
    if (moveTargetThemeObj) {
      const chapters = Object.keys(moveTargetThemeObj.chapters);
      setMoveAvailableChapters(chapters);
      
      // If current chapter is not in available chapters, clear it
      if (moveTargetChapter && !chapters.includes(moveTargetChapter)) {
        setMoveTargetChapter('');
      }
    } else {
      setMoveAvailableChapters([]);
    }
  }, [moveTargetThemeObj, moveTargetChapter]);

  // Load items based on filter selection
  useEffect(() => {
    const loadFilteredItems = async () => {
      if (!universeId) return;
      
      try {
        let items: Item[] = [];
        
        if (selectedFilterChapter && selectedFilterThemeObj) {
          // Load items from specific chapter
          items = await jsonLoader.loadChapter(universeId, selectedFilterTheme, selectedFilterChapter, false);
          console.log(`📚 Loaded ${items.length} items from chapter: ${selectedFilterChapter}`);
        } else if (selectedFilterThemeObj) {
          // Load all items from theme
          const chapterIds = Object.keys(selectedFilterThemeObj.chapters);
          items = await jsonLoader.loadAllThemeItems(universeId, selectedFilterTheme, chapterIds);
          console.log(`🎨 Loaded ${items.length} items from theme: ${selectedFilterTheme}`);
        } else {
          // Fallback to allItems prop
          items = allItems;
        }
        
        setFilteredItems(items);
      } catch (error) {
        console.error('Failed to load filtered items:', error);
        setFilteredItems(allItems);
      }
    };
    
    loadFilteredItems();
  }, [universeId, selectedFilterTheme, selectedFilterChapter, selectedFilterThemeObj, allItems]);

  // Initialize filter values when props change
  useEffect(() => {
    if (theme && theme.id !== selectedFilterTheme) {
      setSelectedFilterTheme(theme.id);
      setSelectedFilterThemeObj(theme);
    }
    if (chapterId && chapterId !== selectedFilterChapter) {
      setSelectedFilterChapter(chapterId);
    }
  }, [theme, chapterId]);

  // Load all tags from theme when universe/theme changes
  useEffect(() => {
    const loadThemeTags = async () => {
      if (!universeId || !theme) return;
      
      try {
        const chapterIds = Object.keys(theme.chapters);
        const allThemeItems = await jsonLoader.loadAllThemeItems(universeId, theme.id, chapterIds);
        
        // Extract all unique tags from all items
        const tagsSet = new Set<string>();
        allThemeItems.forEach(item => {
          if (item.meta.tags) {
            item.meta.tags.forEach(tag => {
              if (tag && tag.trim()) {
                tagsSet.add(tag.trim());
              }
            });
          }
        });
        
        const sortedTags = Array.from(tagsSet).sort();
        setAllThemeTags(sortedTags);
        console.log(`🏷️ Loaded ${sortedTags.length} unique tags from theme`);
      } catch (error) {
        console.error('Failed to load theme tags:', error);
      }
    };
    
    loadThemeTags();
  }, [universeId, theme]);

  // Filter related items by search (using filteredItems instead of allItems)
  const filteredRelatedItems = useMemo(() => {
    if (!relatedSearch) return filteredItems;
    const search = relatedSearch.toLowerCase();
    return filteredItems.filter(i => 
      i.id !== localItem?.id && (
        i.id.toLowerCase().includes(search) ||
        i.base.word?.toLowerCase().includes(search)
      )
    );
  }, [filteredItems, relatedSearch, localItem]);

  // Handle filter theme change
  const handleFilterThemeChange = async (themeId: string) => {
    if (!universeId) return;
    
    try {
      const themeObj = await jsonLoader.loadTheme(universeId, themeId);
      if (themeObj) {
        setSelectedFilterTheme(themeId);
        setSelectedFilterThemeObj(themeObj);
        // Clear chapter selection when theme changes
        setSelectedFilterChapter('');
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      showToast('Failed to load theme', 'error');
    }
  };

  // Handle filter chapter change
  const handleFilterChapterChange = (chapterId: string) => {
    setSelectedFilterChapter(chapterId);
  };

  // Get chapter title helper
  const getChapterTitle = (chapterId: string): string => {
    if (!selectedFilterThemeObj) return chapterId;
    const chapterConfig = selectedFilterThemeObj.chapters[chapterId];
    return chapterConfig?.title || chapterId;
  };

  // Get chapter title for move target (uses moveTargetThemeObj)
  const getMoveChapterTitle = (chapterId: string): string => {
    if (!moveTargetThemeObj) return chapterId;
    const chapterConfig = moveTargetThemeObj.chapters[chapterId];
    return chapterConfig?.title || chapterId;
  };

  // Filter tag suggestions based on input
  const filteredTagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return allThemeTags.slice(0, 10); // Show first 10 if no input
    
    const input = tagInput.toLowerCase().trim();
    const currentTags = localItem?.meta.tags || [];
    
    return allThemeTags
      .filter(tag => 
        tag.toLowerCase().includes(input) && 
        !currentTags.includes(tag)
      )
      .slice(0, 10);
  }, [tagInput, allThemeTags, localItem?.meta.tags]);

  // Handle tag input changes
  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    setShowTagSuggestions(true);
  };

  // Add tag from input or suggestion
  const handleAddTag = (tag: string) => {
    if (!localItem || !tag.trim()) return;
    
    const trimmedTag = tag.trim();
    const currentTags = localItem.meta.tags || [];
    
    if (currentTags.includes(trimmedTag)) return; // Already exists
    
    const newTags = [...currentTags, trimmedTag];
    handleFieldChange('meta.tags', newTags);
    setTagInput('');
    setShowTagSuggestions(false);
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    if (!localItem) return;
    
    const currentTags = localItem.meta.tags || [];
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    handleFieldChange('meta.tags', newTags);
  };

  // Handle tag input key events
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    } else if (e.key === 'ArrowDown' && filteredTagSuggestions.length > 0) {
      e.preventDefault();
      // Focus first suggestion (could be enhanced with keyboard navigation)
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tagInputRef.current && 
        !tagInputRef.current.contains(event.target as Node) &&
        tagSuggestionsRef.current &&
        !tagSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowTagSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CONTEXT_EXPANDED_STORAGE_KEY, contextsExpanded ? '1' : '0');
  }, [contextsExpanded]);

  useEffect(() => {
    Object.values(contextTextareaRefs.current).forEach((textarea) => {
      if (textarea) autoResizeTextarea(textarea);
    });
  }, [contextsExpanded]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!item || !localItem) return false;
    return JSON.stringify(item) !== JSON.stringify(localItem);
  }, [item, localItem]);

  // Save item to database
  const handleSave = async () => {
    if (!localItem || !universeId || !theme || !chapterId) {
      showToast('❌ Missing required information to save', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await jsonWriter.saveItem(universeId, theme.id, chapterId, localItem);
      
      if (result.success) {
        showToast(`✅ Item ${localItem.id} saved successfully!`, 'success');
        // Update the original item prop by calling onItemChange
        onItemChange(localItem);
        onBack();
      } else {
        showToast(`❌ Failed to save item: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      showToast(`❌ Error saving item: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle back button - save if there are changes
  const handleBack = async () => {
    if (hasUnsavedChanges) {
      await handleSave();
    } else {
      onBack();
    }
  };

  // Handle discard - go back without saving
  const handleDiscard = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('Are you sure you want to discard all unsaved changes?');
      if (confirmed) {
        // Reset to original item
        if (item) {
          setLocalItem(item);
        }
        onBack();
      }
    } else {
      onBack();
    }
  };

  // Handle move target theme change
  const handleMoveThemeChange = async (themeId: string) => {
    if (!universeId) return;
    
    try {
      const themeObj = await jsonLoader.loadTheme(universeId, themeId);
      if (themeObj) {
        setMoveTargetTheme(themeId);
        setMoveTargetThemeObj(themeObj);
        // Clear chapter selection when theme changes
        setMoveTargetChapter('');
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      showToast('Failed to load theme', 'error');
    }
  };

  // Handle move target chapter change
  const handleMoveChapterChange = (chapterId: string) => {
    setMoveTargetChapter(chapterId);
  };

  // Reset move/copy selections
  const handleCancelMove = () => {
    setMoveTargetTheme(theme?.id || '');
    setMoveTargetChapter(chapterId || '');
    setMoveTargetThemeObj(theme || null);
  };

  // Move item to different chapter
  const handleMoveItem = async () => {
    if (!localItem || !moveTargetChapter || !moveTargetThemeObj) {
      showToast('❌ Please select a target chapter', 'error');
      return;
    }

    // Check if already in target chapter
    if (chapterId === moveTargetChapter && theme?.id === moveTargetTheme) {
      showToast('⚠️ Item is already in this chapter', 'warning');
      return;
    }

    const confirmed = window.confirm(
      `Move item "${localItem.id}" to chapter "${getMoveChapterTitle(moveTargetChapter)}"?\n\n` +
      `This will update the item's chapter assignment.`
    );
    
    if (!confirmed) return;

    setMoveInProgress(true);
    try {
      const result = await supabaseLoader.moveRoundToChapter(localItem.id, moveTargetChapter);
      
      if (result.success) {
        const targetChapterTitle = getMoveChapterTitle(moveTargetChapter);
        showToast(
          `✅ Item moved successfully! You'll find it now in "${moveTargetThemeObj.name || moveTargetTheme}" → "${targetChapterTitle}"`,
          'success'
        );
        // Close detail view and return to table
        onBack();
      } else {
        showToast(`❌ Failed to move item: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error moving item:', error);
      showToast(`❌ Error moving item: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setMoveInProgress(false);
    }
  };

  // Copy item to different chapter
  const handleCopyItem = async () => {
    if (!localItem || !moveTargetChapter || !moveTargetThemeObj) {
      showToast('❌ Please select a target chapter', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Copy item "${localItem.id}" to chapter "${getMoveChapterTitle(moveTargetChapter)}"?\n\n` +
      `A new item with a new ID will be created in the target chapter.`
    );
    
    if (!confirmed) return;

    setMoveInProgress(true);
    try {
      const result = await supabaseLoader.copyRoundToChapter(localItem.id, moveTargetChapter);
      
      if (result.success && result.newRoundId) {
        const targetChapterTitle = getMoveChapterTitle(moveTargetChapter);
        showToast(
          `✅ Item copied successfully! New item "${result.newRoundId}" created in "${moveTargetThemeObj.name || moveTargetTheme}" → "${targetChapterTitle}"`,
          'success'
        );
        // Keep detail view open to continue editing original
      } else {
        showToast(`❌ Failed to copy item: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error copying item:', error);
      showToast(`❌ Error copying item: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setMoveInProgress(false);
    }
  };

  if (!localItem) {
    return (
      <div style={{ 
        padding: '4rem', 
        textAlign: 'center', 
        color: 'rgba(255, 255, 255, 0.5)' 
      }}>
        <h2>Item not found</h2>
        <button className="editor-button primary" onClick={onBack}>
          ← Back to Table View
        </button>
      </div>
    );
  }

  const metaSourceCount = countMetaSources(localItem.meta.source || '');

  return (
    <div className="editor-detail-container">
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button 
          className="editor-button primary" 
          onClick={handleBack}
          disabled={saving}
        >
          {saving ? '💾 Saving...' : hasUnsavedChanges ? '💾 Save & Back' : '← Back to Table View'}
        </button>
        <button 
          className="editor-button" 
          onClick={() => setShowTextParserModal(true)}
          disabled={saving}
          title="Edit this item in text parser"
        >
          📝 Edit in Text Parser
        </button>
        {hasUnsavedChanges && (
          <button 
            className="editor-button" 
            onClick={handleDiscard}
            disabled={saving}
            style={{ opacity: 0.8 }}
          >
            Discard Changes
          </button>
        )}
      </div>

      {/* BASIC INFORMATION */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        <div className="editor-detail-section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
          📋 Basic Information
        </div>
        <div
          className="editor-game-toggle editor-game-toggle--spaced"
          title="Game: sw=both, s=StreetSmarts only, w=WordRush only"
          role="group"
          aria-label="Which games use this item"
          style={{ marginBottom: '0.75rem' }}
        >
          {(['sw', 's', 'w'] as const).map((val) => {
            const current = localItem.game ?? 'sw';
            const active = current === val;
            const label =
              val === 'sw' ? 'Both games' : val === 's' ? 'StreetSmarts only' : 'WordRush only';
            return (
              <button
                key={val}
                type="button"
                className={`editor-game-toggle__btn editor-game-toggle__btn--${val}${active ? ' editor-game-toggle__btn--active' : ''}`}
                title={label}
                aria-pressed={active}
                onClick={() => handleFieldChange('game', val)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            className="editor-form-input"
            value={localItem.id}
            disabled
            placeholder="ID"
            style={{ opacity: 0.6, cursor: 'not-allowed', flex: '0 0 140px' }}
          />
          <select
            className="editor-form-select"
            value={localItem.level}
            onChange={(e) => handleFieldChange('level', parseInt(e.target.value))}
            style={{ flex: '0 0 100px' }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
              <option key={level} value={level}>Level {level}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={localItem.published !== false}
              onChange={(e) => handleFieldChange('published', e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '0.9rem' }}>{localItem.published !== false ? '✅ Published' : '❌ Unpublished'}</span>
          </label>
          <a
            href={streetSmartsItemUrl(localItem.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="editor-button small"
            title="Open in StreetSmarts (?entry= deep link)"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem 0.5rem',
              fontSize: '0.85rem',
            }}
          >
            🌐
          </a>
        </div>
      </div>

      {/* BASE ENTRY */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        <div className="editor-detail-section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span>🎯 Base Entry</span>
          <button
            className={`editor-button small ${contextsExpanded ? 'primary' : ''}`}
            onClick={() => setContextsExpanded((prev) => !prev)}
            title={contextsExpanded ? 'Alle Context-Felder einklappen' : 'Alle Context-Felder ausklappen'}
            aria-label="Context Felder umschalten"
            type="button"
          >
            {contextsExpanded ? 'Ausgeklappt' : 'Eingeklappt'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            className="editor-form-input"
            value={localItem.base.word || ''}
            onChange={(e) => handleFieldChange('base.word', e.target.value)}
            placeholder="Base Word"
            style={{ flex: 1 }}
          />
          <select
            className="editor-form-select"
            value={localItem.base.type}
            onChange={(e) => {
              handleFieldChange('base.type', e.target.value);
              if (e.target.value === 'image') {
                openImageFilePicker('base.image');
              }
            }}
            style={{ flex: '0 0 120px' }}
          >
            <option value="word">Word</option>
            <option value="phrase">Phrase</option>
            <option value="image">Image</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            {renderContextToolbar('baseContext', 'base.context')}
            {contextViewMode === 'raw' ? (
              <textarea
                className="editor-form-textarea"
                value={localItem.base.context || ''}
                onChange={(e) => handleFieldChange('base.context', e.target.value)}
                onFocus={() => {
                  setActiveContextRefKey('baseContext');
                }}
                onBlur={() => {
                  if (activeContextRefKey === 'baseContext') setActiveContextRefKey('');
                }}
                onKeyDown={(e) => handleContextKeyDown(e, 'base.context', localItem.base.context || '')}
                onInput={(e) => autoResizeTextarea(e.currentTarget)}
                ref={(el) => {
                  contextTextareaRefs.current.baseContext = el;
                  if (el) autoResizeTextarea(el);
                }}
                placeholder="Base Context (optional)"
                rows={contextsExpanded ? 3 : 1}
                style={{ flex: 1, width: '100%', resize: 'none', minHeight: contextsExpanded ? '84px' : '38px', overflow: 'hidden', lineHeight: 1.4 }}
              />
            ) : (
              <WysiwygContextEditor
                key={`${localItem.id}-base-ctx`}
                value={localItem.base.context || ''}
                path="base.context"
                collapsed={!contextsExpanded}
                keyPrefix="base"
                placeholder="Base Context (optional)"
                itemId={localItem.id}
                minHeightExpanded="84px"
                minHeightCollapsed="38px"
                onValueChange={handleFieldChange}
                onWysiwygKeyDown={handleWysiwygKeyDown}
                setPreviewRef={(el) => {
                  contextPreviewRefs.current.baseContext = el;
                }}
                onActivate={() => setActiveContextRefKey('baseContext')}
                onDidSetInnerHTML={(el) => {
                  const p = wysiwygPendingCursorRef.current;
                  if (p?.path === 'base.context') { wysiwygPendingCursorRef.current = null; placeCursorAtSourceOffset(el, p.offset); }
                }}
              />
            )}
          </div>
        </div>
        {localItem.base.type === 'image' && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              className="editor-form-input"
              value={localItem.base.image || ''}
              onChange={(e) => handleFieldChange('base.image', e.target.value)}
              placeholder="https://… (Storage media-Bucket) oder Upload"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="editor-button small"
              disabled={uploadingMediaField === 'base.image'}
              onClick={() => openImageFilePicker('base.image')}
              title="In Bucket media hochladen: …/{Universe}/{Theme}/{Chapter}/{ItemId}/Datei"
              style={{ padding: '0.4rem 0.8rem' }}
            >
              {uploadingMediaField === 'base.image' ? '⏳ …' : '📁 Upload'}
            </button>
          </div>
        )}
      </div>

      {/* CORRECT ENTRIES */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>✅ Correct Entries ({localItem.correct.length})</span>
        </div>
        {localItem.correct.map((correct, index) => (
          <div key={index} style={{ 
            background: 'rgba(76, 175, 80, 0.08)', 
            borderRadius: '6px', 
            padding: '0.75rem', 
            marginBottom: '0.75rem',
            border: '1px solid rgba(76, 175, 80, 0.25)'
          }}>
            <div className="editor-detail-entry-card">
              <div className="editor-detail-entry-main">
                <div className="editor-detail-entry-row">
                  <input
                    type="text"
                    className="editor-form-input"
                    value={correct.entry.word || ''}
                    onChange={(e) => handleFieldChange(`correct[${index}].entry.word`, e.target.value)}
                    placeholder="Correct Answer"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                </div>
                <div className="editor-detail-entry-row">
                  <div style={{ position: 'relative', flex: 1 }}>
                    {renderContextToolbar(`correct-${index}`, `correct[${index}].context`)}
                    {contextViewMode === 'raw' ? (
                      <textarea
                        className="editor-form-textarea"
                        value={correct.context || ''}
                        onChange={(e) => handleFieldChange(`correct[${index}].context`, e.target.value)}
                        onFocus={() => {
                          setActiveContextRefKey(`correct-${index}`);
                        }}
                        onBlur={() => {
                          if (activeContextRefKey === `correct-${index}`) setActiveContextRefKey('');
                        }}
                        onKeyDown={(e) => handleContextKeyDown(e, `correct[${index}].context`, correct.context || '')}
                        onInput={(e) => autoResizeTextarea(e.currentTarget)}
                        ref={(el) => {
                          contextTextareaRefs.current[`correct-${index}`] = el;
                          if (el) autoResizeTextarea(el);
                        }}
                        placeholder="Context"
                        rows={contextsExpanded ? 2 : 1}
                        style={{ width: '100%', resize: 'none', minHeight: contextsExpanded ? '64px' : '38px', flex: 1, overflow: 'hidden', lineHeight: 1.4 }}
                      />
                    ) : (
                      <WysiwygContextEditor
                        key={`${localItem.id}-correct-${index}-ctx`}
                        value={correct.context || ''}
                        path={`correct[${index}].context`}
                        collapsed={!contextsExpanded}
                        keyPrefix={`c-${index}`}
                        placeholder="Context"
                        itemId={localItem.id}
                        minHeightExpanded="64px"
                        minHeightCollapsed="38px"
                        onValueChange={handleFieldChange}
                        onWysiwygKeyDown={handleWysiwygKeyDown}
                        setPreviewRef={(el) => {
                          contextPreviewRefs.current[`correct-${index}`] = el;
                        }}
                        onActivate={() => setActiveContextRefKey(`correct-${index}`)}
                        onDidSetInnerHTML={(el) => {
                          const p = wysiwygPendingCursorRef.current;
                          const key = `correct[${index}].context`;
                          if (p?.path === key) { wysiwygPendingCursorRef.current = null; placeCursorAtSourceOffset(el, p.offset); }
                        }}
                      />
                    )}
                    {isMobileDetail && (
                      <div
                        className="editor-mobile-level-meta-row editor-mobile-level-meta-row--correct"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          marginTop: '0.35rem',
                          flexWrap: 'nowrap',
                        }}
                      >
                        <select
                          className="editor-form-select"
                          value={correct.level ?? 1}
                          onChange={(e) => handleFieldChange(`correct[${index}].level`, parseInt(e.target.value))}
                          style={{ flex: '0 0 64px', minWidth: 0, height: 38, padding: '0 0.35rem', fontSize: '0.75rem' }}
                          title="Item Level"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                            <option key={level} value={level}>Lvl {level}</option>
                          ))}
                        </select>
                        <select
                          className="editor-form-select"
                          value={correct.entry.type}
                          title="Word / Phrase / Image"
                          onChange={(e) => {
                            const v = e.target.value;
                            handleFieldChange(`correct[${index}].entry.type`, v);
                            if (v === 'image') {
                              openImageFilePicker(`correct[${index}].entry.image`);
                            }
                          }}
                          style={{
                            flex: '0 0 72px',
                            minWidth: 0,
                            height: 38,
                            padding: '0 0.3rem',
                            fontSize: '0.72rem',
                          }}
                        >
                          <option value="word">Word</option>
                          <option value="phrase">Phrase</option>
                          <option value="image">Image</option>
                        </select>
                        <button
                          type="button"
                          className={`editor-button small editor-mobile-meta-btn ${correct.source?.trim() ? 'editor-mobile-meta-btn--filled' : ''}`}
                          style={{ height: 38, flex: '1 1 0', minWidth: 0, padding: '0 0.45rem' }}
                          onClick={() =>
                            setMobileSourceModal({ kind: 'correct', index, draft: correct.source || '' })
                          }
                        >
                          Source{correct.source?.trim() ? ' ✓' : ''}
                        </button>
                        <button
                          type="button"
                          className={`editor-button small editor-mobile-meta-btn ${correct.details?.trim() ? 'editor-mobile-meta-btn--filled' : ''}`}
                          style={{ height: 38, flex: '1 1 0', minWidth: 0, padding: '0 0.45rem' }}
                          onClick={() =>
                            setMobileDetailsModal({ kind: 'correct', index, draft: correct.details || '' })
                          }
                        >
                          Details{correct.details?.trim() ? ' ✓' : ''}
                        </button>
                      </div>
                    )}
                  </div>
                  {!isMobileDetail && (
                    <>
                      <select
                        className="editor-form-select"
                        value={correct.level ?? 1}
                        onChange={(e) => handleFieldChange(`correct[${index}].level`, parseInt(e.target.value))}
                        style={{ flex: '0 0 80px' }}
                        title="Item Level"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                          <option key={level} value={level}>Lvl {level}</option>
                        ))}
                      </select>
                      <select
                        className="editor-form-select"
                        value={correct.entry.type}
                        title="Word / Phrase / Image"
                        onChange={(e) => {
                          const v = e.target.value;
                          handleFieldChange(`correct[${index}].entry.type`, v);
                          if (v === 'image') {
                            openImageFilePicker(`correct[${index}].entry.image`);
                          }
                        }}
                        style={{ flex: '0 0 100px' }}
                      >
                        <option value="word">Word</option>
                        <option value="phrase">Phrase</option>
                        <option value="image">Image</option>
                      </select>
                    </>
                  )}
                </div>
                {!isMobileDetail && (
                  <>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="editor-form-input"
                          value={correct.source || ''}
                          onChange={(e) => handleFieldChange(`correct[${index}].source`, e.target.value)}
                          placeholder="URL oder Quellenangabe"
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        {isUrlOpenable(correct.source || '') && (
                          <button
                            type="button"
                            className="editor-button small"
                            onClick={() => openUrlFromSource(correct.source || '')}
                          >
                            URL öffnen
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      {renderContextToolbar(`correct-${index}-details`, `correct[${index}].details`)}
                      {contextViewMode === 'raw' ? (
                        <textarea
                          className="editor-form-textarea"
                          value={correct.details || ''}
                          onChange={(e) => handleFieldChange(`correct[${index}].details`, e.target.value)}
                          onFocus={() => setActiveContextRefKey(`correct-${index}-details`)}
                          onBlur={() => {
                            if (activeContextRefKey === `correct-${index}-details`) setActiveContextRefKey('');
                          }}
                          onKeyDown={(e) =>
                            handleContextKeyDown(e, `correct[${index}].details`, correct.details || '')
                          }
                          onInput={(e) => autoResizeTextarea(e.currentTarget)}
                          ref={(el) => {
                            contextTextareaRefs.current[`correct-${index}-details`] = el;
                            if (el) autoResizeTextarea(el);
                          }}
                          placeholder="Details (optional)"
                          rows={contextsExpanded ? 2 : 1}
                          style={{
                            width: '100%',
                            resize: 'none',
                            minHeight: contextsExpanded ? '64px' : '38px',
                            flex: 1,
                            overflow: 'hidden',
                            lineHeight: 1.4,
                          }}
                        />
                      ) : (
                        <WysiwygContextEditor
                          key={`${localItem.id}-correct-${index}-details`}
                          value={correct.details || ''}
                          path={`correct[${index}].details`}
                          collapsed={!contextsExpanded}
                          keyPrefix={`cd-c-${index}`}
                          placeholder="Details (optional)"
                          itemId={localItem.id}
                          minHeightExpanded="64px"
                          minHeightCollapsed="38px"
                          onValueChange={handleFieldChange}
                          onWysiwygKeyDown={handleWysiwygKeyDown}
                          setPreviewRef={(el) => {
                            contextPreviewRefs.current[`correct-${index}-details`] = el;
                          }}
                          onActivate={() => setActiveContextRefKey(`correct-${index}-details`)}
                          onDidSetInnerHTML={(el) => {
                            const p = wysiwygPendingCursorRef.current;
                            const key = `correct[${index}].details`;
                            if (p?.path === key) { wysiwygPendingCursorRef.current = null; placeCursorAtSourceOffset(el, p.offset); }
                          }}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
              {localItem.correct.length > 1 && (
                <button 
                  type="button"
                  className="editor-button small danger editor-detail-entry-remove" 
                  onClick={() => handleRemoveCorrect(index)}
                  style={{ padding: '0.5rem', minWidth: '70px', flexShrink: 0 }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          className="editor-button small primary"
          onClick={handleAddCorrect}
          style={{ padding: '0.4rem 0.8rem', marginTop: '0.25rem' }}
        >
          + Add
        </button>
      </div>

      {/* DISTRACTOR ENTRIES */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>❌ Distractor Entries ({localItem.distractors.length})</span>
        </div>
        {localItem.distractors.map((distractor, index) => (
          <div key={index} style={{ 
            background: 'rgba(244, 67, 54, 0.08)', 
            borderRadius: '6px', 
            padding: '0.75rem', 
            marginBottom: '0.75rem',
            border: '1px solid rgba(244, 67, 54, 0.25)'
          }}>
            <div className="editor-detail-entry-card">
              <div className="editor-detail-entry-main">
                <div className="editor-detail-entry-row">
                  <input
                    type="text"
                    className="editor-form-input"
                    value={distractor.entry.word || ''}
                    onChange={(e) => handleFieldChange(`distractors[${index}].entry.word`, e.target.value)}
                    placeholder="Distractor Word"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className="editor-form-input"
                    value={distractor.redirect || ''}
                    onChange={(e) => handleFieldChange(`distractors[${index}].redirect`, e.target.value)}
                    placeholder="Redirect to..."
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="editor-detail-entry-row">
                  <div style={{ position: 'relative', flex: 1 }}>
                    {renderContextToolbar(`distractor-${index}`, `distractors[${index}].context`)}
                    {contextViewMode === 'raw' ? (
                      <textarea
                        className="editor-form-textarea"
                        value={distractor.context || ''}
                        onChange={(e) => handleFieldChange(`distractors[${index}].context`, e.target.value)}
                        onFocus={() => {
                          setActiveContextRefKey(`distractor-${index}`);
                        }}
                        onBlur={() => {
                          if (activeContextRefKey === `distractor-${index}`) setActiveContextRefKey('');
                        }}
                        onKeyDown={(e) => handleContextKeyDown(e, `distractors[${index}].context`, distractor.context || '')}
                        onInput={(e) => autoResizeTextarea(e.currentTarget)}
                        ref={(el) => {
                          contextTextareaRefs.current[`distractor-${index}`] = el;
                          if (el) autoResizeTextarea(el);
                        }}
                        placeholder="Context"
                        rows={contextsExpanded ? 2 : 1}
                        style={{ width: '100%', resize: 'none', minHeight: contextsExpanded ? '64px' : '38px', flex: 1, overflow: 'hidden', lineHeight: 1.4 }}
                      />
                    ) : (
                      <WysiwygContextEditor
                        key={`${localItem.id}-distractor-${index}-ctx`}
                        value={distractor.context || ''}
                        path={`distractors[${index}].context`}
                        collapsed={!contextsExpanded}
                        keyPrefix={`d-${index}`}
                        placeholder="Context"
                        itemId={localItem.id}
                        minHeightExpanded="64px"
                        minHeightCollapsed="38px"
                        onValueChange={handleFieldChange}
                        onWysiwygKeyDown={handleWysiwygKeyDown}
                        setPreviewRef={(el) => {
                          contextPreviewRefs.current[`distractor-${index}`] = el;
                        }}
                        onActivate={() => setActiveContextRefKey(`distractor-${index}`)}
                        onDidSetInnerHTML={(el) => {
                          const p = wysiwygPendingCursorRef.current;
                          const key = `distractors[${index}].context`;
                          if (p?.path === key) { wysiwygPendingCursorRef.current = null; placeCursorAtSourceOffset(el, p.offset); }
                        }}
                      />
                    )}
                    {isMobileDetail && (
                      <div
                        className="editor-mobile-level-meta-row editor-mobile-level-meta-row--distractor"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          marginTop: '0.35rem',
                          flexWrap: 'nowrap',
                        }}
                      >
                        <select
                          className="editor-form-select"
                          value={distractor.level ?? 1}
                          onChange={(e) => handleFieldChange(`distractors[${index}].level`, parseInt(e.target.value))}
                          style={{ flex: '0 0 76px', minWidth: 0, height: 38, padding: '0 0.4rem' }}
                          title="Item Level"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                            <option key={level} value={level}>Lvl {level}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={`editor-button small editor-mobile-meta-btn ${distractor.source?.trim() ? 'editor-mobile-meta-btn--filled-distractor' : ''}`}
                          style={{ height: 38, flex: '1 1 0', minWidth: 0, padding: '0 0.45rem' }}
                          onClick={() =>
                            setMobileSourceModal({ kind: 'distractor', index, draft: distractor.source || '' })
                          }
                        >
                          Source{distractor.source?.trim() ? ' ✓' : ''}
                        </button>
                        <button
                          type="button"
                          className={`editor-button small editor-mobile-meta-btn ${distractor.details?.trim() ? 'editor-mobile-meta-btn--filled-distractor' : ''}`}
                          style={{ height: 38, flex: '1 1 0', minWidth: 0, padding: '0 0.45rem' }}
                          onClick={() =>
                            setMobileDetailsModal({ kind: 'distractor', index, draft: distractor.details || '' })
                          }
                        >
                          Details{distractor.details?.trim() ? ' ✓' : ''}
                        </button>
                      </div>
                    )}
                  </div>
                  {!isMobileDetail && (
                    <select
                      className="editor-form-select"
                      value={distractor.level ?? 1}
                      onChange={(e) => handleFieldChange(`distractors[${index}].level`, parseInt(e.target.value))}
                      style={{ flex: '0 0 80px' }}
                      title="Item Level"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                        <option key={level} value={level}>Lvl {level}</option>
                      ))}
                    </select>
                  )}
                </div>
                {!isMobileDetail && (
                  <>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="editor-form-input"
                          value={distractor.source || ''}
                          onChange={(e) => handleFieldChange(`distractors[${index}].source`, e.target.value)}
                          placeholder="URL oder Quellenangabe"
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        {isUrlOpenable(distractor.source || '') && (
                          <button
                            type="button"
                            className="editor-button small"
                            onClick={() => openUrlFromSource(distractor.source || '')}
                          >
                            URL öffnen
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      {renderContextToolbar(`distractor-${index}-details`, `distractors[${index}].details`)}
                      {contextViewMode === 'raw' ? (
                        <textarea
                          className="editor-form-textarea"
                          value={distractor.details || ''}
                          onChange={(e) => handleFieldChange(`distractors[${index}].details`, e.target.value)}
                          onFocus={() => setActiveContextRefKey(`distractor-${index}-details`)}
                          onBlur={() => {
                            if (activeContextRefKey === `distractor-${index}-details`) setActiveContextRefKey('');
                          }}
                          onKeyDown={(e) =>
                            handleContextKeyDown(e, `distractors[${index}].details`, distractor.details || '')
                          }
                          onInput={(e) => autoResizeTextarea(e.currentTarget)}
                          ref={(el) => {
                            contextTextareaRefs.current[`distractor-${index}-details`] = el;
                            if (el) autoResizeTextarea(el);
                          }}
                          placeholder="Details (optional)"
                          rows={contextsExpanded ? 2 : 1}
                          style={{
                            width: '100%',
                            resize: 'none',
                            minHeight: contextsExpanded ? '64px' : '38px',
                            flex: 1,
                            overflow: 'hidden',
                            lineHeight: 1.4,
                          }}
                        />
                      ) : (
                        <WysiwygContextEditor
                          key={`${localItem.id}-distractor-${index}-details`}
                          value={distractor.details || ''}
                          path={`distractors[${index}].details`}
                          collapsed={!contextsExpanded}
                          keyPrefix={`cd-d-${index}`}
                          placeholder="Details (optional)"
                          itemId={localItem.id}
                          minHeightExpanded="64px"
                          minHeightCollapsed="38px"
                          onValueChange={handleFieldChange}
                          onWysiwygKeyDown={handleWysiwygKeyDown}
                          setPreviewRef={(el) => {
                            contextPreviewRefs.current[`distractor-${index}-details`] = el;
                          }}
                          onActivate={() => setActiveContextRefKey(`distractor-${index}-details`)}
                          onDidSetInnerHTML={(el) => {
                            const p = wysiwygPendingCursorRef.current;
                            const key = `distractors[${index}].details`;
                            if (p?.path === key) { wysiwygPendingCursorRef.current = null; placeCursorAtSourceOffset(el, p.offset); }
                          }}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
              {localItem.distractors.length > 1 && (
                <button 
                  type="button"
                  className="editor-button small danger editor-detail-entry-remove" 
                  onClick={() => handleRemoveDistractor(index)}
                  style={{ padding: '0.5rem', minWidth: '70px', flexShrink: 0 }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          className="editor-button small primary"
          onClick={handleAddDistractor}
          style={{ padding: '0.4rem 0.8rem', marginTop: '0.25rem' }}
        >
          + Add
        </button>
      </div>

      {/* MEDIA STORAGE — eigener Block wie Move/Copy */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        {isMobileDetail ? (
          <button
            type="button"
            className="editor-detail-mobile-collapse-toggle"
            onClick={() => setMediaSectionOpen((o) => !o)}
            aria-expanded={mediaSectionOpen}
          >
            <span className="editor-detail-mobile-collapse-title">📤 Media (Supabase Storage)</span>
            <span className="editor-detail-mobile-collapse-summary">
              {universeId && theme?.id && chapterId
                ? `${universeId}/${theme.id}/…/${localItem.id}`
                : '—'}
            </span>
            <span className="editor-detail-mobile-collapse-chevron">{mediaSectionOpen ? '▲' : '▼'}</span>
          </button>
        ) : (
          <div className="editor-detail-section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
            📤 Media (Supabase Storage)
          </div>
        )}
        {(!isMobileDetail || mediaSectionOpen) && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {universeId && theme?.id && chapterId ? (
              <>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255, 255, 255, 0.65)',
                    marginBottom: '0.5rem',
                    lineHeight: 1.45,
                  }}
                >
                  Bucket <code style={{ fontSize: '0.78rem' }}>media</code>, Pfad wie{' '}
                  <code style={{ fontSize: '0.78rem' }}>/editor/…</code>:
                </p>
                <code
                  style={{
                    fontSize: '0.72rem',
                    wordBreak: 'break-all',
                    display: 'block',
                    marginBottom: '0.6rem',
                    color: 'rgba(200, 230, 255, 0.9)',
                  }}
                >
                  {universeId}/{theme.id}/{chapterId}/{localItem.id}/Dateiname
                </code>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center',
                  }}
                >
                  <button
                    type="button"
                    className="editor-button small primary"
                    disabled={uploadingMediaField === 'base.image'}
                    onClick={() => openImageFilePicker('base.image')}
                    title="Öffentliche URL nach Upload in base.image schreiben"
                  >
                    {uploadingMediaField === 'base.image' ? '⏳ …' : '📁 Base-Bild'}
                  </button>
                  {localItem.correct.map((c, index) =>
                    c.entry.type === 'image' ? (
                      <button
                        key={`media-section-correct-img-${index}`}
                        type="button"
                        className="editor-button small"
                        disabled={uploadingMediaField === `correct[${index}].entry.image`}
                        onClick={() => openImageFilePicker(`correct[${index}].entry.image`)}
                        title={`Correct #${index + 1} → entry.image`}
                      >
                        {uploadingMediaField === `correct[${index}].entry.image`
                          ? '⏳ …'
                          : `📁 Correct #${index + 1}`}
                      </button>
                    ) : null
                  )}
                </div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.45)',
                    marginTop: '0.5rem',
                    marginBottom: 0,
                  }}
                >
                  Dieselben Aktionen gibt es bei Base Entry / Correct, wenn der Typ „Image“ ist.
                </p>
              </>
            ) : (
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255, 165, 0, 0.85)',
                  margin: 0,
                }}
              >
                Media-Upload braucht Universe, Theme und Chapter (Editor-URL vollständig).
              </p>
            )}
          </div>
        )}
      </div>

      {/* MOVE/COPY ITEM SECTION — unter Distraktoren, über Related Items */}
      <div className="editor-detail-section" style={{ padding: '1rem' }}>
        {isMobileDetail ? (
          <button
            type="button"
            className="editor-detail-mobile-collapse-toggle"
            onClick={() => setMoveSectionOpen((o) => !o)}
            aria-expanded={moveSectionOpen}
          >
            <span className="editor-detail-mobile-collapse-title">🔀 Move or Copy Item</span>
            <span className="editor-detail-mobile-collapse-summary">
              {[theme?.name || theme?.id, getChapterTitle(chapterId || '')].filter(Boolean).join(' · ')}
            </span>
            <span className="editor-detail-mobile-collapse-chevron">{moveSectionOpen ? '▲' : '▼'}</span>
          </button>
        ) : (
          <div className="editor-detail-section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
            🔀 Move or Copy Item
          </div>
        )}
        {(!isMobileDetail || moveSectionOpen) && (
        <div style={{ 
          padding: '1rem', 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{ 
            fontSize: '0.9rem', 
            color: 'rgba(255, 255, 255, 0.7)', 
            marginBottom: '1rem' 
          }}>
            Current location: <strong>{theme?.name || theme?.id || '?'}</strong> → <strong>{getChapterTitle(chapterId || '')}</strong>
          </p>
          
          {universeId && (
            <div className="editor-move-target-row" style={{ marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <SearchableDropdown
                  value={moveTargetTheme}
                  options={availableThemes.map(t => ({ value: t.id, label: t.name || t.id }))}
                  onChange={handleMoveThemeChange}
                  placeholder="Select Target Theme..."
                  searchPlaceholder="🔍 Search themes..."
                  label="Target Theme"
                />
              </div>
              {moveTargetThemeObj && (
                <div style={{ flex: 1 }}>
                  <SearchableDropdown
                    value={moveTargetChapter}
                    options={moveAvailableChapters.map(c => ({ 
                      value: c, 
                      label: getMoveChapterTitle(c)
                    }))}
                    onChange={handleMoveChapterChange}
                    placeholder="Select Target Chapter..."
                    searchPlaceholder="🔍 Search chapters..."
                    label="Target Chapter"
                  />
                </div>
              )}
            </div>
          )}

          {/* Show action buttons only if target chapter is selected AND different from current */}
          {moveTargetChapter && moveTargetThemeObj && (
            (moveTargetTheme !== theme?.id || moveTargetChapter !== chapterId) ? (
              <div className="editor-move-target-row" style={{ gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  className="editor-button"
                  onClick={handleCancelMove}
                  disabled={moveInProgress}
                  style={{ flex: '0 0 auto' }}
                >
                  ❌ Cancel
                </button>
                <button
                  className="editor-button primary"
                  onClick={handleMoveItem}
                  disabled={moveInProgress}
                  style={{ flex: 1 }}
                >
                  {moveInProgress ? '⏳ Moving...' : '🔀 Move Item'}
                </button>
                <button
                  className="editor-button"
                  onClick={handleCopyItem}
                  disabled={moveInProgress}
                  style={{ 
                    flex: 1,
                    background: 'rgba(76, 175, 80, 0.2)',
                    borderColor: 'rgba(76, 175, 80, 0.5)'
                  }}
                >
                  {moveInProgress ? '⏳ Copying...' : '📋 Copy Item'}
                </button>
              </div>
            ) : (
              <p style={{ 
                fontSize: '0.9rem', 
                color: 'rgba(255, 165, 0, 0.8)', 
                fontStyle: 'italic',
                marginTop: '1rem' 
              }}>
                ⚠️ Please select a different chapter to move or copy
              </p>
            )
          )}
        </div>
        )}
      </div>

      {/* RELATED ITEMS */}
      <div className="editor-detail-section">
        {isMobileDetail ? (
          <button
            type="button"
            className="editor-detail-mobile-collapse-toggle"
            onClick={() => setRelatedSectionOpen((o) => !o)}
            aria-expanded={relatedSectionOpen}
          >
            <span className="editor-detail-mobile-collapse-title">🔗 Related Items</span>
            <span className="editor-detail-mobile-collapse-summary">
              {localItem.meta.related?.length ?? 0} selected
            </span>
            <span className="editor-detail-mobile-collapse-chevron">{relatedSectionOpen ? '▲' : '▼'}</span>
          </button>
        ) : (
          <div className="editor-detail-section-title">
            🔗 Related Items
          </div>
        )}

        {(!isMobileDetail || relatedSectionOpen) && (
        <>
        {/* Theme and Chapter Filter Dropdowns */}
        {universeId && (
          <div className="editor-move-target-row" style={{ marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <SearchableDropdown
                value={selectedFilterTheme}
                options={availableThemes.map(t => ({ value: t.id, label: t.name || t.id }))}
                onChange={handleFilterThemeChange}
                placeholder="Select Theme..."
                searchPlaceholder="🔍 Search themes..."
                label="Filter by Theme"
              />
            </div>
            {selectedFilterThemeObj && (
              <div style={{ flex: 1 }}>
                <SearchableDropdown
                  value={selectedFilterChapter}
                  options={availableChapters.map(c => ({ 
                    value: c, 
                    label: getChapterTitle(c)
                  }))}
                  onChange={handleFilterChapterChange}
                  placeholder="All Chapters..."
                  searchPlaceholder="🔍 Search chapters..."
                  label="Filter by Chapter"
                />
              </div>
            )}
          </div>
        )}

        <div className="editor-form-group">
          <label className="editor-form-label">Search Items</label>
          <input
            type="text"
            className="editor-form-input"
            placeholder="Type to search items..."
            value={relatedSearch}
            onChange={(e) => setRelatedSearch(e.target.value)}
          />
        </div>
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto', 
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          {filteredRelatedItems.slice(0, 50).map(relatedItem => {
            const isSelected = localItem.meta.related?.includes(relatedItem.id);
            return (
              <label
                key={relatedItem.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: isSelected ? 'rgba(33, 150, 243, 0.2)' : 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  border: isSelected ? '1px solid rgba(33, 150, 243, 0.5)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleRelated(relatedItem.id)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontFamily: 'monospace', opacity: 0.7, fontSize: '0.85rem' }}>
                  {relatedItem.id}
                </span>
                <span style={{ flex: 1 }}>
                  {relatedItem.base.word || '(no word)'}
                </span>
                <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>
                  Level {relatedItem.level}
                </span>
              </label>
            );
          })}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <strong>Selected ({localItem.meta.related?.length || 0}):</strong>
          {localItem.meta.related && localItem.meta.related.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {localItem.meta.related.map(relatedId => (
                <span
                  key={relatedId}
                  style={{
                    background: 'rgba(33, 150, 243, 0.3)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {relatedId}
                  <button
                    onClick={() => handleToggleRelated(relatedId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '1rem',
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.5, marginTop: '0.5rem' }}>No related items selected</p>
          )}
        </div>
        </>
        )}
      </div>

      {/* META INFORMATION */}
      <div className="editor-detail-section">
        {isMobileDetail ? (
          <button
            type="button"
            className="editor-detail-mobile-collapse-toggle"
            onClick={() => setMetaSectionOpen((o) => !o)}
            aria-expanded={metaSectionOpen}
          >
            <span className="editor-detail-mobile-collapse-title">📝 Meta Information</span>
            <span className="editor-detail-mobile-collapse-summary">
              {[
                localItem.meta.tags?.length ? `${localItem.meta.tags.length} tags` : null,
                metaSourceCount > 0 ? `${metaSourceCount} Quelle${metaSourceCount === 1 ? '' : 'n'}` : null,
              ].filter(Boolean).join(' · ') || 'Source, tags, detail'}
            </span>
            <span className="editor-detail-mobile-collapse-chevron">{metaSectionOpen ? '▲' : '▼'}</span>
          </button>
        ) : (
          <div className="editor-detail-section-title">
            📝 Meta Information
          </div>
        )}
        {(!isMobileDetail || metaSectionOpen) && (
        <>
        <div className="editor-form-row">
          <div className="editor-form-group">
            <label className="editor-form-label">Source</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className={`editor-button small ${metaSourceCount > 0 ? 'primary' : ''}`}
                onClick={() => setMetaSourcesModal(splitMetaSourcePipe(localItem.meta.source || ''))}
              >
                Quellen{metaSourceCount > 0 ? ` (${metaSourceCount})` : ''}
              </button>
              <span className="editor-form-hint" style={{ opacity: 0.72, margin: 0 }}>
                Mehrere Einträge, gespeichert mit | getrennt
              </span>
            </div>
          </div>
          <div className="editor-form-group" style={{ position: 'relative' }}>
            <label className="editor-form-label">Tags</label>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.4rem', 
              padding: '0.4rem 0.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              minHeight: '40px',
              alignItems: 'center'
            }}>
              {/* Tag Pills */}
              {localItem.meta.tags && localItem.meta.tags.length > 0 && (
                <>
                  {localItem.meta.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '3px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.9)',
                      }}
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.5)',
                          cursor: 'pointer',
                          padding: '0',
                          fontSize: '1rem',
                          lineHeight: '1',
                          width: '16px',
                          height: '16px',
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                        }}
                        title="Remove tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </>
              )}
              {/* Tag Input */}
              <input
                ref={tagInputRef}
                type="text"
                className="editor-form-input"
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onFocus={() => setShowTagSuggestions(true)}
                placeholder={localItem.meta.tags && localItem.meta.tags.length > 0 ? "Add tag..." : "Type to add tags..."}
                style={{
                  border: 'none',
                  background: 'transparent',
                  flex: 1,
                  minWidth: '120px',
                  outline: 'none',
                  color: 'white',
                  fontSize: '0.9rem',
                  padding: '0.2rem 0',
                }}
              />
            </div>
            {/* Autocomplete Suggestions */}
            {showTagSuggestions && filteredTagSuggestions.length > 0 && (
              <div
                ref={tagSuggestionsRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.2rem',
                  background: 'rgba(15, 15, 20, 0.98)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  padding: '0.25rem',
                  zIndex: 1000,
                  maxHeight: '180px',
                  overflowY: 'auto',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {filteredTagSuggestions.map((tag) => (
                  <div
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    style={{
                      padding: '0.4rem 0.6rem',
                      cursor: 'pointer',
                      borderRadius: '3px',
                      fontSize: '0.875rem',
                      transition: 'background 0.15s',
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}
            {tagInput.trim() && !allThemeTags.some(t => t.toLowerCase() === tagInput.toLowerCase().trim()) && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', opacity: 0.6, color: 'rgba(255, 255, 255, 0.6)' }}>
                Press Enter to add "{tagInput.trim()}" as new tag
              </div>
            )}
          </div>
        </div>
        <div className="editor-form-row" style={{ marginTop: '1rem' }}>
          <div className="editor-form-group" style={{ flex: 1 }}>
            <label className="editor-form-label">Detail</label>
            <textarea
              className="editor-form-textarea"
              value={localItem.meta.detail || ''}
              onChange={(e) => handleFieldChange('meta.detail', e.target.value)}
              placeholder="Additional detail information"
              rows={4}
              style={{ 
                resize: 'vertical', 
                minHeight: '100px',
                fontSize: '0.95rem',
              }}
            />
          </div>
        </div>
        </>
        )}
      </div>

      {/* VISUAL & SPAWN CONFIGURATION */}
      <div className="editor-detail-section">
        {isMobileDetail ? (
          <button
            type="button"
            className="editor-detail-mobile-collapse-toggle"
            onClick={() => setVisualSectionOpen((o) => !o)}
            aria-expanded={visualSectionOpen}
          >
            <span className="editor-detail-mobile-collapse-title">🎨 Visual & Spawn Configuration</span>
            <span className="editor-detail-mobile-collapse-summary">
              Base + {localItem.correct.length} correct + {localItem.distractors.length} distractors
            </span>
            <span className="editor-detail-mobile-collapse-chevron">{visualSectionOpen ? '▲' : '▼'}</span>
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'stretch',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <button
              type="button"
              className="editor-detail-mobile-collapse-toggle"
              onClick={() => setVisualSectionOpen((o) => !o)}
              aria-expanded={visualSectionOpen}
              style={{ flex: '1 1 220px', minWidth: 0, marginBottom: 0 }}
            >
              <span className="editor-detail-mobile-collapse-title">🎨 Visual & Spawn Configuration</span>
              <span className="editor-detail-mobile-collapse-summary">
                Base + {localItem.correct.length} correct + {localItem.distractors.length} distractors
              </span>
              <span className="editor-detail-mobile-collapse-chevron">{visualSectionOpen ? '▲' : '▼'}</span>
            </button>
            <button
              type="button"
              className="editor-button primary"
              style={{ flex: '0 0 auto', alignSelf: 'center' }}
              onClick={() => {
                const randomized = randomConfigGenerator.applyRandomToItem(localItem, allItems);
                setLocalItem(randomized);
                onItemChange(randomized);
              }}
              title="Generate random visual and spawn configs (ensures uniqueness)"
            >
              🎲 Randomize All
            </button>
          </div>
        )}

        {visualSectionOpen && (
        <>
        {isMobileDetail && (
          <div style={{ marginBottom: '0.75rem' }}>
            <button
              type="button"
              className="editor-button primary"
              style={{ width: '100%' }}
              onClick={() => {
                const randomized = randomConfigGenerator.applyRandomToItem(localItem, allItems);
                setLocalItem(randomized);
                onItemChange(randomized);
              }}
              title="Generate random visual and spawn configs (ensures uniqueness)"
            >
              🎲 Randomize All
            </button>
          </div>
        )}

        {/* Base Visual Config */}
        <VisualConfig
          config={localItem.base.visual}
          onChange={(newConfig) => handleFieldChange('base.visual', newConfig)}
          label="🎯 Base Entry Visual"
          showPreview={true}
        />

        {/* Correct Entries Config */}
        {localItem.correct.map((correct, index) => (
          <div key={`correct-config-${index}`}>
            <VisualConfig
              config={correct.visual}
              onChange={(newConfig) => handleFieldChange(`correct[${index}].visual`, newConfig)}
              label={`✅ Correct #${index + 1} - Visual`}
              showPreview={false}
            />
            <SpawnConfig
              config={correct}
              onChange={(newConfig) => handleFieldChange(`correct[${index}]`, newConfig)}
              label={`✅ Correct #${index + 1} - Spawn & Behavior`}
            />
          </div>
        ))}

        {/* Distractor Entries Config */}
        {localItem.distractors.map((distractor, index) => (
          <div key={`distractor-config-${index}`}>
            <VisualConfig
              config={distractor.visual}
              onChange={(newConfig) => handleFieldChange(`distractors[${index}].visual`, newConfig)}
              label={`❌ Distractor #${index + 1} - Visual`}
              showPreview={false}
            />
            <SpawnConfig
              config={distractor}
              onChange={(newConfig) => handleFieldChange(`distractors[${index}]`, newConfig)}
              label={`❌ Distractor #${index + 1} - Spawn & Behavior`}
            />
          </div>
        ))}
        </>
        )}
      </div>

      {/* Meta: mehrere Quellen (| getrennt) */}
      {metaSourcesModal && localItem && (
        <div
          className="editor-modal-overlay editor-modal-overlay--tall"
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-meta-sources-modal-title"
          onClick={() => setMetaSourcesModal(null)}
        >
          <div className="editor-modal-panel editor-modal-panel--tall" onClick={(e) => e.stopPropagation()}>
            <h3 id="editor-meta-sources-modal-title" className="editor-modal-title">
              Quellen (Meta)
            </h3>
            <p className="editor-form-hint" style={{ marginBottom: '0.75rem', opacity: 0.85 }}>
              Ein Eintrag pro Zeile (URL oder Freitext). Beim Speichern werden leere Zeilen entfernt; Trennzeichen ist{' '}
              <code style={{ opacity: 0.95 }}>|</code>.
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: 'min(60vh, 520px)',
                overflowY: 'auto',
                marginBottom: '0.5rem',
              }}
            >
              {metaSourcesModal.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="editor-form-input"
                    value={line}
                    onChange={(e) => {
                      const next = [...metaSourcesModal];
                      next[i] = e.target.value;
                      setMetaSourcesModal(next);
                    }}
                    placeholder="URL oder Quellenangabe"
                    style={{ flex: '1 1 160px', minWidth: 0 }}
                  />
                  {isUrlOpenable(line) && (
                    <button type="button" className="editor-button small" onClick={() => openUrlFromSource(line)}>
                      URL öffnen
                    </button>
                  )}
                  {metaSourcesModal.length > 1 && (
                    <button
                      type="button"
                      className="editor-button small"
                      title="Zeile entfernen"
                      onClick={() => {
                        const next = metaSourcesModal.filter((_, j) => j !== i);
                        setMetaSourcesModal(next.length ? next : ['']);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className="editor-button small"
                onClick={() => setMetaSourcesModal((m) => (m ? [...m, ''] : null))}
              >
                + Zeile
              </button>
              <button
                type="button"
                className="editor-button small"
                onClick={() => pasteClipboardToMetaSourceLines((lines) => setMetaSourcesModal(lines))}
              >
                Aus Zwischenablage
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="editor-button" onClick={() => setMetaSourcesModal(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="editor-button primary"
                disabled={joinMetaSourcePipe(metaSourcesModal) === (localItem.meta.source || '')}
                onClick={() => {
                  if (!localItem) return;
                  handleFieldChange('meta.source', joinMetaSourcePipe(metaSourcesModal));
                  setMetaSourcesModal(null);
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Source (URL / Quelle) */}
      {mobileSourceModal && localItem && (
        <div
          className="editor-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-source-modal-title"
          onClick={() => setMobileSourceModal(null)}
        >
          <div className="editor-modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 id="editor-source-modal-title" className="editor-modal-title">
              Source
            </h3>
            <input
              type="text"
              className="editor-form-input"
              value={mobileSourceModal.draft}
              onChange={(e) =>
                setMobileSourceModal((m) => (m ? { ...m, draft: e.target.value } : null))
              }
              style={{ width: '100%', marginBottom: '0.75rem' }}
              placeholder="URL oder Quellenangabe"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className="editor-button small"
                onClick={() =>
                  pasteClipboardToDraft((t) =>
                    setMobileSourceModal((m) => (m ? { ...m, draft: t } : null))
                  )
                }
              >
                Aus Zwischenablage
              </button>
              {isUrlOpenable(mobileSourceModal.draft) && (
                <button
                  type="button"
                  className="editor-button small"
                  onClick={() => openUrlFromSource(mobileSourceModal.draft)}
                >
                  URL öffnen
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="editor-button" onClick={() => setMobileSourceModal(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="editor-button primary"
                disabled={
                  (mobileSourceModal.kind === 'correct'
                    ? localItem.correct[mobileSourceModal.index]?.source || ''
                    : localItem.distractors[mobileSourceModal.index]?.source || '') ===
                  mobileSourceModal.draft
                }
                onClick={() => {
                  if (!mobileSourceModal || !localItem) return;
                  const p =
                    mobileSourceModal.kind === 'correct'
                      ? `correct[${mobileSourceModal.index}].source`
                      : `distractors[${mobileSourceModal.index}].source`;
                  handleFieldChange(p, mobileSourceModal.draft);
                  setMobileSourceModal(null);
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Details (langer Text) */}
      {mobileDetailsModal && localItem && (
        <div
          className="editor-modal-overlay editor-modal-overlay--tall"
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-details-modal-title"
          onClick={() => setMobileDetailsModal(null)}
        >
          <div className="editor-modal-panel editor-modal-panel--tall" onClick={(e) => e.stopPropagation()}>
            <h3 id="editor-details-modal-title" className="editor-modal-title">
              Details
            </h3>
            <textarea
              className="editor-form-textarea"
              value={mobileDetailsModal.draft}
              onChange={(e) =>
                setMobileDetailsModal((m) => (m ? { ...m, draft: e.target.value } : null))
              }
              placeholder="Details (optional)"
              style={{ width: '100%', minHeight: '72vh', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button type="button" className="editor-button" onClick={() => setMobileDetailsModal(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="editor-button primary"
                disabled={
                  (mobileDetailsModal.kind === 'correct'
                    ? localItem.correct[mobileDetailsModal.index]?.details || ''
                    : localItem.distractors[mobileDetailsModal.index]?.details || '') ===
                  mobileDetailsModal.draft
                }
                onClick={() => {
                  if (!mobileDetailsModal || !localItem) return;
                  const p =
                    mobileDetailsModal.kind === 'correct'
                      ? `correct[${mobileDetailsModal.index}].details`
                      : `distractors[${mobileDetailsModal.index}].details`;
                  handleFieldChange(p, mobileDetailsModal.draft);
                  setMobileDetailsModal(null);
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Text Parser Modal */}
      {chapterId && localItem && (
        <TextParserModal
          isOpen={showTextParserModal}
          onClose={() => setShowTextParserModal(false)}
          onSave={(parsedDataArray) => {
            if (parsedDataArray.length === 0) return;
            const parsedData = parsedDataArray[0]; // Only use first item
            
            // Apply changes from parsed data to localItem
            const updatedItem: Item = {
              ...localItem,
              level: parsedData.level,
              base: {
                ...localItem.base,
                context: parsedData.baseContext
              },
              correct: parsedData.corrects.map((c, idx) => {
                const existing = localItem.correct[idx];
                return existing ? {
                  ...existing,
                  context: c.context,
                  collectionOrder: c.order,
                  level: c.level
                } : existing;
              }).filter(Boolean) as CorrectEntry[],
              distractors: parsedData.distractors.map((d, idx) => {
                const existing = localItem.distractors[idx];
                return existing ? {
                  ...existing,
                  redirect: d.redirect,
                  context: d.context,
                  level: d.level
                } : existing;
              }).filter(Boolean) as DistractorEntry[],
              meta: {
                ...localItem.meta,
                source: parsedData.source ?? localItem.meta.source,
                detail: parsedData.detail ?? localItem.meta.detail,
                tags: parsedData.tags ?? localItem.meta.tags
              }
            };
            
            setLocalItem(updatedItem);
            setShowTextParserModal(false);
            showToast('✅ Changes applied from text parser', 'success', 2000);
          }}
          chapterId={chapterId}
          initialItem={localItem}
          initialChapterId={chapterId}
        />
      )}
    </div>
  );
}

