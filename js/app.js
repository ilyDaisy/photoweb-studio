/**
 * PhotoWeb Studio - Main Controller App
 */

import { CanvasEngine } from './canvas.js';
import { ToolsManager } from './tools.js';
import { copyCanvasToClipboard, pasteFromClipboardAsync, handlePasteEvent, showToast } from './clipboard.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Engines
  const canvasEngine = new CanvasEngine();
  const toolsManager = new ToolsManager(canvasEngine);

  // Set Default Tool
  toolsManager.setTool('select');

  /* ==========================================================================
     Clipboard Operations & Keyboard Shortcuts
     ========================================================================== */

  // Global Paste Event (Ctrl+V anywhere on window)
  window.addEventListener('paste', (e) => {
    handlePasteEvent(e, (img) => {
      canvasEngine.loadImage(img);
    });
  });

  // Global Keydown Hotkeys
  window.addEventListener('keydown', (e) => {
    // Ignore hotkeys when typing in text inputs or prompts
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    const key = e.key.toLowerCase();
    const isCtrl = e.ctrlKey || e.metaKey;

    // 1. Undo / Redo Shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
    if (isCtrl && (key === 'z' || e.code === 'KeyZ')) {
      e.preventDefault();
      if (e.shiftKey) {
        canvasEngine.redo();
        showToast('Redo (Ctrl+Shift+Z)', 'info');
      } else {
        canvasEngine.undo();
        showToast('Undo (Ctrl+Z)', 'info');
      }
    } else if (isCtrl && (key === 'y' || e.code === 'KeyY')) {
      e.preventDefault();
      canvasEngine.redo();
      showToast('Redo (Ctrl+Y)', 'info');
    }

    // 2. Zoom In Shortcut (Ctrl + / Ctrl =)
    else if (isCtrl && (key === '+' || key === '=' || e.code === 'Equal' || e.code === 'NumpadAdd')) {
      e.preventDefault();
      canvasEngine.setZoom(canvasEngine.zoom * 1.25);
    }

    // 3. Zoom Out Shortcut (Ctrl - / Ctrl _)
    else if (isCtrl && (key === '-' || key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract')) {
      e.preventDefault();
      canvasEngine.setZoom(canvasEngine.zoom / 1.25);
    }

    // 4. Zoom Fit Shortcut (Ctrl 0)
    else if (isCtrl && (key === '0' || e.code === 'Digit0' || e.code === 'Numpad0')) {
      e.preventDefault();
      canvasEngine.zoomToFit();
      showToast('Fit Canvas (Ctrl+0)', 'info');
    }

    // 5. Copy to Clipboard (Ctrl+C)
    else if (isCtrl && (key === 'c' || e.code === 'KeyC')) {
      if (canvasEngine.hasImage) {
        e.preventDefault();
        copyCanvasToClipboard(canvasEngine.mainCanvas);
      }
    }

    // 6. Arrow Keys Viewport Panning (Photoshop Style)
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const panStep = e.shiftKey ? 120 : 40;

      if (e.key === 'ArrowUp') canvasEngine.panBy(0, panStep);
      if (e.key === 'ArrowDown') canvasEngine.panBy(0, -panStep);
      if (e.key === 'ArrowLeft') canvasEngine.panBy(panStep, 0);
      if (e.key === 'ArrowRight') canvasEngine.panBy(-panStep, 0);
    }

    // 7. Tool Switching Hotkeys (Single key press)
    else if (!isCtrl && !e.altKey) {
      if (key === 'v') toolsManager.setTool('select');
      if (key === 'c') toolsManager.setTool('crop');
      if (key === 'b') toolsManager.setTool('brush');
      if (key === 'e') toolsManager.setTool('eraser');
      if (key === 'r') toolsManager.setTool('shape-rect');
      if (key === 'o') toolsManager.setTool('shape-circle');
      if (key === 'a') toolsManager.setTool('shape-arrow');
      if (key === 'l') toolsManager.setTool('shape-line');
      if (key === 't') toolsManager.setTool('text');
      if (key === 'h') toolsManager.setTool('pan');
    }


  });

  /* ==========================================================================
     Header & Top Toolbar Actions
     ========================================================================== */

  // Paste Buttons
  const pasteHeaderBtn = document.getElementById('btn-paste-header');
  const triggerPasteCard = document.getElementById('btn-trigger-paste');

  const triggerPasteAction = () => {
    pasteFromClipboardAsync((img) => {
      canvasEngine.loadImage(img);
    });
  };

  if (pasteHeaderBtn) pasteHeaderBtn.addEventListener('click', triggerPasteAction);
  if (triggerPasteCard) triggerPasteCard.addEventListener('click', triggerPasteAction);

  // Copy Buttons
  const copyHeaderBtn = document.getElementById('btn-copy-header');
  const copySidebarBtn = document.getElementById('btn-copy-sidebar');

  const triggerCopyAction = () => {
    if (!canvasEngine.hasImage) {
      showToast('ไม่มีรูปภาพบน Canvas กรุณาวางรูปภาพก่อนก็อปปี้', 'error');
      return;
    }
    copyCanvasToClipboard(canvasEngine.mainCanvas);
  };

  if (copyHeaderBtn) copyHeaderBtn.addEventListener('click', triggerCopyAction);
  if (copySidebarBtn) copySidebarBtn.addEventListener('click', triggerCopyAction);

  // Undo / Redo Header Buttons
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  if (undoBtn) undoBtn.addEventListener('click', () => canvasEngine.undo());
  if (redoBtn) redoBtn.addEventListener('click', () => canvasEngine.redo());

  // Zoom Controls
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => canvasEngine.setZoom(canvasEngine.zoom * 1.25));
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => canvasEngine.setZoom(canvasEngine.zoom / 1.25));
  document.getElementById('btn-zoom-fit')?.addEventListener('click', () => canvasEngine.zoomToFit());

  // File Upload Input
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          canvasEngine.loadImage(img);
          URL.revokeObjectURL(url);
          showToast('โหลดไฟล์รูปภาพเรียบร้อยแล้ว!', 'success');
        };
        img.src = url;
      }
    });
  }

  /* ==========================================================================
     Left Toolbar Buttons & Color Pickers
     ========================================================================== */

  document.querySelectorAll('.left-toolbar .tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (tool) toolsManager.setTool(tool);
    });
  });

  // Color Swatch pickers
  const primaryColorPicker = document.getElementById('primary-color');
  const secondaryColorPicker = document.getElementById('secondary-color');
  const swapColorBtn = document.getElementById('btn-swap-color');

  if (primaryColorPicker) {
    primaryColorPicker.addEventListener('input', (e) => {
      toolsManager.primaryColor = e.target.value;
    });
  }

  if (secondaryColorPicker) {
    secondaryColorPicker.addEventListener('input', (e) => {
      toolsManager.secondaryColor = e.target.value;
    });
  }

  if (swapColorBtn) {
    swapColorBtn.addEventListener('click', () => {
      const temp = toolsManager.primaryColor;
      toolsManager.primaryColor = toolsManager.secondaryColor;
      toolsManager.secondaryColor = temp;

      if (primaryColorPicker) primaryColorPicker.value = toolsManager.primaryColor;
      if (secondaryColorPicker) secondaryColorPicker.value = toolsManager.secondaryColor;
    });
  }

  /* ==========================================================================
     Right Sidebar Panel Tabs & Sliders
     ========================================================================== */

  // Sidebar Tab Switching & Collapse Toggle
  const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
  const rightSidebar = document.querySelector('.right-sidebar');

  if (toggleSidebarBtn && rightSidebar) {
    toggleSidebarBtn.addEventListener('click', () => {
      rightSidebar.classList.toggle('collapsed');
      setTimeout(() => canvasEngine.zoomToFit(), 200);
    });
  }

  document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.dataset.tab;
      document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.right-sidebar .tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`tab-${tabTarget}`)?.classList.add('active');

      // Expand sidebar if collapsed when tapping tabs
      if (rightSidebar && rightSidebar.classList.contains('collapsed')) {
        rightSidebar.classList.remove('collapsed');
      }
    });
  });


  // Adjustments Sliders Event Wireup
  const sliderIds = ['brightness', 'contrast', 'saturation', 'hue', 'blur', 'sharpen'];
  sliderIds.forEach(id => {
    const slider = document.getElementById(`slider-${id}`);
    const valDisplay = document.getElementById(`val-${id}`);

    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = e.target.value;
        if (valDisplay) {
          valDisplay.textContent = id === 'hue' ? `${val}°` : (id === 'blur' ? `${val}px` : val);
        }
        canvasEngine.adjustments[id] = parseFloat(val);
        canvasEngine.render();
      });
    }
  });

  // Reset Adjustments
  document.getElementById('btn-reset-adj')?.addEventListener('click', () => {
    canvasEngine.resetAdjustments(true);
    showToast('รีเซ็ตการปรับแต่งเรียบร้อยแล้ว', 'info');
  });

  // Filter Presets Cards
  document.querySelectorAll('.filter-preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const preset = card.dataset.preset;
      document.querySelectorAll('.filter-preset-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      canvasEngine.adjustments.preset = preset;
      canvasEngine.render();
      showToast(`ปรับใช้ฟิลเตอร์ ${card.querySelector('span').textContent}`, 'success');
    });
  });

  // Transform Actions
  document.getElementById('btn-rotate-left')?.addEventListener('click', () => canvasEngine.rotate(-90));
  document.getElementById('btn-rotate-right')?.addEventListener('click', () => canvasEngine.rotate(90));
  document.getElementById('btn-flip-h')?.addEventListener('click', () => canvasEngine.flip(true));
  document.getElementById('btn-flip-v')?.addEventListener('click', () => canvasEngine.flip(false));

  // Canvas Resize Form
  document.getElementById('btn-apply-resize')?.addEventListener('click', () => {
    const wInput = document.getElementById('input-width');
    const hInput = document.getElementById('input-height');
    if (wInput && hInput) {
      canvasEngine.resizeCanvas(parseInt(wInput.value, 10), parseInt(hInput.value, 10));
      showToast('ปรับขนาด Canvas เรียบร้อยแล้ว', 'success');
    }
  });

  // Keep aspect ratio resize listener
  const wInp = document.getElementById('input-width');
  const hInp = document.getElementById('input-height');
  const checkAspect = document.getElementById('check-aspect');

  if (wInp && hInp && checkAspect) {
    wInp.addEventListener('input', () => {
      if (checkAspect.checked && canvasEngine.width > 0) {
        const ratio = canvasEngine.height / canvasEngine.width;
        hInp.value = Math.round(wInp.value * ratio);
      }
    });
  }

  /* ==========================================================================
     Export File Modal (Secondary option)
     ========================================================================== */

  const exportModal = document.getElementById('export-modal');
  const exportBtnHeader = document.getElementById('btn-export-file');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const cancelModalBtn = document.getElementById('btn-cancel-modal');
  const confirmExportBtn = document.getElementById('btn-confirm-export');

  if (exportBtnHeader) {
    exportBtnHeader.addEventListener('click', () => {
      if (!canvasEngine.hasImage) {
        showToast('ไม่มีรูปภาพให้ดาวน์โหลด', 'error');
        return;
      }
      exportModal.classList.remove('hidden');
    });
  }

  const hideModal = () => exportModal?.classList.add('hidden');
  if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);

  if (confirmExportBtn) {
    confirmExportBtn.addEventListener('click', () => {
      const filename = document.getElementById('export-filename')?.value || 'edited-image';
      const format = document.getElementById('export-format')?.value || 'image/png';
      const ext = format.split('/')[1];

      const link = document.createElement('a');
      link.download = `${filename}.${ext}`;
      link.href = canvasEngine.mainCanvas.toDataURL(format, 0.92);
      link.click();

      hideModal();
      showToast(`ดาวน์โหลดไฟล์ ${filename}.${ext} สำเร็จ!`, 'success');
    });
  }

  /* ==========================================================================
     Demo Sample Images Generator
     ========================================================================== */

  document.querySelectorAll('.sample-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.sample;
      const demoImg = createDemoCanvasImage(type);
      canvasEngine.loadImage(demoImg);
      showToast(`โหลดรูปภาพตัวอย่าง (${chip.textContent}) สำเร็จ!`, 'info');
    });
  });

  function createDemoCanvasImage(type) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');

    if (type === 'banner') {
      c.width = 900;
      c.height = 500;
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 900, 500);
      grad.addColorStop(0, '#0f2027');
      grad.addColorStop(0.5, '#203a43');
      grad.addColorStop(1, '#2c5364');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 900, 500);

      // Glowing circles
      ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(200, 150, 180, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 0, 128, 0.25)';
      ctx.beginPath();
      ctx.arc(750, 380, 220, 0, Math.PI * 2);
      ctx.fill();

      // Text Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Sarabun, sans-serif';
      ctx.fillText('PhotoWeb Studio 🎨', 100, 220);
      ctx.fillStyle = '#00e5ff';
      ctx.font = '24px Sarabun, sans-serif';
      ctx.fillText('ก็อปปี้และวางรูปผ่าน Clipboard ได้ง่ายๆ ทุกเวลา', 100, 275);
    } else if (type === 'portrait') {
      c.width = 600;
      c.height = 750;
      const grad = ctx.createLinearGradient(0, 0, 0, 750);
      grad.addColorStop(0, '#ff7e5f');
      grad.addColorStop(1, '#feb47b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 750);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Sarabun, sans-serif';
      ctx.fillText('📸 Sample Portrait Canvas', 80, 360);
    } else {
      c.width = 800;
      c.height = 480;
      const grad = ctx.createLinearGradient(0, 0, 800, 0);
      grad.addColorStop(0, '#11998e');
      grad.addColorStop(1, '#38ef7d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 480);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Sarabun, sans-serif';
      ctx.fillText('🏔️ Scenic Landscape View', 180, 240);
    }

    return c;
  }
});
