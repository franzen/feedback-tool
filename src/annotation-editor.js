import {
  Canvas,
  Circle,
  FabricImage,
  FabricText,
  Group,
  Line,
  PencilBrush,
  Rect,
  Triangle,
} from 'fabric';
import { serializeAnnotation } from './report.js';

const HISTORY_PROPERTIES = [
  'annotationId',
  'annotationType',
  'annotationColor',
  'commentNumber',
  'commentText',
  'annotationPart',
];

const TOP_LEFT_ORIGIN = {
  originX: 'left',
  originY: 'top',
};

function id() {
  return globalThis.crypto?.randomUUID?.() ?? `annotation-${Date.now()}-${Math.random()}`;
}

function normalizedBounds(start, end) {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not export the annotation.'))), 'image/png');
  });
}

export class AnnotationEditor {
  constructor({ canvasElement, capture, stage, onCommentRequest, onHistoryChange, onDirtyChange }) {
    this.capture = capture;
    this.stage = stage;
    this.onCommentRequest = onCommentRequest;
    this.onHistoryChange = onHistoryChange;
    this.onDirtyChange = onDirtyChange;
    this.tool = 'arrow';
    this.color = '#e23d54';
    this.drawing = null;
    this.restoring = false;
    this.commentSequence = 0;
    this.pixelScale = capture.width / window.innerWidth;

    this.canvas = new Canvas(canvasElement, {
      width: capture.width,
      height: capture.height,
      preserveObjectStacking: true,
      selection: true,
      stopContextMenu: true,
    });
    this.canvas.enableRetinaScaling = false;

    this.addBackground();
    this.bindCanvasEvents();
    this.history = [this.snapshot()];
    this.historyIndex = 0;
    this.setTool('arrow');

    this.resizeObserver = new ResizeObserver(() => this.resizeToFit());
    this.resizeObserver.observe(stage.parentElement);
    requestAnimationFrame(() => this.resizeToFit());
    this.notifyHistory();
  }

  addBackground() {
    const background = new FabricImage(this.capture, {
      ...TOP_LEFT_ORIGIN,
      left: 0,
      top: 0,
      selectable: false,
      evented: false,
      excludeFromExport: true,
      hoverCursor: 'default',
    });
    this.background = background;
    this.canvas.add(background);
    this.canvas.sendObjectToBack(background);
  }

  bindCanvasEvents() {
    this.handlers = {
      down: (event) => this.onPointerDown(event),
      move: (event) => this.onPointerMove(event),
      up: (event) => this.onPointerUp(event),
      path: ({ path }) => {
        path.set({
          annotationId: id(),
          annotationType: 'pen',
          borderColor: '#6558d3',
          cornerColor: '#ffffff',
          cornerSize: Math.max(10, 10 * this.pixelScale),
          cornerStrokeColor: '#6558d3',
          cornerStyle: 'circle',
          evented: false,
          lockRotation: true,
          objectCaching: false,
          selectable: false,
          transparentCorners: false,
        });
        path.setControlsVisibility({ mtr: false });
        this.commit();
      },
      modified: ({ target }) => {
        if (target?.annotationType === 'redact') this.refreshRedaction(target);
        this.commit();
      },
    };

    this.canvas.on('mouse:down', this.handlers.down);
    this.canvas.on('mouse:move', this.handlers.move);
    this.canvas.on('mouse:up', this.handlers.up);
    this.canvas.on('path:created', this.handlers.path);
    this.canvas.on('object:modified', this.handlers.modified);
  }

  setTool(tool) {
    this.tool = tool;
    this.canvas.isDrawingMode = tool === 'pen';
    this.canvas.selection = tool === 'select';
    this.canvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair';
    this.canvas.discardActiveObject();

    this.canvas.getObjects().forEach((object) => {
      if (object === this.background) return;
      object.selectable = tool === 'select';
      object.evented = tool === 'select';
    });

    if (tool === 'pen') {
      const brush = new PencilBrush(this.canvas);
      brush.color = this.color;
      brush.width = Math.max(4, 4 * this.pixelScale);
      this.canvas.freeDrawingBrush = brush;
    }

    this.canvas.requestRenderAll();
  }

  setColor(color) {
    this.color = color;
    if (this.canvas.freeDrawingBrush) this.canvas.freeDrawingBrush.color = color;
  }

  setTopRightResizeControls(object) {
    object.setControlsVisibility({
      bl: true,
      br: false,
      mb: true,
      ml: true,
      mr: false,
      mt: false,
      mtr: false,
      tl: false,
      tr: false,
    });
  }

  onPointerDown(event) {
    if (this.restoring || this.tool === 'select' || this.tool === 'pen') return;
    const start = this.canvas.getScenePoint(event.e);

    if (this.tool === 'comment') {
      this.onCommentRequest({
        point: { x: start.x, y: start.y },
        clientX: event.e.clientX,
        clientY: event.e.clientY,
        save: (text) => this.addComment(start, text),
      });
      return;
    }

    const preview = this.createPreview(this.tool, start);
    this.drawing = { start, preview };
    this.canvas.add(preview);
  }

  createPreview(tool, start) {
    if (tool === 'arrow') {
      return new Line([start.x, start.y, start.x, start.y], {
        stroke: this.color,
        strokeWidth: Math.max(4, 4 * this.pixelScale),
        selectable: false,
        evented: false,
      });
    }

    return new Rect({
      ...TOP_LEFT_ORIGIN,
      left: start.x,
      top: start.y,
      width: 1,
      height: 1,
      fill: tool === 'highlight' ? 'transparent' : 'rgba(30,41,59,.42)',
      stroke: tool === 'highlight' ? this.color : '#475467',
      strokeDashArray: tool === 'redact' ? [8 * this.pixelScale, 6 * this.pixelScale] : undefined,
      strokeWidth: tool === 'highlight' ? Math.max(3, 3 * this.pixelScale) : Math.max(2, 2 * this.pixelScale),
      selectable: false,
      evented: false,
    });
  }

  onPointerMove(event) {
    if (!this.drawing) return;
    const point = this.canvas.getScenePoint(event.e);
    const { start, preview } = this.drawing;

    if (this.tool === 'arrow') {
      preview.set({ x2: point.x, y2: point.y });
    } else {
      const bounds = normalizedBounds(start, point);
      preview.set(bounds);
    }
    preview.setCoords();
    this.canvas.requestRenderAll();
  }

  onPointerUp(event) {
    if (!this.drawing) return;
    const { start, preview } = this.drawing;
    const end = this.canvas.getScenePoint(event.e);
    this.drawing = null;
    this.canvas.remove(preview);

    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (distance < 5 * this.pixelScale) {
      this.canvas.requestRenderAll();
      return;
    }

    if (this.tool === 'highlight') this.addHighlight(start, end);
    if (this.tool === 'arrow') this.addArrow(start, end);
    if (this.tool === 'redact') this.addRedaction(start, end);
  }

  addHighlight(start, end) {
    const object = new Rect({
      ...TOP_LEFT_ORIGIN,
      ...normalizedBounds(start, end),
      annotationColor: this.color,
      annotationId: id(),
      annotationType: 'highlight',
      borderColor: '#6558d3',
      cornerColor: '#ffffff',
      cornerSize: Math.max(10, 10 * this.pixelScale),
      cornerStrokeColor: '#6558d3',
      cornerStyle: 'circle',
      evented: false,
      fill: 'transparent',
      lockScalingFlip: true,
      lockRotation: true,
      opacity: 1,
      selectable: false,
      stroke: this.color,
      strokeUniform: true,
      strokeWidth: Math.max(3, 3 * this.pixelScale),
      transparentCorners: false,
    });
    this.setTopRightResizeControls(object);
    this.canvas.add(object);
    this.commit();
  }

  addArrow(start, end) {
    const color = this.color;
    const strokeWidth = Math.max(4, 4 * this.pixelScale);
    const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI + 90;
    const line = new Line([start.x, start.y, end.x, end.y], {
      annotationPart: 'shaft',
      stroke: color,
      strokeLineCap: 'round',
      strokeWidth,
    });
    const head = new Triangle({
      left: end.x,
      top: end.y,
      width: 16 * this.pixelScale,
      height: 20 * this.pixelScale,
      fill: color,
      originX: 'center',
      originY: 'center',
      angle,
    });
    const object = new Group([line, head], {
      annotationId: id(),
      annotationType: 'arrow',
      transparentCorners: false,
    });
    this.canvas.add(object);
    this.commit();
  }

  addComment(point, text) {
    const number = ++this.commentSequence;
    const radius = 14 * this.pixelScale;
    const circle = new Circle({
      radius,
      fill: this.color,
      stroke: '#ffffff',
      strokeWidth: Math.max(2, 2 * this.pixelScale),
      originX: 'center',
      originY: 'center',
    });
    const label = new FabricText(String(number), {
      fill: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: 14 * this.pixelScale,
      fontWeight: 'bold',
      originX: 'center',
      originY: 'center',
    });
    const object = new Group([circle, label], {
      left: point.x,
      top: point.y,
      originX: 'center',
      originY: 'center',
      annotationId: id(),
      annotationType: 'comment',
      commentNumber: number,
      commentText: text.trim(),
      hasControls: false,
      transparentCorners: false,
    });
    this.canvas.add(object);
    this.commit();
  }

  addRedaction(start, end) {
    const bounds = normalizedBounds(start, end);
    const patch = this.createRedactionPatch(bounds);

    const object = new FabricImage(patch, {
      ...TOP_LEFT_ORIGIN,
      left: bounds.left,
      top: bounds.top,
      annotationId: id(),
      annotationType: 'redact',
      borderColor: '#6558d3',
      cornerColor: '#ffffff',
      cornerSize: Math.max(10, 10 * this.pixelScale),
      cornerStrokeColor: '#6558d3',
      cornerStyle: 'circle',
      evented: false,
      lockRotation: true,
      lockScalingFlip: true,
      selectable: false,
      stroke: '#344054',
      strokeUniform: true,
      strokeWidth: Math.max(1, this.pixelScale),
      transparentCorners: false,
    });
    this.setTopRightResizeControls(object);
    this.canvas.add(object);
    this.commit();
  }

  createRedactionPatch(bounds) {
    const blockSize = Math.max(8, Math.round(10 * this.pixelScale));
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.ceil(bounds.width / blockSize));
    small.height = Math.max(1, Math.ceil(bounds.height / blockSize));
    small.getContext('2d').drawImage(
      this.capture,
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
      0,
      0,
      small.width,
      small.height,
    );

    const patch = document.createElement('canvas');
    patch.width = Math.ceil(bounds.width);
    patch.height = Math.ceil(bounds.height);
    const context = patch.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.drawImage(small, 0, 0, patch.width, patch.height);
    return patch;
  }

  refreshRedaction(object) {
    const bounds = {
      left: Math.max(0, Math.min(this.capture.width - 1, object.left)),
      top: Math.max(0, Math.min(this.capture.height - 1, object.top)),
      width: Math.max(1, Math.min(object.width * Math.abs(object.scaleX), this.capture.width - object.left)),
      height: Math.max(1, Math.min(object.height * Math.abs(object.scaleY), this.capture.height - object.top)),
    };
    const patch = this.createRedactionPatch(bounds);
    object.setElement(patch, { width: bounds.width, height: bounds.height });
    object.set({
      ...TOP_LEFT_ORIGIN,
      dirty: true,
      flipX: false,
      flipY: false,
      left: bounds.left,
      top: bounds.top,
      scaleX: 1,
      scaleY: 1,
    });
    object.setCoords();
    this.canvas.requestRenderAll();
  }

  snapshot() {
    return JSON.stringify(this.canvas.toObject(HISTORY_PROPERTIES));
  }

  commit() {
    if (this.restoring) return;
    this.history.splice(this.historyIndex + 1);
    this.history.push(this.snapshot());
    this.historyIndex = this.history.length - 1;
    this.notifyHistory();
  }

  async restore(index) {
    if (index < 0 || index >= this.history.length || this.restoring) return;
    this.restoring = true;
    this.canvas.discardActiveObject();
    await this.canvas.loadFromJSON(this.history[index]);
    this.addBackground();
    this.canvas.getObjects().forEach((object) => {
      if (object.annotationType === 'highlight' || object.annotationType === 'redact') {
        this.setTopRightResizeControls(object);
      }
    });
    this.historyIndex = index;
    this.commentSequence = Math.max(
      0,
      ...this.canvas
        .getObjects()
        .filter((object) => object.annotationType === 'comment')
        .map((object) => Number(object.commentNumber) || 0),
    );
    this.restoring = false;
    this.setTool(this.tool);
    this.notifyHistory();
  }

  undo() {
    return this.restore(this.historyIndex - 1);
  }

  redo() {
    return this.restore(this.historyIndex + 1);
  }

  deleteSelected() {
    const active = this.canvas.getActiveObject();
    if (!active || active === this.background) return;
    const objects = active.type === 'activeselection' ? active.getObjects() : [active];
    this.canvas.discardActiveObject();
    objects.forEach((object) => this.canvas.remove(object));
    this.commit();
  }

  clear() {
    const annotations = this.canvas.getObjects().filter((object) => object !== this.background);
    if (!annotations.length) return;
    this.canvas.discardActiveObject();
    annotations.forEach((object) => this.canvas.remove(object));
    this.commit();
  }

  notifyHistory() {
    const state = {
      canUndo: this.historyIndex > 0,
      canRedo: this.historyIndex < this.history.length - 1,
      dirty: this.historyIndex > 0,
      count: this.canvas.getObjects().filter((object) => object !== this.background).length,
    };
    this.onHistoryChange?.(state);
    this.onDirtyChange?.(state.dirty);
  }

  resizeToFit() {
    const shell = this.stage.parentElement;
    const availableWidth = Math.max(1, shell.clientWidth - 44);
    const availableHeight = Math.max(1, shell.clientHeight - 44);
    const scale = Math.min(availableWidth / this.capture.width, availableHeight / this.capture.height, 1);
    const width = Math.max(1, Math.floor(this.capture.width * scale));
    const height = Math.max(1, Math.floor(this.capture.height * scale));
    this.stage.style.width = `${width}px`;
    this.stage.style.height = `${height}px`;
    this.canvas.setDimensions({ width, height }, { cssOnly: true });
    this.canvas.calcOffset();
  }

  getAnnotations() {
    return this.canvas
      .getObjects()
      .filter((object) => object !== this.background)
      .map(serializeAnnotation);
  }

  async exportBlob() {
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    const exported = this.canvas.toCanvasElement(1);
    return canvasToBlob(exported);
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.canvas.dispose();
  }
}
