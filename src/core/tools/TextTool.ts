import { Text, TextStyle } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { TextToolOptions } from '@/types';
import { hexToNumber } from '@/utils';

/**
 * Text tool for adding labels and annotations
 */
export class TextTool extends BaseTool {
  readonly id = 'text';
  readonly name = 'Text';
  readonly icon = 'Type';
  readonly shortcut = 'T';

  private isEditing: boolean = false;
  private currentText: Text | null = null;
  private inputElement: HTMLInputElement | null = null;

  private options: TextToolOptions = {
    size: 24,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
    fontFamily: 'IM Fell English',
    fontSize: 24,
    fontWeight: 400,
    fontStyle: 'normal',
    textAlign: 'left',
  };

  setOptions(options: Partial<TextToolOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): TextToolOptions {
    return { ...this.options };
  }

  getCursor(): ToolCursor {
    return { type: 'default' };
  }

  onPointerDown(ctx: ToolContext): void {
    if (!ctx.activeLayer) return;

    if (this.isEditing) {
      // Finish current text
      this.finishEditing(ctx);
    }

    // Start new text input
    this.startEditing(ctx);
  }

  onKeyDown(ctx: ToolContext, key: string): void {
    if (key === 'Escape' && this.isEditing) {
      this.cancelEditing();
    } else if (key === 'Enter' && this.isEditing) {
      this.finishEditing(ctx);
    }
  }

  /**
   * Start text editing at position
   */
  private startEditing(ctx: ToolContext): void {
    this.isEditing = true;

    // Create text object with placeholder
    const style = new TextStyle({
      fontFamily: this.options.fontFamily,
      fontSize: this.options.fontSize,
      fontWeight: this.options.fontWeight.toString() as '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'normal' | 'bold' | 'bolder' | 'lighter',
      fontStyle: this.options.fontStyle,
      fill: this.options.primaryColor,
      align: this.options.textAlign,
    });

    this.currentText = new Text({ text: '|', style });
    this.currentText.position.set(ctx.worldPosition.x, ctx.worldPosition.y);
    this.currentText.alpha = this.options.opacity;

    ctx.activeLayer?.addContent(this.currentText);

    // Create visible input for text entry
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.style.position = 'fixed';
    this.inputElement.style.left = '50%';
    this.inputElement.style.top = '10px';
    this.inputElement.style.transform = 'translateX(-50%)';
    this.inputElement.style.zIndex = '10000';
    this.inputElement.style.padding = '8px';
    this.inputElement.style.border = '2px solid #00aaff';
    this.inputElement.style.borderRadius = '4px';
    this.inputElement.style.backgroundColor = '#1a1a2e';
    this.inputElement.style.color = '#ffffff';
    this.inputElement.style.fontSize = '16px';
    this.inputElement.style.outline = 'none';
    this.inputElement.placeholder = 'Type text (Enter to finish, Esc to cancel)';
    document.body.appendChild(this.inputElement);

    // Focus after a small delay to ensure it's rendered
    setTimeout(() => {
      this.inputElement?.focus();
    }, 10);

    this.inputElement.addEventListener('input', () => {
      if (this.currentText && this.inputElement) {
        this.currentText.text = this.inputElement.value || '|';
      }
    });

    // Handle keyboard events directly on the input element
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancelEditing();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.finishEditing(ctx);
      }
    });
  }

  /**
   * Finish editing and commit text
   */
  private finishEditing(ctx: ToolContext): void {
    if (this.currentText && this.inputElement) {
      const text = this.inputElement.value.trim();
      if (text) {
        this.currentText.text = text;
      } else {
        // Remove empty text
        if (this.currentText.parent) {
          this.currentText.parent.removeChild(this.currentText);
        }
        this.currentText.destroy();
      }
    }

    this.cleanup();
    ctx.activeLayer?.markDirty();
  }

  /**
   * Cancel editing
   */
  private cancelEditing(): void {
    if (this.currentText?.parent) {
      this.currentText.parent.removeChild(this.currentText);
      this.currentText.destroy();
    }
    this.cleanup();
  }

  /**
   * Cleanup editing state
   */
  private cleanup(): void {
    this.isEditing = false;
    this.currentText = null;
    if (this.inputElement) {
      document.body.removeChild(this.inputElement);
      this.inputElement = null;
    }
  }

  onPointerUp(_ctx: ToolContext): ToolOperationResult | null {
    if (!this.isEditing) return null;

    return {
      type: 'text',
      layerId: _ctx.activeLayer?.id ?? '',
      undoData: {},
      redoData: {},
    };
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    if (!this.isEditing) {
      const zoom = ctx.engine.getViewport()?.zoom ?? 1;

      // Text cursor
      this.previewGraphics.setStrokeStyle({
        width: 2 / zoom,
        color: hexToNumber(this.options.primaryColor),
        alpha: 0.8,
      });
      this.previewGraphics.moveTo(ctx.worldPosition.x, ctx.worldPosition.y);
      this.previewGraphics.lineTo(ctx.worldPosition.x, ctx.worldPosition.y + this.options.fontSize);
      this.previewGraphics.stroke();
    }
  }

  onDeactivate(ctx: ToolContext): void {
    if (this.isEditing) {
      this.finishEditing(ctx);
    }
    super.onDeactivate(ctx);
  }
}
