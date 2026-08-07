import { Point, util } from 'fabric';

export const REPORT_SCHEMA_VERSION = 1;

export function validateFeedback(message, email = '', messages = {}) {
  const errors = {};
  const normalizedMessage = message.trim();
  const normalizedEmail = email.trim();

  if (!normalizedMessage) {
    errors.message = messages.feedbackRequired || 'Please describe what happened or what should change.';
  }

  if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = messages.invalidEmail || 'Enter a valid email address or leave this field empty.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: {
      message: normalizedMessage,
      email: normalizedEmail || null,
    },
  };
}

export function buildMetadata({ win = window, doc = document, capture }) {
  return {
    url: win.location.href,
    title: doc.title,
    viewport: {
      width: win.innerWidth,
      height: win.innerHeight,
    },
    screenshot: {
      width: capture.width,
      height: capture.height,
      mimeType: 'image/png',
    },
    devicePixelRatio: win.devicePixelRatio || 1,
    language: win.navigator.language,
    userAgent: win.navigator.userAgent,
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function serializeBounds(object) {
  const bounds = object.getBoundingRect();
  return {
    x: round(bounds.left),
    y: round(bounds.top),
    width: round(bounds.width),
    height: round(bounds.height),
  };
}

function serializeArrow(object) {
  const line = object.getObjects?.().find((candidate) => candidate.annotationPart === 'shaft');
  if (!line) return { bounds: serializeBounds(object) };

  const matrix = line.calcTransformMatrix();
  const start = util.transformPoint(new Point(line.x1, line.y1), matrix);
  const end = util.transformPoint(new Point(line.x2, line.y2), matrix);

  return {
    start: { x: round(start.x), y: round(start.y) },
    end: { x: round(end.x), y: round(end.y) },
  };
}

export function serializeAnnotation(object) {
  const base = {
    id: object.annotationId,
    type: object.annotationType,
    bounds: serializeBounds(object),
  };

  if (object.annotationType === 'comment') {
    const center = object.getCenterPoint();
    return {
      ...base,
      number: object.commentNumber,
      comment: object.commentText,
      point: { x: round(center.x), y: round(center.y) },
    };
  }

  if (object.annotationType === 'arrow') {
    return { ...base, geometry: serializeArrow(object) };
  }

  if (object.annotationType === 'pen') {
    return {
      ...base,
      path: object.path,
      transform: object.calcTransformMatrix().map(round),
      color: object.stroke,
      strokeWidth: object.strokeWidth,
    };
  }

  if (object.annotationType === 'highlight') {
    return {
      ...base,
      color: object.annotationColor,
      opacity: object.opacity,
    };
  }

  return base;
}

export function createReport({ feedback, image, annotations, metadata, now = new Date() }) {
  const id = globalThis.crypto?.randomUUID?.() ?? `report-${now.getTime()}`;
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    id,
    createdAt: now.toISOString(),
    feedback,
    image,
    annotations,
    metadata,
  };
}

export function reportToJson(report) {
  const { image: _image, ...serializable } = report;
  return JSON.stringify(serializable, null, 2);
}
