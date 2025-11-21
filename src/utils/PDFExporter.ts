// PDF Export Utility
// Generates PDF reports for learning progress

import jsPDF from 'jspdf';
import type { Universe, Theme, Item } from '@/types/content.types';
import type { LearningState } from '@/types/progress.types';
import { jsonLoader } from '@/infra/utils/JSONLoader';
import { localProgressProvider } from '@/infra/providers/LocalProgressProvider';
import { getItemScore } from './ScoreCalculator';

interface LastSelection {
  universeId: string;
  themeId: string;
  chapterId: string;
  mode: string;
}

interface ExportScope {
  universe: Universe;
  theme?: Theme;
  chapterId?: string;
  items: Item[];
}

// Removed ASCII ship emoji

export class PDFExporter {
  private doc!: jsPDF; // Will be initialized in generatePDF()
  private pageWidth: number;
  private pageHeight: number;
  private marginTop: number = 20;
  private marginLeft: number = 15;
  private marginRight: number = 15;
  private currentY: number = 0;
  private lineHeight: number = 7;

  constructor() {
    // Set default A4 dimensions - will be refreshed in generatePDF()
    this.pageWidth = 210;
    this.pageHeight = 297;
    this.currentY = this.marginTop;
  }

  /**
   * Get current selection from localStorage
   * Also checks for partial selections (universe only, or universe + theme)
   */
  static getCurrentSelection(): LastSelection | null {
    const selectionStr = localStorage.getItem('wordrush_lastSelection');
    if (!selectionStr) return null;
    
    try {
      const selection = JSON.parse(selectionStr) as LastSelection;
      // Return even if chapterId is missing - we can export universe or theme
      return selection;
    } catch {
      return null;
    }
  }

  /**
   * Load items for export based on selection
   */
  static async loadItemsForExport(): Promise<ExportScope | null> {
    const selection = this.getCurrentSelection();
    if (!selection || !selection.universeId) {
      throw new Error('Keine Auswahl gefunden. Bitte wähle zuerst ein Universum oder einen Planeten aus.');
    }

    const universe = await jsonLoader.loadUniverse(selection.universeId);
    if (!universe) {
      throw new Error(`Universum "${selection.universeId}" konnte nicht geladen werden.`);
    }

    const items: Item[] = [];

    // If chapter is selected, load only that chapter
    if (selection.chapterId && selection.themeId) {
      const theme = await jsonLoader.loadTheme(selection.universeId, selection.themeId);
      if (!theme) {
        throw new Error(`Theme "${selection.themeId}" konnte nicht geladen werden.`);
      }

      const chapterItems = await jsonLoader.loadChapter(
        selection.universeId,
        selection.themeId,
        selection.chapterId
      );
      items.push(...chapterItems);

      return {
        universe,
        theme,
        chapterId: selection.chapterId,
        items
      };
    }

    // If theme is selected but no chapter, load all chapters of that theme
    if (selection.themeId && !selection.chapterId) {
      const theme = await jsonLoader.loadTheme(selection.universeId, selection.themeId);
      if (!theme) {
        throw new Error(`Theme "${selection.themeId}" konnte nicht geladen werden.`);
      }

      for (const chapterId of Object.keys(theme.chapters)) {
        const chapterItems = await jsonLoader.loadChapter(
          selection.universeId,
          selection.themeId,
          chapterId
        );
        items.push(...chapterItems);
      }

      return {
        universe,
        theme,
        items
      };
    }

    // If only universe is selected, load all chapters from all themes
    if (selection.universeId && !selection.themeId) {
      for (const themeId of universe.themes) {
        const theme = await jsonLoader.loadTheme(selection.universeId, themeId);
        if (!theme) continue;

        for (const chapterId of Object.keys(theme.chapters)) {
          const chapterItems = await jsonLoader.loadChapter(
            selection.universeId,
            themeId,
            chapterId
          );
          items.push(...chapterItems);
        }
      }

      return {
        universe,
        items
      };
    }

    throw new Error('Ungültige Auswahl. Bitte wähle ein Universum oder einen Planeten aus.');
  }


  /**
   * Add page header with title, using theme colors (no emojis - encoding issues)
   */
  private addPageHeader(universe: Universe, theme?: Theme, chapterId?: string): void {
    // Get color - prefer theme color, fallback to universe color
    const colorHex = theme?.colorPrimary || universe.colorPrimary;
    const rgb = this.hexToRgb(colorHex);
    
    // Build title WITHOUT icons (emojis cause encoding issues in PDF)
    let title = universe.name;
    if (theme) {
      title += ` - ${theme.name}`;
    }
    if (chapterId && theme) {
      const chapterConfig = theme.chapters[chapterId];
      if (chapterConfig) {
        title += ` - ${chapterId}`;
      }
    }

    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(rgb.r, rgb.g, rgb.b);
    
    this.doc.text(title, this.marginLeft, this.currentY);
    
    this.currentY += this.lineHeight * 1.2;
    
    // Add separator line with same color
    this.doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    this.doc.setLineWidth(0.8);
    this.doc.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);
    this.currentY += this.lineHeight * 0.8;
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return { r, g, b };
  }

  /**
   * Add page footer with copyright (no ship image - SVG not supported)
   */
  private addPageFooter(pageNumber: number): void {
    const footerY = this.pageHeight - 6; // Extremely close to bottom
    
    // Left: Page number
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(120, 120, 120);
    this.doc.text(`Seite ${pageNumber}`, this.marginLeft, footerY);
    
    // Center: Copyright
    const copyrightText = 'WordRush by Tim Weyrauch';
    const copyrightWidth = this.doc.getTextWidth(copyrightText);
    const copyrightX = (this.pageWidth - copyrightWidth) / 2;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(120, 120, 120);
    this.doc.text(copyrightText, copyrightX, footerY);
  }

  /**
   * Calculate the height needed for an item
   */
  private calculateItemHeight(item: Item, learningState: LearningState): number {
    let height = 0;
    
    // Get real score info
    const scoreInfo = getItemScore(item.id, item, learningState);
    
    // Header height (with wrapping)
    this.doc.setFontSize(15);
    this.doc.setFont('helvetica', 'bold');
    const headerWidth = this.pageWidth - this.marginLeft - this.marginRight;
    const headerText = `${item.base.word || 'N/A'} (Level ${item.level}) - ${scoreInfo.bestScore} / ${scoreInfo.maxScore} Punkte`;
    const headerLines = this.doc.splitTextToSize(headerText, headerWidth);
    height += headerLines.length * this.lineHeight * 1.4;
    height += this.lineHeight * 0.2; // Small spacing after header
    
    // Correct entries height
    if (item.correct && item.correct.length > 0) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      const textWidth = this.pageWidth - this.marginLeft - this.marginRight - 3;
      
      for (const correct of item.correct) {
        const word = correct.entry.word || 'N/A';
        const context = correct.context || '';
        
        let text: string;
        if (context && context.includes(word)) {
          // Word is in context - will be shown as formatted text
          text = `${context}`;
        } else if (context) {
          // Word not in context - show both
          text = `${word} - ${context}`;
        } else {
          // No context
          text = word;
        }
        
        // Calculate wrapped lines
        const lines = this.doc.splitTextToSize(text, textWidth);
        height += lines.length * this.lineHeight * 1.1;
      }
    }
    
    // Distractors height
    if (item.distractors && item.distractors.length > 0) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      const textWidth = this.pageWidth - this.marginLeft - this.marginRight - 3;
      
      for (const distractor of item.distractors) {
        const word = distractor.entry.word || 'N/A';
        const redirect = distractor.redirect || '';
        const context = distractor.context || '';
        
        const displayText = redirect || context;
        let text: string;
        if (displayText && displayText.includes(word)) {
          // Word is in text - will be shown as formatted
          text = displayText;
        } else if (displayText) {
          // Word not in text - show both
          text = `${word} - ${displayText}`;
        } else {
          // No additional text
          text = word;
        }
        
        // Calculate wrapped lines
        const lines = this.doc.splitTextToSize(text, textWidth);
        height += lines.length * this.lineHeight * 1.1;
      }
    }
    
    // Spacing after item
    height += this.lineHeight * 0.8;
    
    return height;
  }

  /**
   * Add wrapped text with line breaks
   */
  private addWrappedText(text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const lines = this.doc.splitTextToSize(text, maxWidth);
    let currentY = y;
    
    for (const line of lines) {
      this.doc.text(line, x, currentY);
      currentY += lineHeight;
    }
    
    return currentY;
  }

  /**
   * Add text with bold highlighting for a specific word
   */
  private addTextWithBoldWord(
    text: string, 
    wordToBold: string, 
    x: number, 
    y: number, 
    maxWidth: number, 
    lineHeight: number
  ): number {
    let currentY = y;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    
    for (const line of lines) {
      // Check if the word to bold is in this line
      if (line.includes(wordToBold)) {
        // Split the line at the word position
        const index = line.indexOf(wordToBold);
        const before = line.substring(0, index);
        const word = line.substring(index, index + wordToBold.length);
        const after = line.substring(index + wordToBold.length);
        
        let currentX = x;
        
        // Print text before the word (normal)
        if (before) {
          this.doc.setFont('helvetica', 'normal');
          this.doc.text(before, currentX, currentY);
          currentX += this.doc.getTextWidth(before);
        }
        
        // Print the word (bold)
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(word, currentX, currentY);
        currentX += this.doc.getTextWidth(word);
        
        // Print text after the word (normal)
        if (after) {
          this.doc.setFont('helvetica', 'normal');
          this.doc.text(after, currentX, currentY);
        }
      } else {
        // No word to bold in this line, print normally
        this.doc.text(line, x, currentY);
      }
      
      currentY += lineHeight;
    }
    
    return currentY;
  }

  /**
   * Add an item to the PDF
   */
  private addItemToPDF(
    item: Item,
    learningState: LearningState
  ): void {
    const scoreInfo = getItemScore(item.id, item, learningState);

    // Item header: Base Word (bold, black) + Level/Score (normal, gray)
    this.doc.setFontSize(15);
    const headerWidth = this.pageWidth - this.marginLeft - this.marginRight;
    
    const baseWord = item.base.word || 'N/A';
    const levelScoreText = ` (Level ${item.level}) - ${scoreInfo.bestScore} / ${scoreInfo.maxScore} Punkte`;
    
    // Calculate if text fits on one line
    this.doc.setFont('helvetica', 'bold');
    const baseWordWidth = this.doc.getTextWidth(baseWord);
    this.doc.setFont('helvetica', 'normal');
    const levelScoreWidth = this.doc.getTextWidth(levelScoreText);
    
    if (baseWordWidth + levelScoreWidth <= headerWidth) {
      // Fits on one line - print in two parts with different styles
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(baseWord, this.marginLeft, this.currentY);
      
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(100, 100, 100); // Gray
      this.doc.text(levelScoreText, this.marginLeft + baseWordWidth, this.currentY);
      
      this.currentY += this.lineHeight * 1.4;
    } else {
      // Doesn't fit - wrap as single string (fallback)
      const fullHeader = `${baseWord}${levelScoreText}`;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);
      this.currentY = this.addWrappedText(fullHeader, this.marginLeft, this.currentY, headerWidth, this.lineHeight * 1.4);
    }
    
    this.currentY += this.lineHeight * 0.2; // Small spacing after header

    // Correct entries
    if (item.correct && item.correct.length > 0) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(0, 100, 0); // Dark green
      
      const textWidth = this.pageWidth - this.marginLeft - this.marginRight;
      
      for (let i = 0; i < item.correct.length; i++) {
        const correct = item.correct[i];
        const word = (correct.entry.word || 'N/A').trim().replace(/^[''`]+/, ''); // Remove leading quotes
        const context = (correct.context || '').trim().replace(/^[''`]+/, ''); // Remove leading quotes
        
        this.doc.setFont('helvetica', 'normal');
        
        if (context && context.includes(word)) {
          // Word is in context - show context with word in bold
          this.currentY = this.addTextWithBoldWord(
            context, 
            word, 
            this.marginLeft, 
            this.currentY, 
            textWidth, 
            this.lineHeight * 1.1
          );
        } else if (context) {
          // Word not in context - show both
          const displayText = `${word} - ${context}`;
          this.doc.setFont('helvetica', 'normal');
          this.currentY = this.addWrappedText(
            displayText, 
            this.marginLeft, 
            this.currentY, 
            textWidth, 
            this.lineHeight * 1.1
          );
        } else {
          // No context - just show word
          this.doc.setFont('helvetica', 'normal');
          this.currentY = this.addWrappedText(
            word, 
            this.marginLeft, 
            this.currentY, 
            textWidth, 
            this.lineHeight * 1.1
          );
        }
      }
    }

    // Distractors
    if (item.distractors && item.distractors.length > 0) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(150, 0, 0); // Dark red
      
      const textWidth = this.pageWidth - this.marginLeft - this.marginRight;
      
      for (let i = 0; i < item.distractors.length; i++) {
        const distractor = item.distractors[i];
        const word = (distractor.entry.word || 'N/A').trim().replace(/^[''`]+/, ''); // Remove leading quotes
        const redirect = (distractor.redirect || '').trim().replace(/^[''`]+/, ''); // Remove leading quotes
        const context = (distractor.context || '').trim().replace(/^[''`]+/, ''); // Remove leading quotes
        
        const displayText = redirect || context;
        this.doc.setFont('helvetica', 'normal');
        
        if (displayText && displayText.includes(word)) {
          // Word is in text - show text with word in bold
          this.currentY = this.addTextWithBoldWord(
            displayText, 
            word, 
            this.marginLeft, 
            this.currentY, 
            textWidth, 
            this.lineHeight * 1.1
          );
        } else if (displayText) {
          // Word not in text - show both
          const fullText = `${word} - ${displayText}`;
          this.doc.setFont('helvetica', 'normal');
          this.currentY = this.addWrappedText(
            fullText, 
            this.marginLeft, 
            this.currentY, 
            textWidth, 
            this.lineHeight * 1.1
          );
        } else {
          // No additional text - just show word
          this.doc.setFont('helvetica', 'normal');
          this.currentY = this.addWrappedText(
            word, 
            this.marginLeft, 
            this.currentY, 
            textWidth, 
            this.lineHeight * 1.1
          );
        }
      }
    }

    // Add spacing between items
    this.currentY += this.lineHeight * 0.8;
  }

  /**
   * Generate PDF and trigger download
   */
  async generatePDF(): Promise<void> {
    try {
      // Create FRESH PDF document for each export (fixes cache issue)
      this.doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      this.pageWidth = this.doc.internal.pageSize.getWidth();
      this.pageHeight = this.doc.internal.pageSize.getHeight();
      this.currentY = this.marginTop;
      
      // Load export scope
      const scope = await PDFExporter.loadItemsForExport();
      if (!scope || scope.items.length === 0) {
        throw new Error('Keine Items zum Exportieren gefunden.');
      }

      // Load learning state
      const learningState = await localProgressProvider.getLearningState();

      // Add first page header
      this.addPageHeader(scope.universe, scope.theme, scope.chapterId);

      // Track current theme and chapter for page breaks
      let currentTheme: Theme | undefined = scope.theme;
      let currentChapterId: string | undefined = scope.chapterId;
      let lastThemeId: string | undefined = scope.theme?.id;
      let lastChapterId: string | undefined = scope.chapterId;
      
      // Add all items
      for (let i = 0; i < scope.items.length; i++) {
        const item = scope.items[i];
        
        // Check if theme OR chapter changed - force page break
        const themeChanged = item.theme !== lastThemeId;
        const chapterChanged = item.chapter !== lastChapterId;
        
        if (themeChanged || chapterChanged) {
          // Load new theme if changed
          if (themeChanged) {
            const loadedTheme = await jsonLoader.loadTheme(scope.universe.id, item.theme);
            if (loadedTheme) {
              currentTheme = loadedTheme;
              lastThemeId = item.theme;
            }
          }
          
          // Update chapter tracking
          if (chapterChanged) {
            currentChapterId = item.chapter;
            lastChapterId = item.chapter;
          }
          
          // Force new page with updated header (only if not first item)
          if (i > 0) {
            const currentPage = (this.doc.internal.pages.length - 1) || 1;
            this.addPageFooter(currentPage);
            this.doc.addPage();
            this.currentY = this.marginTop;
            this.addPageHeader(scope.universe, currentTheme, currentChapterId);
          }
        }
        
        // Calculate item height before adding
        const itemHeight = this.calculateItemHeight(item, learningState);
        const availableHeight = this.pageHeight - 10 - this.currentY; // Only 10mm from bottom for footer
        
        // If item doesn't fit on current page, start new page
        // IMPORTANT: Never break within an item
        if (itemHeight > availableHeight) {
          const currentPage = (this.doc.internal.pages.length - 1) || 1;
          this.addPageFooter(currentPage);
          this.doc.addPage();
          this.currentY = this.marginTop;
          this.addPageHeader(scope.universe, currentTheme, currentChapterId);
        }
        
        // Add item (will handle text wrapping internally)
        this.addItemToPDF(item, learningState);
      }

      // Add footer to last page
      const totalPages = (this.doc.internal.pages.length - 1) || 1;
      this.addPageFooter(totalPages);

      // Generate filename
      let filename = scope.universe.name;
      if (scope.theme) {
        filename += `_${scope.theme.name}`;
      }
      if (scope.chapterId) {
        filename += `_${scope.chapterId}`;
      }
      filename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      filename += '_wordrush.pdf';

      // Save PDF
      this.doc.save(filename);
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pdfExporter = new PDFExporter();

