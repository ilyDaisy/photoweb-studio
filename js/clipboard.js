/**
 * PhotoWeb Studio - Clipboard Manager & Toast Notification System
 */

/**
 * Display a modern Toast notification on screen
 * @param {string} message - Message text
 * @param {'success'|'error'|'info'} type - Type of toast
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
 * Supports Safari/iPadOS Promise<Blob> synchronous user-activation model
 * @param {HTMLCanvasElement} canvas 
 */
export async function copyCanvasToClipboard(canvas) {
  if (!canvas) {
    showToast('ไม่มีรูปภาพบน Canvas ให้ก็อปปี้', 'error');
    return false;
  }

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      // 1. iOS Safari Compliant: Pass Promise<Blob> synchronously inside ClipboardItem to preserve user click activation
      const blobPromise = new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/png');
      });

      const item = new ClipboardItem({ 'image/png': blobPromise });
      await navigator.clipboard.write([item]);
      showToast('📋 ก็อปปี้รูปภาพลง Clipboard สำเร็จ! (พร้อมนำไปกดวางได้เลย)', 'success');
      return true;
    } else {
      showToast('เบราว์เซอร์นี้ไม่รองรับ ClipboardItem API', 'error');
      showIOSCopyFallbackModal(canvas);
      return false;
    }
  } catch (err) {
    console.warn('Primary Clipboard write failed, attempting fallback...', err);

    // Fallback 2: Try resolved blob write
    try {
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      if (blob && navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        showToast('📋 ก็อปปี้รูปภาพลง Clipboard สำเร็จ!', 'success');
        return true;
      }
    } catch (fallbackErr) {
      console.error('All clipboard write attempts failed:', fallbackErr);
    }

    // Fallback 3 for iOS Safari: Show easy Copy preview modal for touch & hold
    showIOSCopyFallbackModal(canvas);
    return false;
  }
}

/**
 * Fallback Modal for iOS Safari when direct Clipboard write is blocked by iOS policy
 * Allows 1-tap Long Press "Copy Image" or Download
 */
function showIOSCopyFallbackModal(canvas) {
  let modal = document.getElementById('ios-copy-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ios-copy-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const dataUrl = canvas.toDataURL('image/png');

  modal.innerHTML = `
    <div class="modal-card" style="max-width: 440px;">
      <div class="modal-header">
        <h3><i class="fa-regular fa-copy"></i> คัดลอกรูปภาพ (iPad / iOS)</h3>
        <button class="btn-close" onclick="document.getElementById('ios-copy-modal').classList.add('hidden')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body" style="align-items: center; text-align: center;">
        <p class="text-sm" style="color: var(--accent-cyan); font-weight: 500;">
          💡 แตะที่รูปภาพด้านล่างค้างไว้ (Long Press) แล้วเลือก <b>"คัดลอกรูปภาพ" (Copy Image)</b>
        </p>
        <div style="max-height: 260px; overflow: auto; border: 1px dashed var(--border-color); border-radius: 8px; padding: 6px; background: #111;">
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
}

/**
 * Paste image from system Clipboard via async Clipboard API
 * @param {Function} onImageLoaded - Callback receiving HTMLImageElement
 */
export async function pasteFromClipboardAsync(onImageLoaded) {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      showToast('โปรดใช้คีย์ลัด Ctrl+V เพื่อวางรูปภาพในเบราว์เซอร์นี้', 'info');
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
 * @param {ClipboardEvent} e 
 * @param {Function} onImageLoaded 
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
