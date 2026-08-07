export interface FeedbackToolLauncherOptions {
  enabled?: boolean;
  label?: string;
  position?: 'bottom-left' | 'bottom-right';
}

export interface FeedbackToolOptions {
  accentColor?: string;
  collectEmail?: boolean;
  launcher?: false | FeedbackToolLauncherOptions;
  onSubmit?: (report: FeedbackReport) => void | Promise<void>;
  onError?: (error: unknown) => void;
}

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
