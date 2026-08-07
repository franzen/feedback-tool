import { AnnotationEditor } from './annotation-editor.js';
import { captureViewport } from './capture.js';
import { formatMessage, normalizeOptions } from './options.js';
import { buildMetadata, createReport, validateFeedback } from './report.js';
import { WIDGET_STYLES } from './styles.js';

const TOOLS = [
  ['select', '↖', 'toolSelect', 'toolSelectDescription'],
  ['pen', '⌁', 'toolPen'],
  ['arrow', '↗', 'toolArrow'],
  ['highlight', '▭', 'toolHighlight'],
  ['comment', '●', 'toolComment'],
  ['redact', '▦', 'toolRedact'],
];

const COLORS = [
  ['paletteRed', 'colorRed'],
  ['paletteOrange', 'colorOrange'],
  ['paletteYellow', 'colorYellow'],
  ['paletteGreen', 'colorGreen'],
  ['paletteBlue', 'colorBlue'],
  ['palettePurple', 'colorPurple'],
];

function toolMarkup(messages, escape) {
  return TOOLS.map(
    ([name, symbol, labelKey, descriptionKey]) => {
      const label = escape(messages[labelKey]);
      const description = escape(messages[descriptionKey] || messages[labelKey]);
      return `
      <button class="ft-tool" type="button" data-tool="${name}" aria-label="${description}" title="${description}" aria-pressed="${name === 'arrow'}">
        <span class="ft-tool-symbol" aria-hidden="true">${symbol}</span>
        <span>${label}</span>
      </button>
    `;
    },
  ).join('');
}

function colorMarkup(messages, colors, escape) {
  return `
    <div class="ft-palette" role="group" aria-label="${escape(messages.annotationColor)}">
      ${COLORS.map(([colorKey, labelKey], index) => {
        const color = escape(colors[colorKey]);
        const label = escape(messages[labelKey]);
        return `
        <button class="ft-color" type="button" data-color="${color}" aria-label="${label}" title="${label}" aria-pressed="${index === 0}" style="--ft-color:${color}"></button>
      `;
      }).join('')}
    </div>
  `;
}

function isEditableKeyboardTarget(event) {
  const path = event.composedPath?.() || [event.target];
  return path.some((target) =>
    target instanceof HTMLElement
    && (target.matches('input, textarea') || target.isContentEditable));
}

export class FeedbackToolController {
  constructor(options) {
    this.options = normalizeOptions(options);
    this.state = 'idle';
    this.editor = null;
    this.dirty = false;
    this.formDirty = false;
    this.reviewUrl = null;
    this.lastFocused = null;
    this.keyHandler = (event) => this.onKeyDown(event);

    this.host = document.createElement('div');
    this.host.setAttribute('data-feedback-tool-root', '');
    this.host.setAttribute('data-html2canvas-ignore', 'true');
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `<style>${WIDGET_STYLES}</style><div class="ft-root"></div>`;
    this.root = this.shadow.querySelector('.ft-root');
    if (this.options.locale) this.root.lang = this.options.locale;
    Object.entries(this.options.colors).forEach(([name, value]) => {
      this.root.style.setProperty(`--ft-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value);
    });
    document.body.append(this.host);
    this.renderLauncher();
  }

  renderLauncher() {
    if (!this.options.launcher.enabled) {
      this.root.innerHTML = '';
      return;
    }

    const sideStyle = this.options.launcher.position === 'bottom-left' ? 'left:22px;right:auto' : '';
    this.root.innerHTML = `
      <button class="ft-launcher" type="button" style="${sideStyle}" aria-label="${this.escape(this.options.launcher.label)}">
        <span class="ft-launcher-mark" aria-hidden="true">✦</span>
        <span>${this.escape(this.options.launcher.label)}</span>
      </button>
    `;
    this.root.querySelector('.ft-launcher').addEventListener('click', () => this.open());
  }

  escape(value) {
    const element = document.createElement('span');
    element.textContent = String(value);
    return element.innerHTML;
  }

  async open() {
    if (this.state !== 'idle') return;
    this.state = 'capturing';
    this.lastFocused = document.activeElement;
    this.renderCapturing();

    try {
      this.capture = await captureViewport();
      this.metadata = buildMetadata({ capture: this.capture });
      this.renderEditor();
      this.state = 'editing';
    } catch (error) {
      this.state = 'error';
      this.options.onError(error);
      this.renderCaptureError(error);
    }
  }

  renderCapturing() {
    const { messages } = this.options;
    this.root.innerHTML = `
      <div class="ft-overlay ft-capturing" role="dialog" aria-modal="true" aria-label="${this.escape(messages.capturingAriaLabel)}">
        <div class="ft-capturing-card">
          <div class="ft-spinner" aria-hidden="true"></div>
          <h2 class="ft-card-title">${this.escape(messages.capturingTitle)}</h2>
          <p class="ft-card-copy">${this.escape(messages.capturingDescription)}</p>
        </div>
      </div>
    `;
  }

  renderCaptureError(error) {
    const { messages } = this.options;
    this.root.innerHTML = `
      <div class="ft-overlay ft-capturing" role="alertdialog" aria-modal="true" aria-labelledby="ft-error-title">
        <div class="ft-error-card">
          <h2 class="ft-card-title" id="ft-error-title">${this.escape(messages.captureErrorTitle)}</h2>
          <p class="ft-card-copy">${this.escape(error?.message || messages.captureErrorFallback)}</p>
          <div class="ft-error-actions">
            <button class="ft-button" type="button" data-action="cancel-capture">${this.escape(messages.cancel)}</button>
            <button class="ft-button ft-button-primary" type="button" data-action="retry-capture">${this.escape(messages.retry)}</button>
          </div>
        </div>
      </div>
    `;
    this.root.querySelector('[data-action="cancel-capture"]').addEventListener('click', () => this.reset());
    this.root.querySelector('[data-action="retry-capture"]').addEventListener('click', () => {
      this.state = 'idle';
      this.open();
    });
    this.root.querySelector('[data-action="retry-capture"]').focus();
  }

  renderEditor() {
    const { colors, messages } = this.options;
    this.root.innerHTML = `
      <div class="ft-overlay ft-editor" role="dialog" aria-modal="true" aria-label="${this.escape(messages.editorAriaLabel)}">
        <header class="ft-header" data-edit-view>
          <div class="ft-brand">
            <div class="ft-brand-mark" aria-hidden="true">✦</div>
            <div class="ft-brand-copy">
              <span class="ft-brand-title">${this.escape(messages.brandTitle)}</span>
              <span class="ft-brand-subtitle">${this.escape(messages.brandSubtitle)}</span>
            </div>
          </div>
          <div class="ft-header-actions">
            <button class="ft-icon-button" type="button" data-action="undo" aria-label="${this.escape(messages.undo)}" title="${this.escape(messages.undo)}" disabled>↶</button>
            <button class="ft-icon-button" type="button" data-action="redo" aria-label="${this.escape(messages.redo)}" title="${this.escape(messages.redo)}" disabled>↷</button>
            <button class="ft-icon-button" type="button" data-action="close" aria-label="${this.escape(messages.closeEditor)}" title="${this.escape(messages.closeEditor)}">×</button>
          </div>
        </header>
        <div class="ft-workspace" data-edit-view>
          <nav class="ft-toolrail" aria-label="${this.escape(messages.annotationTools)}">${toolMarkup(messages, (value) => this.escape(value))}${colorMarkup(messages, colors, (value) => this.escape(value))}</nav>
          <div class="ft-stage-shell">
            <div class="ft-stage"><canvas data-canvas></canvas></div>
          </div>
        </div>
        <footer class="ft-footer" data-edit-view>
          <div class="ft-footer-actions">
            <button class="ft-button ft-button-danger" type="button" data-action="clear">
              <span class="ft-clear-label">${this.escape(messages.clearAnnotations)}</span><span class="ft-hidden" aria-hidden="true">${this.escape(messages.clear)}</span>
            </button>
            <span class="ft-status" data-status>${this.escape(messages.noAnnotations)}</span>
          </div>
          <button class="ft-button ft-button-primary" type="button" data-action="next">${this.escape(messages.next)}</button>
        </footer>
      </div>
    `;

    const stage = this.root.querySelector('.ft-stage');
    this.editor = new AnnotationEditor({
      canvasElement: this.root.querySelector('[data-canvas]'),
      capture: this.capture,
      colors,
      initialColor: colors.paletteRed,
      stage,
      onCommentRequest: (request) => this.showCommentPopover(request),
      onDirtyChange: (dirty) => { this.dirty = dirty; },
      onHistoryChange: (history) => this.updateHistoryControls(history),
    });

    this.root.querySelectorAll('[data-tool]').forEach((button) => {
      button.addEventListener('click', () => this.selectTool(button.dataset.tool));
    });
    this.root.querySelectorAll('[data-color]').forEach((button) => {
      button.addEventListener('click', () => this.selectColor(button.dataset.color));
    });
    this.root.querySelector('[data-action="undo"]').addEventListener('click', () => this.editor.undo());
    this.root.querySelector('[data-action="redo"]').addEventListener('click', () => this.editor.redo());
    this.root.querySelector('[data-action="clear"]').addEventListener('click', () => this.editor.clear());
    this.root.querySelector('[data-action="close"]').addEventListener('click', () => this.close());
    this.root.querySelector('[data-action="next"]').addEventListener('click', () => this.showReview());
    document.addEventListener('keydown', this.keyHandler, true);
    this.root.querySelector('[data-tool="arrow"]').focus();
  }

  selectTool(tool) {
    this.editor.setTool(tool);
    this.root.querySelectorAll('[data-tool]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.tool === tool));
    });
  }

  selectColor(color) {
    this.editor.setColor(color);
    this.root.querySelectorAll('[data-color]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.color === color));
    });
  }

  updateHistoryControls({ canUndo, canRedo, count }) {
    const undo = this.root.querySelector('[data-action="undo"]');
    const redo = this.root.querySelector('[data-action="redo"]');
    const status = this.root.querySelector('[data-status]');
    if (undo) undo.disabled = !canUndo;
    if (redo) redo.disabled = !canRedo;
    if (status) status.textContent = count
      ? formatMessage(count === 1 ? this.options.messages.annotationCount : this.options.messages.annotationCountPlural, { count })
      : this.options.messages.noAnnotations;
  }

  showCommentPopover(request) {
    this.closeCommentPopover();
    const popover = document.createElement('div');
    popover.className = 'ft-popover';
    popover.setAttribute('role', 'dialog');
    const { messages } = this.options;
    popover.setAttribute('aria-label', messages.addComment);
    const left = Math.min(Math.max(12, request.clientX + 12), window.innerWidth - 332);
    const top = Math.min(Math.max(12, request.clientY + 12), window.innerHeight - 210);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.innerHTML = `
      <label class="ft-popover-label" for="ft-pin-comment">${this.escape(messages.commentPrompt)}</label>
      <textarea class="ft-textarea" id="ft-pin-comment" placeholder="${this.escape(messages.commentPlaceholder)}"></textarea>
      <p class="ft-field-error" data-comment-error></p>
      <div class="ft-popover-actions">
        <button class="ft-button" type="button" data-action="cancel-comment">${this.escape(messages.cancel)}</button>
        <button class="ft-button ft-button-primary" type="button" data-action="save-comment">${this.escape(messages.addPin)}</button>
      </div>
    `;
    this.root.append(popover);
    this.commentPopover = popover;
    const textarea = popover.querySelector('textarea');
    const save = () => {
      const text = textarea.value.trim();
      if (!text) {
        popover.querySelector('[data-comment-error]').textContent = messages.commentRequired;
        textarea.focus();
        return;
      }
      request.save(text);
      this.closeCommentPopover();
    };
    popover.querySelector('[data-action="save-comment"]').addEventListener('click', save);
    popover.querySelector('[data-action="cancel-comment"]').addEventListener('click', () => this.closeCommentPopover());
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) save();
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.closeCommentPopover();
      }
    });
    textarea.focus();
  }

  closeCommentPopover() {
    this.commentPopover?.remove();
    this.commentPopover = null;
  }

  async showReview() {
    const nextButton = this.root.querySelector('[data-action="next"]');
    nextButton.disabled = true;
    nextButton.textContent = this.options.messages.preparing;
    try {
      this.reviewBlob = await this.editor.exportBlob();
      if (this.reviewUrl) URL.revokeObjectURL(this.reviewUrl);
      this.reviewUrl = URL.createObjectURL(this.reviewBlob);
      this.root.querySelectorAll('[data-edit-view]').forEach((element) => element.classList.add('ft-hidden'));
      this.renderReview();
      this.state = 'reviewing';
    } catch (error) {
      this.options.onError(error);
      nextButton.disabled = false;
      nextButton.textContent = this.options.messages.next;
    }
  }

  renderReview() {
    const { messages } = this.options;
    const shell = document.createElement('section');
    shell.className = 'ft-review-shell';
    shell.setAttribute('data-review-shell', '');
    shell.innerHTML = `
      <header class="ft-header">
        <div class="ft-brand">
          <div class="ft-brand-mark" aria-hidden="true">✦</div>
          <div class="ft-brand-copy"><span class="ft-brand-title">${this.escape(messages.reviewTitle)}</span><span class="ft-brand-subtitle">${this.escape(messages.reviewSubtitle)}</span></div>
        </div>
        <button class="ft-icon-button" type="button" data-action="close-review" aria-label="${this.escape(messages.closeEditor)}">×</button>
      </header>
      <div class="ft-review-view">
        <div class="ft-review-preview"><img src="${this.reviewUrl}" alt="${this.escape(messages.screenshotPreviewAlt)}"></div>
        <form class="ft-review-form" novalidate>
          <h2>${this.escape(messages.reviewHeading)}</h2>
          <p class="ft-review-intro">${this.escape(messages.reviewDescription)}</p>
          <div class="ft-field">
            <label for="ft-message">${this.escape(messages.messageLabel)}</label>
            <textarea class="ft-textarea" id="ft-message" name="message" placeholder="${this.escape(messages.messagePlaceholder)}" required></textarea>
            <p class="ft-field-error" data-error="message"></p>
          </div>
          ${this.options.collectEmail ? `
            <div class="ft-field">
              <label for="ft-email">${this.escape(messages.emailLabel)} <span class="ft-optional">${this.escape(messages.optional)}</span></label>
              <input class="ft-input" id="ft-email" name="email" type="email" autocomplete="email" placeholder="${this.escape(messages.emailPlaceholder)}">
              <p class="ft-field-error" data-error="email"></p>
            </div>
          ` : ''}
          <div class="ft-meta-card">
            <p class="ft-meta-title">${this.escape(messages.attachedAutomatically)}</p>
            <div class="ft-meta-row"><span>${this.escape(messages.page)}</span><span title="${this.escape(this.metadata.url)}">${this.escape(this.metadata.title || this.metadata.url)}</span></div>
            <div class="ft-meta-row"><span>${this.escape(messages.viewport)}</span><span>${this.metadata.viewport.width} × ${this.metadata.viewport.height}</span></div>
            <div class="ft-meta-row"><span>${this.escape(messages.annotations)}</span><span>${this.editor.getAnnotations().length}</span></div>
          </div>
          <p class="ft-submit-error ft-hidden" data-submit-error role="alert"></p>
        </form>
      </div>
      <footer class="ft-footer">
        <button class="ft-button" type="button" data-action="back">${this.escape(messages.backToAnnotation)}</button>
        <button class="ft-button ft-button-primary" type="button" data-action="submit">${this.escape(messages.submitFeedback)}</button>
      </footer>
    `;
    this.root.querySelector('.ft-editor').append(shell);
    shell.querySelector('[data-action="back"]').addEventListener('click', () => this.hideReview());
    shell.querySelector('[data-action="close-review"]').addEventListener('click', () => this.close());
    shell.querySelector('[data-action="submit"]').addEventListener('click', () => this.submit());
    shell.querySelectorAll('textarea, input').forEach((input) => input.addEventListener('input', () => { this.formDirty = true; }));
    shell.querySelector('[name="message"]').focus();
  }

  hideReview() {
    this.root.querySelector('[data-review-shell]')?.remove();
    this.root.querySelectorAll('[data-edit-view]').forEach((element) => element.classList.remove('ft-hidden'));
    const nextButton = this.root.querySelector('[data-action="next"]');
    nextButton.disabled = false;
    nextButton.textContent = this.options.messages.next;
    this.state = 'editing';
    this.editor.resizeToFit();
    this.root.querySelector('[data-tool][aria-pressed="true"]')?.focus();
  }

  async submit() {
    const shell = this.root.querySelector('[data-review-shell]');
    const form = shell.querySelector('form');
    const validation = validateFeedback(
      form.elements.message.value,
      this.options.collectEmail ? form.elements.email.value : '',
      {
        feedbackRequired: this.options.messages.feedbackRequired,
        invalidEmail: this.options.messages.invalidEmail,
      },
    );
    shell.querySelector('[data-error="message"]').textContent = validation.errors.message || '';
    const emailError = shell.querySelector('[data-error="email"]');
    if (emailError) emailError.textContent = validation.errors.email || '';
    if (!validation.valid) {
      form.querySelector(validation.errors.message ? '[name="message"]' : '[name="email"]').focus();
      return;
    }

    const button = shell.querySelector('[data-action="submit"]');
    const errorBox = shell.querySelector('[data-submit-error]');
    button.disabled = true;
    button.textContent = this.options.messages.submitting;
    errorBox.classList.add('ft-hidden');

    const report = createReport({
      feedback: validation.values,
      image: this.reviewBlob,
      annotations: this.editor.getAnnotations(),
      metadata: this.metadata,
    });

    try {
      await this.options.onSubmit(report);
      this.lastReport = report;
      this.state = 'success';
      this.renderSuccess(shell);
    } catch (error) {
      this.options.onError(error);
      errorBox.textContent = error?.message || this.options.messages.submitError;
      errorBox.classList.remove('ft-hidden');
      button.disabled = false;
      button.textContent = this.options.messages.submitFeedback;
    }
  }

  renderSuccess(reviewShell) {
    const { messages } = this.options;
    reviewShell.remove();
    const success = document.createElement('section');
    success.className = 'ft-success-view';
    success.innerHTML = `
      <div class="ft-success-card" role="status">
        <div class="ft-success-mark" aria-hidden="true">✓</div>
        <h2>${this.escape(messages.successTitle)}</h2>
        <p>${this.escape(messages.successDescription)}</p>
        <button class="ft-button ft-button-primary" type="button" data-action="done">${this.escape(messages.done)}</button>
      </div>
    `;
    this.root.querySelector('.ft-editor').append(success);
    success.querySelector('[data-action="done"]').addEventListener('click', () => this.reset());
    success.querySelector('[data-action="done"]').focus();
  }

  onKeyDown(event) {
    const editable = isEditableKeyboardTarget(event);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !editable) {
      event.preventDefault();
      event.shiftKey ? this.editor?.redo() : this.editor?.undo();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y' && !editable) {
      event.preventDefault();
      this.editor?.redo();
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && !editable && this.state === 'editing') {
      event.preventDefault();
      this.editor?.deleteSelected();
      return;
    }
    if (event.key === 'Escape' && !this.commentPopover) {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') this.trapFocus(event);
  }

  trapFocus(event) {
    const overlay = this.root.querySelector('.ft-overlay');
    if (!overlay) return;
    const focusable = Array.from(overlay.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
      .filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.shadow.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.shadow.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  close({ force = false } = {}) {
    if (!force && (this.dirty || this.formDirty) && !window.confirm(this.options.messages.discardConfirm)) return false;
    this.reset();
    return true;
  }

  reset() {
    document.removeEventListener('keydown', this.keyHandler, true);
    this.closeCommentPopover();
    this.editor?.dispose();
    this.editor = null;
    if (this.reviewUrl) URL.revokeObjectURL(this.reviewUrl);
    this.reviewUrl = null;
    this.reviewBlob = null;
    this.capture = null;
    this.metadata = null;
    this.dirty = false;
    this.formDirty = false;
    this.state = 'idle';
    this.renderLauncher();
    this.lastFocused?.focus?.();
    this.lastFocused = null;
  }

  destroy() {
    if (this.state !== 'idle') this.close({ force: true });
    this.host.remove();
    this.state = 'destroyed';
  }
}

export function createFeedbackTool(options = {}) {
  const controller = new FeedbackToolController(options);
  return {
    open: () => controller.open(),
    close: () => controller.close(),
    destroy: () => controller.destroy(),
  };
}
