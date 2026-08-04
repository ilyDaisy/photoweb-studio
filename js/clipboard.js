/**
 * PhotoWeb Studio - Clipboard Manager & Toast Notification System
 */

/**
 * Display a modern Toast notification on screen
 */
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconClass = 'fa-solid fa-check-circle';
  if (type === 'error') iconClass = 'fa-solid fa-triangle-exclamation';
  if (type === 'info') iconClass = 'fa-solid fa-circle-info';

  toast.innerHTML = `
    <i class="${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

/**
 * Copy HTML5 Canvas content directly to system Clipboard as PNG
 * Supports iPadOS / iOS Web Share API and Copy Sheet fallback
 */
export async function copyCanvasToClipboard(canvas) {
  if (!canvas) {
    showToast('ไม่มีรูปภาพบน Canvas ให้ก็อปปี้', 'error');
    return false;
  }

  // Convert Canvas to Blob
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    showToast('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ', 'error');
    return false;
  }

  // Method 1: Try direct Async Clipboard API (Works on Desktop Chrome / Edge / Safari Desktop)
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      showToast('📋 ก็อปปี้รูปภาพลง Clipboard สำเร็จ! (พร้อมกดวางได้ทันที)', 'success');
      return true;
    }
  } catch (err) {
    console.warn('Direct clipboard write blocked by browser security policy:', err);
  }

  // Method 2: Web Share API (Works natively on iPadOS / iOS Safari -> Opens native iOS sheet with "Copy")
  try {
    const file = new File([blob], 'photoweb-edited.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      showToast('📲 กำลังเปิดเมนูคัดลอกรูปภาพ (โปรดเลือก "Copy" หรือ "คัดลอก")', 'info');
      await navigator.share({
        files: [file],
        title: 'PhotoWeb Studio Image'
      });
      return true;
    }
  } catch (shareErr) {
    console.warn('Web share cancelled or failed:', shareErr);
  }

  // Method 3: Clean iOS Copy Sheet Modal (Allows Tap & Hold Long Press "Copy Image" or Download)
  showIOSCopyFallbackModal(canvas, blob);
  return false;
}

/**
 * Clean Copy Modal for iOS Safari / iPadOS when direct API is restricted
 */
function showIOSCopyFallbackModal(canvas, blob) {
  let modal = document.getElementById('ios-copy-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ios-copy-modal';
    modal.className = 'modal-backdrop';
    modal.style.zIndex = '10000';
    document.body.appendChild(modal);
  }

  const dataUrl = canvas.toDataURL('image/png');

  modal.innerHTML = `
    <div class="modal-card" style="max-width: 440px; box-shadow: 0 0 30px rgba(0,229,255,0.4);">
      <div class="modal-header">
        <h3><i class="fa-regular fa-copy" style="color:var(--accent-cyan)"></i> คัดลอกรูปภาพลง Clipboard</h3>
        <button class="btn-close" onclick="document.getElementById('ios-copy-modal').classList.add('hidden')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body" style="align-items: center; text-align: center;">
        <p class="text-sm" style="color: var(--accent-cyan); font-weight: 500;">
          💡 แตะที่รูปภาพด้านล่างค้างไว้ (Long Press) แล้วเลือก <b>"คัดลอกรูปภาพ" (Copy Image)</b> เพื่อวางต่อได้ทันที
        </p>
        <div style="max-height: 260px; overflow: auto; border: 1px dashed var(--accent-cyan); border-radius: 8px; padding: 6px; background: #111;">
          <img src="${dataUrl}" style="max-width: 100%; height: auto; border-radius: 4px; display: block;" alt="Copied Canvas Image">
        </div>
      </div>
      <div class="modal-footer" style="justify-content: space-between;">
        <button class="btn btn-dark" onclick="document.getElementById('ios-copy-modal').classList.add('hidden')">ปิด</button>
        <a href="${dataUrl}" download="photoweb-edited.png" class="btn btn-primary">
          <i class="fa-solid fa-download"></i> บันทึกรูปภาพ
        </a>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  showToast('💡 แตะรูปค้างไว้เพื่อคัดลอก (Copy Image) ได้ทันที', 'info');
}

/**
 * Paste image from system Clipboard via async Clipboard API
 */
export async function pasteFromClipboardAsync(onImageLoaded) {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      showToast('โปรดกดคีย์ลัด Ctrl+V หรือแตะวางรูปภาพ', 'info');
      return false;
    }

    const clipboardItems = await navigator.clipboard.read();
    let imageFound = false;

    for (const item of clipboardItems) {
      const imageType = item.types.find(t => t.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          onImageLoaded(img);
          URL.revokeObjectURL(url);
          showToast('📥 วางรูปภาพจาก Clipboard เรียบร้อยแล้ว!', 'success');
        };
        img.src = url;
        imageFound = true;
        break;
      }
    }

    if (!imageFound) {
      showToast('ไม่พบข้อมูลรูปภาพใน Clipboard (กรุณาก็อปปี้รูปภาพก่อนวาง)', 'error');
    }
    return imageFound;
  } catch (err) {
    console.warn('Async clipboard read blocked/error:', err);
    showToast('กรุณากด Ctrl+V หรือแตะวางรูปภาพ', 'info');
    return false;
  }
}

/**
 * Handle Paste Event (Ctrl+V) from global window event listener
 */
export function handlePasteEvent(e, onImageLoaded) {
  const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault();
      const blob = item.getAsFile();
      if (!blob) continue;

      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        onImageLoaded(img);
        URL.revokeObjectURL(url);
        showToast('📥 วางรูปภาพจาก Clipboard เรียบร้อยแล้ว!', 'success');
      };
      img.src = url;
      break;
    }
  }
}
