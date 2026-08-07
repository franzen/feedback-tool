export const DEFAULT_FEEDBACK_MESSAGES = Object.freeze({
  launcherLabel: 'Give feedback',
  capturingAriaLabel: 'Capturing the visible page',
  capturingTitle: 'Preparing your screenshot',
  capturingDescription: 'This usually takes just a moment.',
  captureErrorTitle: "We couldn't capture this page",
  captureErrorFallback: 'Please try the capture again.',
  cancel: 'Cancel',
  retry: 'Retry',
  editorAriaLabel: 'Annotate screenshot',
  brandTitle: 'Screen feedback',
  brandSubtitle: 'Show exactly what needs attention',
  undo: 'Undo',
  redo: 'Redo',
  closeEditor: 'Close editor',
  annotationTools: 'Annotation tools',
  annotationColor: 'Annotation color',
  toolSelect: 'Edit',
  toolSelectDescription: 'Select an annotation to move, resize, or delete it',
  toolPen: 'Pen',
  toolArrow: 'Arrow',
  toolHighlight: 'Highlight',
  toolComment: 'Comment',
  toolRedact: 'Hide',
  colorRed: 'Red',
  colorOrange: 'Orange',
  colorYellow: 'Yellow',
  colorGreen: 'Green',
  colorBlue: 'Blue',
  colorPurple: 'Purple',
  clearAnnotations: 'Clear annotations',
  clear: 'Clear',
  noAnnotations: 'No annotations yet',
  annotationCount: '{count} annotation',
  annotationCountPlural: '{count} annotations',
  next: 'Next',
  addComment: 'Add comment',
  commentPrompt: 'What should we know?',
  commentPlaceholder: 'Add a short comment…',
  commentRequired: 'Enter a comment for this pin.',
  addPin: 'Add pin',
  preparing: 'Preparing…',
  reviewTitle: 'Review feedback',
  reviewSubtitle: 'One last step before sending',
  screenshotPreviewAlt: 'Annotated screenshot preview',
  reviewHeading: 'Tell us a little more',
  reviewDescription: 'Your screenshot and browser details will be attached automatically.',
  messageLabel: 'What happened?',
  messagePlaceholder: 'Describe the problem or suggestion…',
  emailLabel: 'Email',
  optional: 'Optional',
  emailPlaceholder: 'you@example.com',
  attachedAutomatically: 'Attached automatically',
  page: 'Page',
  viewport: 'Viewport',
  annotations: 'Annotations',
  backToAnnotation: 'Back to annotation',
  submitFeedback: 'Submit feedback',
  feedbackRequired: 'Please describe what happened or what should change.',
  invalidEmail: 'Enter a valid email address or leave this field empty.',
  submitting: 'Submitting…',
  submitError: 'The feedback could not be submitted. Please try again.',
  successTitle: 'Feedback captured',
  successDescription: 'Thanks—your annotated report is ready.',
  done: 'Done',
  discardConfirm: 'Discard this feedback and its annotations?',
});

export const DEFAULT_FEEDBACK_COLORS = Object.freeze({
  accent: '#6558d3',
  accentHover: '#5146b7',
  onAccent: '#ffffff',
  ink: '#172034',
  muted: '#667085',
  border: '#d9deea',
  panel: '#ffffff',
  soft: '#f5f6fa',
  overlay: 'rgba(15, 23, 42, .54)',
  editor: '#eef0f5',
  workspace: '#e8eaf0',
  tool: '#475467',
  inputBorder: '#cfd5e1',
  danger: '#b42318',
  dangerSurface: '#fef3f2',
  success: '#067647',
  successSurface: '#e7f8ef',
  control: '#6558d3',
  redact: '#344054',
  redactPreview: 'rgba(30, 41, 59, .42)',
  paletteRed: '#e23d54',
  paletteOrange: '#f97316',
  paletteYellow: '#eab308',
  paletteGreen: '#16a34a',
  paletteBlue: '#2563eb',
  palettePurple: '#6558d3',
});

export function formatMessage(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match);
}

export function normalizeOptions(options = {}) {
  const messages = { ...DEFAULT_FEEDBACK_MESSAGES, ...options.messages };
  const requestedColors = options.colors || {};
  const legacyAccent = options.accentColor;
  const accent = requestedColors.accent || legacyAccent || DEFAULT_FEEDBACK_COLORS.accent;
  const colors = {
    ...DEFAULT_FEEDBACK_COLORS,
    ...requestedColors,
    accent,
  };
  if (!requestedColors.accentHover && legacyAccent) colors.accentHover = accent;
  if (!requestedColors.control && (requestedColors.accent || legacyAccent)) colors.control = accent;

  const launcher = options.launcher === false ? { enabled: false } : {
    enabled: options.launcher?.enabled ?? true,
    label: options.launcher?.label || messages.launcherLabel,
    position: options.launcher?.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
  };

  return {
    collectEmail: options.collectEmail ?? true,
    colors,
    launcher,
    locale: typeof options.locale === 'string' ? options.locale : '',
    messages,
    onError: typeof options.onError === 'function' ? options.onError : () => {},
    onSubmit: typeof options.onSubmit === 'function' ? options.onSubmit : async () => {},
  };
}
