export interface FeedbackToolLauncherOptions {
  enabled?: boolean;
  label?: string;
  position?: 'bottom-left' | 'bottom-right';
}

export interface FeedbackToolMessages {
  launcherLabel: string;
  capturingAriaLabel: string;
  capturingTitle: string;
  capturingDescription: string;
  captureErrorTitle: string;
  captureErrorFallback: string;
  cancel: string;
  retry: string;
  editorAriaLabel: string;
  brandTitle: string;
  brandSubtitle: string;
  undo: string;
  redo: string;
  closeEditor: string;
  annotationTools: string;
  annotationColor: string;
  toolSelect: string;
  toolSelectDescription: string;
  toolPen: string;
  toolArrow: string;
  toolHighlight: string;
  toolComment: string;
  toolRedact: string;
  colorRed: string;
  colorOrange: string;
  colorYellow: string;
  colorGreen: string;
  colorBlue: string;
  colorPurple: string;
  clearAnnotations: string;
  clear: string;
  noAnnotations: string;
  annotationCount: string;
  annotationCountPlural: string;
  next: string;
  addComment: string;
  commentPrompt: string;
  commentPlaceholder: string;
  commentRequired: string;
  addPin: string;
  preparing: string;
  reviewTitle: string;
  reviewSubtitle: string;
  screenshotPreviewAlt: string;
  reviewHeading: string;
  reviewDescription: string;
  messageLabel: string;
  messagePlaceholder: string;
  emailLabel: string;
  optional: string;
  emailPlaceholder: string;
  attachedAutomatically: string;
  page: string;
  viewport: string;
  annotations: string;
  backToAnnotation: string;
  submitFeedback: string;
  feedbackRequired: string;
  invalidEmail: string;
  submitting: string;
  submitError: string;
  successTitle: string;
  successDescription: string;
  done: string;
  discardConfirm: string;
}

export interface FeedbackToolColors {
  accent: string;
  accentHover: string;
  onAccent: string;
  ink: string;
  muted: string;
  border: string;
  panel: string;
  soft: string;
  overlay: string;
  editor: string;
  workspace: string;
  tool: string;
  inputBorder: string;
  danger: string;
  dangerSurface: string;
  success: string;
  successSurface: string;
  control: string;
  redact: string;
  redactPreview: string;
  paletteRed: string;
  paletteOrange: string;
  paletteYellow: string;
  paletteGreen: string;
  paletteBlue: string;
  palettePurple: string;
}

export interface FeedbackToolOptions {
  /** @deprecated Use colors.accent instead. */
  accentColor?: string;
  collectEmail?: boolean;
  colors?: Partial<FeedbackToolColors>;
  launcher?: false | FeedbackToolLauncherOptions;
  locale?: string;
  messages?: Partial<FeedbackToolMessages>;
  onSubmit?: (report: FeedbackReport) => void | Promise<void>;
  onError?: (error: unknown) => void;
}

export const DEFAULT_FEEDBACK_MESSAGES: Readonly<FeedbackToolMessages>;
export const DEFAULT_FEEDBACK_COLORS: Readonly<FeedbackToolColors>;

export interface FeedbackToolController {
  open(): Promise<void>;
  close(): boolean;
  destroy(): void;
}

export interface Point {
  x: number;
  y: number;
}

export interface Bounds extends Point {
  width: number;
  height: number;
}

export interface BaseAnnotation {
  id: string;
  bounds: Bounds;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  geometry: { start: Point; end: Point } | { bounds: Bounds };
}

export interface CommentAnnotation extends BaseAnnotation {
  type: 'comment';
  number: number;
  comment: string;
  point: Point;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  color: string;
  opacity: number;
}

export interface PenAnnotation extends BaseAnnotation {
  type: 'pen';
  path: unknown[];
  transform: number[];
  color: string;
  strokeWidth: number;
}

export interface RedactAnnotation extends BaseAnnotation {
  type: 'redact';
}

export type FeedbackAnnotation =
  | ArrowAnnotation
  | CommentAnnotation
  | HighlightAnnotation
  | PenAnnotation
  | RedactAnnotation;

export interface FeedbackMetadata {
  url: string;
  title: string;
  viewport: {
    width: number;
    height: number;
  };
  screenshot: {
    width: number;
    height: number;
    mimeType: 'image/png';
  };
  devicePixelRatio: number;
  language: string;
  userAgent: string;
}

export interface FeedbackReport {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  feedback: {
    message: string;
    email: string | null;
  };
  image: Blob;
  annotations: FeedbackAnnotation[];
  metadata: FeedbackMetadata;
}

export function createFeedbackTool(options?: FeedbackToolOptions): FeedbackToolController;
export function reportToJson(report: FeedbackReport): string;
