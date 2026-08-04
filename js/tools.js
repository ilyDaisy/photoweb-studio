/**
 * PhotoWeb Studio - Interactive Tools Engine (Brush, Crop, Shapes, Text, Eraser)
 */

export class ToolsManager {
  /**
   * @param {import('./canvas.js').CanvasEngine} engine 
   */
  constructor(engine) {
    this.engine = engine;
    this.activeTool = 'select';

    // Tool Options
    this.brushType = 'ink'; // 'round', 'ink' (ตามเรฟ), 'calligraphy', 'soft'
    this.brushSize = 24;
    this.brushOpacity = 0.95;
    this.primaryColor = '#121212';
    this.secondaryColor = '#ffffff';
    this.fillShape = false;
    
    // Text options
    this.fontSize = 28;
    this.fontFamily = 'Sarabun, Inter, sans-serif';

    // Drawing Interaction State
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;

    // Crop Selection Marquee State
    this.cropRect = null; // { x, y, width, height }

    this.initToolEvents();
  }

  setTool(toolName) {
    this.activeTool = toolName;
    this.engine.activeTool = toolName;

    // Clear Overlay Canvas
    this.engine.overlayCtx.clearRect(0, 0, this.engine.width, this.engine.height);

    // Update active button state
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });

    // Update Tool Name in Options Sub-bar
    const toolNameEl = document.getElementById('current-tool-name');
    const toolIconEl = document.getElementById('current-tool-icon');
    const controlsContainer = document.getElementById('tool-controls-container');

    const toolMeta = {
      select: { name: 'Select / Move', icon: 'fa-arrow-pointer' },
      crop: { name: 'Crop Canvas', icon: 'fa-crop-simple' },
      brush: { name: 'Brush Tool', icon: 'fa-paint-brush' },
      eraser: { name: 'Eraser Tool', icon: 'fa-eraser' },
      'shape-rect': { name: 'Rectangle Tool', icon: 'fa-square' },
      'shape-circle': { name: 'Circle Tool', icon: 'fa-circle' },
      'shape-arrow': { name: 'Arrow Annotation', icon: 'fa-arrow-right' },
      'shape-line': { name: 'Line Tool', icon: 'fa-slash' },
      text: { name: 'Text Tool', icon: 'fa-font' },
      pan: { name: 'Pan Hand Tool', icon: 'fa-hand' }
    };

    const current = toolMeta[toolName] || { name: toolName, icon: 'fa-wrench' };
    if (toolNameEl) toolNameEl.textContent = current.name;
    if (toolIconEl) toolIconEl.className = `fa-solid ${current.icon}`;

    // Inject contextual options UI into header sub-bar
    if (controlsContainer) {
      controlsContainer.innerHTML = this.renderToolControls(toolName);
      this.bindToolControls(toolName);
    }
  }

  /**
   * Render contextual options UI for active tool
   */
  renderToolControls(toolName) {
    if (toolName === 'brush') {
      return `
        <div class="opt-group">
          <label><i class="fa-solid fa-pen-nib"></i> ชนิดพู่กัน:</label>
          <select id="opt-brush-type" class="opt-select">
            <option value="ink" ${this.brushType === 'ink' ? 'selected' : ''}>✒️ Ink Bleed (หมึกซึม - ตามเรฟ)</option>
            <option value="calligraphy" ${this.brushType === 'calligraphy' ? 'selected' : ''}>🖊️ Calligraphy Ink (พู่กันปาด)</option>
            <option value="round" ${this.brushType === 'round' ? 'selected' : ''}>🖌️ Round Standard (หัวกลมทึบ)</option>
            <option value="soft" ${this.brushType === 'soft' ? 'selected' : ''}>💨 Soft Blur (หัวฟุ้ง)</option>
          </select>
        </div>
        <div class="divider-v"></div>
        <div class="opt-group">
          <label>ขนาด (Size):</label>
          <input type="range" id="opt-brush-size" min="1" max="250" value="${this.brushSize}">
          <div class="input-unit-sm">
            <input type="number" id="opt-brush-size-num" min="1" max="500" value="${this.brushSize}">
            <span>px</span>
          </div>
        </div>
        <div class="divider-v"></div>
        <div class="opt-group">
          <label>ความโปร่งใส (Opacity):</label>
          <input type="range" id="opt-brush-opacity" min="1" max="100" value="${Math.round(this.brushOpacity * 100)}">
          <div class="input-unit-sm">
            <input type="number" id="opt-brush-opacity-num" min="1" max="100" value="${Math.round(this.brushOpacity * 100)}">
            <span>%</span>
          </div>
        </div>
      `;
    }

    if (toolName === 'eraser') {
      return `
        <div class="opt-group">
          <label>ประเภทยางลบ:</label>
          <span class="text-sm">ยางลบปรับขนาดและความโปร่งได้อิสระ</span>
        </div>
        <div class="divider-v"></div>
        <div class="opt-group">
          <label>ขนาด (Size):</label>
          <input type="range" id="opt-brush-size" min="1" max="250" value="${this.brushSize}">
          <div class="input-unit-sm">
            <input type="number" id="opt-brush-size-num" min="1" max="500" value="${this.brushSize}">
            <span>px</span>
          </div>
        </div>
        <div class="divider-v"></div>
        <div class="opt-group">
          <label>ความโปร่งใส:</label>
          <input type="range" id="opt-brush-opacity" min="1" max="100" value="${Math.round(this.brushOpacity * 100)}">
          <div class="input-unit-sm">
            <input type="number" id="opt-brush-opacity-num" min="1" max="100" value="${Math.round(this.brushOpacity * 100)}">
            <span>%</span>
          </div>
        </div>
      `;
    }

    if (toolName.startsWith('shape-')) {
      return `
        <div class="opt-group">
          <label>ความหนาเส้น:</label>
          <input type="range" id="opt-brush-size" min="1" max="100" value="${this.brushSize}">
          <div class="input-unit-sm">
            <input type="number" id="opt-brush-size-num" min="1" max="200" value="${this.brushSize}">
            <span>px</span>
          </div>
        </div>
        <div class="divider-v"></div>
        <div class="opt-group">
          <input type="checkbox" id="opt-shape-fill" ${this.fillShape ? 'checked' : ''}>
          <label for="opt-shape-fill">ถมสีทึบ (Solid Fill)</label>
        </div>
      `;
    }

    if (toolName === 'text') {
      return `
        <div class="opt-group">
          <label>ขนาดฟอนต์:</label>
          <input type="number" id="opt-font-size" value="${this.fontSize}" min="10" max="200" style="width:70px">
          <span>px</span>
        </div>
        <div class="divider-v"></div>
        <div class="opt-group">
          <label>แบบฟอนต์:</label>
          <select id="opt-font-family">
            <option value="Sarabun, sans-serif">Sarabun (ไทย/อังกฤษ)</option>
            <option value="Inter, sans-serif">Inter Clean</option>
            <option value="Impact, sans-serif">Impact (Meme Style)</option>
            <option value="Courier New, monospace">Monospace Code</option>
          </select>
        </div>
      `;
    }

    if (toolName === 'crop') {
      return `
        <span class="text-sm text-subtle">คลิกลากเลือกบริเวณที่ต้องการครอป แล้วกดปุ่ม:</span>
        <button id="btn-apply-crop" class="btn btn-sm btn-primary" ${this.cropRect ? '' : 'disabled'}>
          <i class="fa-solid fa-crop-simple"></i> ยืนยัน Crop
        </button>
        <button id="btn-cancel-crop" class="btn btn-sm btn-dark">ยกเลิก</button>
      `;
    }

    return `<span class="text-subtle text-sm">คลิกลากบน Canvas เพื่อใช้งานเครื่องมือ</span>`;
  }

  /**
   * Bind events to sub-bar controls
   */
  bindToolControls(toolName) {
    const brushTypeSelect = document.getElementById('opt-brush-type');
    const sizeRange = document.getElementById('opt-brush-size');
    const sizeNum = document.getElementById('opt-brush-size-num');
    const opacityRange = document.getElementById('opt-brush-opacity');
    const opacityNum = document.getElementById('opt-brush-opacity-num');

    const fillInput = document.getElementById('opt-shape-fill');
    const fontSzInput = document.getElementById('opt-font-size');
    const fontFamInput = document.getElementById('opt-font-family');
    const cropApplyBtn = document.getElementById('btn-apply-crop');
    const cropCancelBtn = document.getElementById('btn-cancel-crop');

    if (brushTypeSelect) {
      brushTypeSelect.addEventListener('change', (e) => {
        this.brushType = e.target.value;
      });
    }

    // Synchronize Size Range & Size Number
    if (sizeRange && sizeNum) {
      sizeRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.brushSize = val;
        sizeNum.value = val;
      });
      sizeNum.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) || 1;
        this.brushSize = val;
        sizeRange.value = val;
      });
    }

    // Synchronize Opacity Range & Opacity Number
    if (opacityRange && opacityNum) {
      opacityRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.brushOpacity = val / 100;
        opacityNum.value = val;
      });
      opacityNum.addEventListener('input', (e) => {
        const val = Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 100));
        this.brushOpacity = val / 100;
        opacityRange.value = val;
      });
    }

    if (fillInput) {
      fillInput.addEventListener('change', (e) => {
        this.fillShape = e.target.checked;
      });
    }

    if (fontSzInput) {
      fontSzInput.addEventListener('input', (e) => {
        this.fontSize = parseInt(e.target.value, 10);
      });
    }

    if (fontFamInput) {
      fontFamInput.addEventListener('change', (e) => {
        this.fontFamily = e.target.value;
      });
    }

    if (cropApplyBtn) {
      cropApplyBtn.addEventListener('click', () => {
        if (this.cropRect) {
          this.engine.crop(this.cropRect);
          this.cropRect = null;
          this.engine.overlayCtx.clearRect(0, 0, this.engine.width, this.engine.height);
          this.setTool('select');
        }
      });
    }

    if (cropCancelBtn) {
      cropCancelBtn.addEventListener('click', () => {
        this.cropRect = null;
        this.engine.overlayCtx.clearRect(0, 0, this.engine.width, this.engine.height);
        this.setTool('select');
      });
    }
  }

  /**
   * Main Canvas Interaction Wiring (Mouse, Touch Screen iPad, Apple Pencil)
   */
  initToolEvents() {
    const canvas = this.engine.mainCanvas;

    const handleStart = (e) => {
      if (!this.engine.hasImage) return;
      if (e.type.startsWith('mouse') && e.button !== 0) return;

      if (e.cancelable && (e.type.startsWith('touch') || e.type.startsWith('pointer'))) {
        e.preventDefault();
      }

      const coords = this.engine.getCanvasCoords(e);
      this.isDrawing = true;
      this.startX = coords.x;
      this.startY = coords.y;
      this.lastX = coords.x;
      this.lastY = coords.y;

      if (this.activeTool === 'brush' || this.activeTool === 'eraser') {
        this.drawStroke(coords.x, coords.y, true);
      }

      if (this.activeTool === 'text') {
        this.handleTextClick(coords.x, coords.y);
      }
    };

    const handleMove = (e) => {
      const coords = this.engine.getCanvasCoords(e);

      // Cursor Coords status text update
      const coordsText = document.getElementById('cursor-coords');
      if (coordsText) coordsText.textContent = `X: ${coords.x}, Y: ${coords.y}`;

      if (!this.isDrawing) return;

      if (e.cancelable && (e.type.startsWith('touch') || e.type.startsWith('pointer'))) {
        e.preventDefault();
      }

      if (this.activeTool === 'brush' || this.activeTool === 'eraser') {
        this.drawStroke(coords.x, coords.y, false);
      } else if (this.activeTool.startsWith('shape-') || this.activeTool === 'crop') {
        this.drawPreviewShape(coords.x, coords.y);
      }

      this.lastX = coords.x;
      this.lastY = coords.y;
    };

    const handleEnd = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;

      const coords = this.engine.getCanvasCoords(e);

      if (this.activeTool === 'brush' || this.activeTool === 'eraser') {
        this.engine.render();
        this.engine.saveState(this.activeTool === 'brush' ? `Brush (${this.brushType})` : 'Eraser');
      } else if (this.activeTool.startsWith('shape-')) {
        this.commitShape(coords.x, coords.y);
        this.engine.overlayCtx.clearRect(0, 0, this.engine.width, this.engine.height);
        this.engine.render();
        this.engine.saveState(`Drawn ${this.activeTool}`);
      } else if (this.activeTool === 'crop') {
        const x = Math.min(this.startX, coords.x);
        const y = Math.min(this.startY, coords.y);
        const w = Math.abs(coords.x - this.startX);
        const h = Math.abs(coords.y - this.startY);

        if (w > 10 && h > 10) {
          this.cropRect = { x, y, width: w, height: h };
          this.drawCropMarquee(this.cropRect);
          const applyBtn = document.getElementById('btn-apply-crop');
          if (applyBtn) applyBtn.disabled = false;
        }
      }
    };

    // Pointer Events (iPad Touch & Apple Pencil)
    canvas.addEventListener('pointerdown', handleStart, { passive: false });
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);

    // Touch Events Fallback for Mobile Safari
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    // Mouse Fallbacks
    canvas.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
  }


  /**
   * Main Stroke Dispatcher
   */
  drawStroke(x, y, isStart = false) {
    const ctx = this.engine.drawCtx;

    if (this.activeTool === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = this.brushOpacity;
      ctx.lineWidth = this.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (isStart) {
        ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(this.lastX, this.lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.restore();
    } else { // Brush Modes
      if (this.brushType === 'ink') {
        this.drawInkStroke(ctx, this.lastX, this.lastY, x, y, isStart);
      } else if (this.brushType === 'calligraphy') {
        this.drawCalligraphyStroke(ctx, this.lastX, this.lastY, x, y, isStart);
      } else if (this.brushType === 'soft') {
        this.drawSoftStroke(ctx, this.lastX, this.lastY, x, y, isStart);
      } else { // 'round' standard
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = this.primaryColor;
        ctx.fillStyle = this.primaryColor;
        ctx.globalAlpha = this.brushOpacity;
        ctx.lineWidth = this.brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        if (isStart) {
          ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.moveTo(this.lastX, this.lastY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    this.engine.render();
  }

  /**
   * INK BLEED BRUSH (หมึกซึม / พู่กันหมึกจีน - ตามภาพตัวอย่างเรฟ)
   * Creates organic textured ink stroke with dark wet center and paper bleed edge bristles.
   */
  drawInkStroke(ctx, x1, y1, x2, y2, isStart) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.primaryColor;
    ctx.strokeStyle = this.primaryColor;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 2));

    const angle = Math.atan2(dy, dx);
    const radSize = this.brushSize / 2;

    for (let i = 0; i <= steps; i++) {
      const t = steps > 0 ? i / steps : 0;
      const cx = x1 + dx * t;
      const cy = y1 + dy * t;

      // 1. Core Solid Ink Base (Broad stroke with slight chisel orientation)
      ctx.save();
      ctx.globalAlpha = this.brushOpacity * 0.88;
      ctx.translate(cx, cy);
      ctx.rotate(-0.15); // Fixed calligraphic ink nib angle

      ctx.beginPath();
      ctx.ellipse(0, 0, radSize, Math.max(2, radSize * 0.45), 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Wet Ink Core Layer for rich density
      ctx.globalAlpha = this.brushOpacity * 0.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, radSize * 0.7, radSize * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Organic Ink Bleed & Bristle Texture Edges (Micro-particles along border)
      const numBristles = Math.min(18, Math.max(4, Math.floor(radSize * 0.6)));
      for (let b = 0; b < numBristles; b++) {
        // Scatter along outer border of the stroke
        const bAngle = (b / numBristles) * Math.PI * 2;
        const scatterDist = radSize * (0.8 + (Math.random() * 0.35));
        const bx = cx + Math.cos(bAngle) * scatterDist;
        const by = cy + Math.sin(bAngle) * scatterDist * 0.5; // Flattened ellipse bleed
        
        const bRadius = Math.max(0.8, (Math.random() * radSize * 0.18));
        const bAlpha = this.brushOpacity * (0.1 + Math.random() * 0.35);

        ctx.save();
        ctx.globalAlpha = bAlpha;
        ctx.beginPath();
        ctx.arc(bx, by, bRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * CALLIGRAPHY BRUSH (พู่กันหมึกปาด / Flat Chisel Nib)
   */
  drawCalligraphyStroke(ctx, x1, y1, x2, y2, isStart) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.primaryColor;
    ctx.globalAlpha = this.brushOpacity;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 2));
    const nibAngle = -Math.PI / 4; // 45 degree fixed chisel angle
    const width = this.brushSize;

    for (let i = 0; i <= steps; i++) {
      const t = steps > 0 ? i / steps : 0;
      const cx = x1 + dx * t;
      const cy = y1 + dy * t;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(nibAngle);
      ctx.fillRect(-width / 2, -2, width, 4);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * SOFT EDGE GLOW BRUSH
   */
  drawSoftStroke(ctx, x1, y1, x2, y2, isStart) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    const rad = this.brushSize / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 3));

    for (let i = 0; i <= steps; i++) {
      const t = steps > 0 ? i / steps : 0;
      const cx = x1 + dx * t;
      const cy = y1 + dy * t;

      const grad = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
      grad.addColorStop(0, this.primaryColor);
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.globalAlpha = this.brushOpacity * 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Draw shape preview on overlay canvas
   */
  drawPreviewShape(currentX, currentY) {
    const ctx = this.engine.overlayCtx;
    ctx.clearRect(0, 0, this.engine.width, this.engine.height);
    ctx.save();

    if (this.activeTool === 'crop') {
      const x = Math.min(this.startX, currentX);
      const y = Math.min(this.startY, currentY);
      const w = Math.abs(currentX - this.startX);
      const h = Math.abs(currentY - this.startY);
      this.drawCropMarquee({ x, y, width: w, height: h });
      ctx.restore();
      return;
    }

    ctx.strokeStyle = this.primaryColor;
    ctx.fillStyle = this.primaryColor;
    ctx.lineWidth = this.brushSize;
    ctx.globalAlpha = 0.8;

    this.renderShapePath(ctx, this.startX, this.startY, currentX, currentY, this.activeTool, this.fillShape);
    ctx.restore();
  }

  /**
   * Commit final shape onto draw layer canvas
   */
  commitShape(currentX, currentY) {
    const ctx = this.engine.drawCtx;
    ctx.save();
    ctx.strokeStyle = this.primaryColor;
    ctx.fillStyle = this.primaryColor;
    ctx.lineWidth = this.brushSize;
    ctx.globalAlpha = this.brushOpacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.renderShapePath(ctx, this.startX, this.startY, currentX, currentY, this.activeTool, this.fillShape);
    ctx.restore();
  }

  /**
   * Helper rendering shape geometries
   */
  renderShapePath(ctx, x1, y1, x2, y2, tool, fill = false) {
    const width = x2 - x1;
    const height = y2 - y1;

    ctx.beginPath();

    if (tool === 'shape-rect') {
      if (fill) {
        ctx.fillRect(x1, y1, width, height);
      } else {
        ctx.strokeRect(x1, y1, width, height);
      }
    } else if (tool === 'shape-circle') {
      const rx = Math.abs(width) / 2;
      const ry = Math.abs(height) / 2;
      const cx = x1 + width / 2;
      const cy = y1 + height / 2;

      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (fill) ctx.fill();
      else ctx.stroke();
    } else if (tool === 'shape-line') {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (tool === 'shape-arrow') {
      // Line
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = Math.max(16, ctx.lineWidth * 3);

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }
  }

  /**
   * Render Marquee Overlay for Crop
   */
  drawCropMarquee(rect) {
    const ctx = this.engine.overlayCtx;
    ctx.clearRect(0, 0, this.engine.width, this.engine.height);

    // Darkened mask outer area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, this.engine.width, this.engine.height);
    ctx.clearRect(rect.x, rect.y, rect.width, rect.height);

    // Dashed Marquee border
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.setLineDash([]); // Reset dash

    // Grid rule-of-thirds lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Vertical lines
    ctx.moveTo(rect.x + rect.width / 3, rect.y);
    ctx.lineTo(rect.x + rect.width / 3, rect.y + rect.height);
    ctx.moveTo(rect.x + (rect.width * 2) / 3, rect.y);
    ctx.lineTo(rect.x + (rect.width * 2) / 3, rect.y + rect.height);
    // Horizontal lines
    ctx.moveTo(rect.x, rect.y + rect.height / 3);
    ctx.lineTo(rect.x + rect.width, rect.y + rect.height / 3);
    ctx.moveTo(rect.x, rect.y + (rect.height * 2) / 3);
    ctx.lineTo(rect.x, rect.y + (rect.height * 2) / 3);
    ctx.stroke();
  }

  /**
   * Handle text overlay insertion
   */
  handleTextClick(x, y) {
    const textPrompt = prompt('พิมพ์ข้อความที่ต้องการใส่ลงในภาพ:', 'PhotoWeb Studio');
    if (!textPrompt || !textPrompt.trim()) return;

    const ctx = this.engine.drawCtx;
    ctx.save();
    ctx.font = `500 ${this.fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = this.primaryColor;
    ctx.textBaseline = 'top';

    // Optional subtle outline/shadow for readability
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillText(textPrompt, x, y);
    ctx.restore();

    this.engine.render();
    this.engine.saveState(`Added Text "${textPrompt.substring(0, 10)}..."`);
  }
}
