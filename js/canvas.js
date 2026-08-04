/**
 * PhotoWeb Studio - Core Canvas Engine & State Manager
 */
import { applyAdjustmentsToCanvas, DEFAULT_ADJUSTMENTS } from './filters.js';

export class CanvasEngine {
  constructor() {
    // DOM Elements
    this.viewport = document.getElementById('canvas-viewport');
    this.wrapper = document.getElementById('canvas-wrapper');
    this.mainCanvas = document.getElementById('main-canvas');
    this.overlayCanvas = document.getElementById('overlay-canvas');
    this.emptyState = document.getElementById('empty-state');

    this.mainCtx = this.mainCanvas.getContext('2d');
    this.overlayCtx = this.overlayCanvas.getContext('2d');

    // Offscreen Canvas Layers
    this.baseCanvas = document.createElement('canvas'); // Base image
    this.baseCtx = this.baseCanvas.getContext('2d');

    this.drawCanvas = document.createElement('canvas'); // Drawn layers (brush, text, shapes)
    this.drawCtx = this.drawCanvas.getContext('2d');

    this.tempCanvas = document.createElement('canvas'); // For filter rendering
    this.tempCtx = this.tempCanvas.getContext('2d');

    // Canvas dimensions & status
    this.width = 0;
    this.height = 0;
    this.hasImage = false;

    // Viewport Zoom & Pan State
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;

    // Current Adjustments
    this.adjustments = { ...DEFAULT_ADJUSTMENTS };

    // History Stack for Undo/Redo
    this.historyStack = [];
    this.historyIndex = -1;
    this.maxHistory = 25;

    this.initViewportEvents();
  }

  /**
   * Initialize Zoom & Pan interactions
   */
  initViewportEvents() {
    // 1. Zoom via Mouse Wheel (Photoshop style zoom towards mouse cursor)
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;

      const rect = this.viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      this.setZoom(this.zoom * zoomFactor, mouseX, mouseY);
    }, { passive: false });

    // 2. iPad 2-Finger Pinch Zoom & Pan Gestures
    let touchStartDist = 0;
    let touchStartZoom = 1.0;
    let touchStartPanX = 0;
    let touchStartPanY = 0;
    let touchStartMidX = 0;
    let touchStartMidY = 0;

    this.viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchStartZoom = this.zoom;
        touchStartPanX = this.panX;
        touchStartPanY = this.panY;
        touchStartMidX = (t1.clientX + t2.clientX) / 2;
        touchStartMidY = (t1.clientY + t2.clientY) / 2;
      }
    }, { passive: false });

    this.viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const currentMidX = (t1.clientX + t2.clientX) / 2;
        const currentMidY = (t1.clientY + t2.clientY) / 2;

        if (touchStartDist > 0) {
          const scaleRatio = currentDist / touchStartDist;
          const newZoom = touchStartZoom * scaleRatio;

          const rect = this.viewport.getBoundingClientRect();
          const midX = currentMidX - rect.left - rect.width / 2;
          const midY = currentMidY - rect.top - rect.height / 2;

          this.panX = touchStartPanX + (currentMidX - touchStartMidX);
          this.panY = touchStartPanY + (currentMidY - touchStartMidY);
          this.setZoom(newZoom, midX, midY);
        }
      }
    }, { passive: false });

    // 3. Middle Mouse or Hand Tool Pan
    this.viewport.addEventListener('mousedown', (e) => {
      if (e.button === 1 || this.activeTool === 'pan') {
        this.isPanning = true;
        this.panStartX = e.clientX - this.panX;
        this.panStartY = e.clientY - this.panY;
        this.viewport.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.panStartX;
        this.panY = e.clientY - this.panStartY;
        this.updateTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.viewport.style.cursor = 'default';
      }
    });
  }


  /**
   * Set Canvas Dimensions and reset view
   */
  setSize(w, h) {
    this.width = Math.max(1, Math.round(w));
    this.height = Math.max(1, Math.round(h));

    // Update physical canvases
    this.mainCanvas.width = this.width;
    this.mainCanvas.height = this.width; // Fix height
    this.mainCanvas.height = this.height;

    this.overlayCanvas.width = this.width;
    this.overlayCanvas.height = this.height;

    this.wrapper.style.width = `${this.width}px`;
    this.wrapper.style.height = `${this.height}px`;

    // Update status text
    const dimsEl = document.getElementById('canvas-dimensions');
    if (dimsEl) dimsEl.textContent = `${this.width} x ${this.height} px`;

    // Form inputs update
    const inpW = document.getElementById('input-width');
    const inpH = document.getElementById('input-height');
    if (inpW) inpW.value = this.width;
    if (inpH) inpH.value = this.height;
  }

  /**
   * Load Image into Canvas
   * @param {HTMLImageElement|HTMLCanvasElement} img 
   */
  loadImage(img) {
    this.setSize(img.width, img.height);

    // Setup base layer
    this.baseCanvas.width = this.width;
    this.baseCanvas.height = this.height;
    this.baseCtx.clearRect(0, 0, this.width, this.height);
    this.baseCtx.drawImage(img, 0, 0);

    // Setup drawing layer
    this.drawCanvas.width = this.width;
    this.drawCanvas.height = this.height;
    this.drawCtx.clearRect(0, 0, this.width, this.height);

    this.hasImage = true;
    this.emptyState.classList.add('hidden');
    this.wrapper.classList.remove('hidden');

    // Reset adjustments & zoom to fit
    this.resetAdjustments(false);
    this.zoomToFit();
    
    // Push initial history state
    this.historyStack = [];
    this.historyIndex = -1;
    this.saveState('Initial Image Loaded');
    this.render();
  }

  /**
   * Composite layers and render final canvas with current filter adjustments
   */
  render() {
    if (!this.hasImage) return;

    // 1. Combine Base Image Layer + Drawing Layer into Temp Canvas
    this.tempCanvas.width = this.width;
    this.tempCanvas.height = this.height;
    this.tempCtx.clearRect(0, 0, this.width, this.height);
    this.tempCtx.drawImage(this.baseCanvas, 0, 0);
    this.tempCtx.drawImage(this.drawCanvas, 0, 0);

    // 2. Apply Adjustments & Filters to Main Canvas
    applyAdjustmentsToCanvas(this.tempCanvas, this.mainCanvas, this.adjustments);
  }

  /**
   * Reset Adjustments sliders
   */
  resetAdjustments(triggerRender = true) {
    this.adjustments = { ...DEFAULT_ADJUSTMENTS };

    // Reset slider UI elements
    const sliders = ['brightness', 'contrast', 'saturation', 'hue', 'blur', 'sharpen'];
    sliders.forEach(id => {
      const el = document.getElementById(`slider-${id}`);
      const valEl = document.getElementById(`val-${id}`);
      if (el) el.value = 0;
      if (valEl) valEl.textContent = id === 'hue' ? '0°' : (id === 'blur' ? '0px' : '0');
    });

    // Reset Preset buttons active state
    document.querySelectorAll('.filter-preset-card').forEach(card => {
      card.classList.toggle('active', card.dataset.preset === 'normal');
    });

    if (triggerRender) this.render();
  }

  /**
   * Zoom Control
   */
  setZoom(newZoom, mouseX, mouseY) {
    const clampedZoom = Math.min(Math.max(0.1, newZoom), 10.0);
    if (clampedZoom === this.zoom) return;

    if (mouseX !== undefined && mouseY !== undefined) {
      const zoomRatio = clampedZoom / this.zoom;
      this.panX = this.panX * zoomRatio + mouseX * (1 - zoomRatio);
      this.panY = this.panY * zoomRatio + mouseY * (1 - zoomRatio);
    }

    this.zoom = clampedZoom;
    
    const zoomText = document.getElementById('zoom-level-text');
    if (zoomText) zoomText.textContent = `${Math.round(this.zoom * 100)}%`;

    this.updateTransform();
  }


  zoomToFit() {
    if (!this.hasImage) return;
    const vpW = this.viewport.clientWidth - 80;
    const vpH = this.viewport.clientHeight - 80;

    const scaleX = vpW / this.width;
    const scaleY = vpH / this.height;
    const fitScale = Math.min(scaleX, scaleY, 1.0);

    this.zoom = Math.max(0.15, fitScale);
    this.panX = 0;
    this.panY = 0;

    const zoomText = document.getElementById('zoom-level-text');
    if (zoomText) zoomText.textContent = `${Math.round(this.zoom * 100)}%`;

    this.updateTransform();
  }

  updateTransform() {
    this.wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  /**
   * Pan Viewport by relative offset delta
   */
  panBy(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    this.updateTransform();
  }

  /**
   * Convert Client Mouse / Touch Event Coordinates to Canvas Relative Pixel Coordinates
   */
  getCanvasCoords(e) {
    const rect = this.mainCanvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    if (clientX === undefined) clientX = 0;
    if (clientY === undefined) clientY = 0;

    const x = Math.round((clientX - rect.left) * (this.width / rect.width));
    const y = Math.round((clientY - rect.top) * (this.height / rect.height));

    return { x, y };
  }


  /**
   * History Stack Management (Undo/Redo)
   */
  saveState(label = 'Action') {
    // Truncate redo history
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    }

    // Capture state copy of base and draw canvases
    const baseCopy = document.createElement('canvas');
    baseCopy.width = this.width;
    baseCopy.height = this.height;
    baseCopy.getContext('2d').drawImage(this.baseCanvas, 0, 0);

    const drawCopy = document.createElement('canvas');
    drawCopy.width = this.width;
    drawCopy.height = this.height;
    drawCopy.getContext('2d').drawImage(this.drawCanvas, 0, 0);

    this.historyStack.push({
      width: this.width,
      height: this.height,
      base: baseCopy,
      draw: drawCopy,
      adjustments: { ...this.adjustments },
      label
    });

    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    } else {
      this.historyIndex++;
    }

    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.applyState(this.historyStack[this.historyIndex]);
    }
  }

  redo() {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      this.applyState(this.historyStack[this.historyIndex]);
    }
  }

  applyState(state) {
    if (!state) return;
    this.setSize(state.width, state.height);

    this.baseCanvas.width = state.width;
    this.baseCanvas.height = state.height;
    this.baseCtx.clearRect(0, 0, state.width, state.height);
    this.baseCtx.drawImage(state.base, 0, 0);

    this.drawCanvas.width = state.width;
    this.drawCanvas.height = state.height;
    this.drawCtx.clearRect(0, 0, state.width, state.height);
    this.drawCtx.drawImage(state.draw, 0, 0);

    this.adjustments = { ...state.adjustments };
    this.render();
    this.updateUndoRedoButtons();
  }

  updateUndoRedoButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');

    if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = this.historyIndex >= this.historyStack.length - 1;
  }

  /**
   * Rotate Canvas 90 degrees
   */
  rotate(degrees) {
    if (!this.hasImage) return;

    const rad = (degrees * Math.PI) / 180;
    const newW = degrees % 180 !== 0 ? this.height : this.width;
    const newH = degrees % 180 !== 0 ? this.width : this.height;

    // Rotate Base Layer
    const baseRot = document.createElement('canvas');
    baseRot.width = newW;
    baseRot.height = newH;
    const bCtx = baseRot.getContext('2d');
    bCtx.translate(newW / 2, newH / 2);
    bCtx.rotate(rad);
    bCtx.drawImage(this.baseCanvas, -this.width / 2, -this.height / 2);

    // Rotate Draw Layer
    const drawRot = document.createElement('canvas');
    drawRot.width = newW;
    drawRot.height = newH;
    const dCtx = drawRot.getContext('2d');
    dCtx.translate(newW / 2, newH / 2);
    dCtx.rotate(rad);
    dCtx.drawImage(this.drawCanvas, -this.width / 2, -this.height / 2);

    this.setSize(newW, newH);
    this.baseCanvas.width = newW;
    this.baseCanvas.height = newH;
    this.baseCtx.drawImage(baseRot, 0, 0);

    this.drawCanvas.width = newW;
    this.drawCanvas.height = newH;
    this.drawCtx.drawImage(drawRot, 0, 0);

    this.render();
    this.saveState(`Rotated ${degrees}°`);
  }

  /**
   * Flip Canvas Horizontally / Vertically
   */
  flip(horizontal = true) {
    if (!this.hasImage) return;

    const flipCanvas = (src) => {
      const temp = document.createElement('canvas');
      temp.width = this.width;
      temp.height = this.height;
      const ctx = temp.getContext('2d');
      ctx.save();
      if (horizontal) {
        ctx.scale(-1, 1);
        ctx.drawImage(src, -this.width, 0);
      } else {
        ctx.scale(1, -1);
        ctx.drawImage(src, 0, -this.height);
      }
      ctx.restore();
      return temp;
    };

    const flippedBase = flipCanvas(this.baseCanvas);
    const flippedDraw = flipCanvas(this.drawCanvas);

    this.baseCtx.clearRect(0, 0, this.width, this.height);
    this.baseCtx.drawImage(flippedBase, 0, 0);

    this.drawCtx.clearRect(0, 0, this.width, this.height);
    this.drawCtx.drawImage(flippedDraw, 0, 0);

    this.render();
    this.saveState(horizontal ? 'Flipped Horizontally' : 'Flipped Vertically');
  }

  /**
   * Resize Canvas
   */
  resizeCanvas(newWidth, newHeight) {
    if (!this.hasImage) return;
    newWidth = Math.max(10, Math.round(newWidth));
    newHeight = Math.max(10, Math.round(newHeight));

    const resizeLayer = (src) => {
      const temp = document.createElement('canvas');
      temp.width = newWidth;
      temp.height = newHeight;
      const ctx = temp.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, newWidth, newHeight);
      return temp;
    };

    const resBase = resizeLayer(this.baseCanvas);
    const resDraw = resizeLayer(this.drawCanvas);

    this.setSize(newWidth, newHeight);
    this.baseCanvas.width = newWidth;
    this.baseCanvas.height = newHeight;
    this.baseCtx.drawImage(resBase, 0, 0);

    this.drawCanvas.width = newWidth;
    this.drawCanvas.height = newHeight;
    this.drawCtx.drawImage(resDraw, 0, 0);

    this.render();
    this.saveState(`Resized to ${newWidth}x${newHeight}`);
  }

  /**
   * Crop canvas to bounding rectangle
   */
  crop(rect) {
    if (!this.hasImage || rect.width <= 0 || rect.height <= 0) return;

    const cropLayer = (src) => {
      const temp = document.createElement('canvas');
      temp.width = rect.width;
      temp.height = rect.height;
      const ctx = temp.getContext('2d');
      ctx.drawImage(src, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      return temp;
    };

    const croppedBase = cropLayer(this.baseCanvas);
    const croppedDraw = cropLayer(this.drawCanvas);

    this.setSize(rect.width, rect.height);

    this.baseCanvas.width = rect.width;
    this.baseCanvas.height = rect.height;
    this.baseCtx.drawImage(croppedBase, 0, 0);

    this.drawCanvas.width = rect.width;
    this.drawCanvas.height = rect.height;
    this.drawCtx.drawImage(croppedDraw, 0, 0);

    this.render();
    this.saveState(`Cropped Canvas to ${rect.width}x${rect.height}`);
  }
}
