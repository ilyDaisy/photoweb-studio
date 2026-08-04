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
 * @param {HTMLCanvasElement} canvas 
 */
export async function copyCanvasToClipboard(canvas) {
  if (!canvas) {
    showToast('ไม่มีรูปภาพบน Canvas ให้ก็อปปี้', 'error');
    return false;
  }

  try {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('ไม่สามารถสร้างข้อมูลรูปภาพได้', 'error');
          resolve(false);
          return;
        }

        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            showToast('📋 ก็อปปี้รูปภาพลง Clipboard สำเร็จ! (พร้อมนำไปกด Ctrl+V วางต่อได้เลย)', 'success');
            resolve(true);
          } else {
            showToast('เบราว์เซอร์นี้ไม่รองรับ ClipboardItem API', 'error');
            resolve(false);
          }
        } catch (err) {
          console.error('Clipboard write error:', err);
          showToast(`ไม่สามารถก็อปปี้ลง Clipboard ได้: ${err.message || 'โปรดตรวจสอบ Permissions'}`, 'error');
          resolve(false);
        }
      }, 'image/png');
    });
  } catch (err) {
    console.error('Canvas blob error:', err);
    showToast('เกิดข้อผิดพลาดในการก็อปปี้ภาพ', 'error');
    return false;
  }
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
    showToast('กรุณากด Ctrl+V บนคีย์บอร์ดเพื่อวางรูปภาพ', 'info');
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
        showToast('📥 วางรูปภาพจาก Clipboard เรียบร้อยแล้ว! (Ctrl+V)', 'success');
      };
      img.src = url;
      break;
    }
  }
}
