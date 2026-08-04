/**
 * PhotoWeb Studio - Image Adjustments & Filters Engine
 */

export const DEFAULT_ADJUSTMENTS = {
  brightness: 0,   // -100 to 100
  contrast: 0,     // -100 to 100
  saturation: 0,   // -100 to 100
  hue: 0,          // -180 to 180 deg
  blur: 0,         // 0 to 20 px
  sharpen: 0,      // 0 to 100
  invert: false,
  preset: 'normal'
};

/**
 * Apply filters & adjustments to canvas
 * @param {HTMLCanvasElement} srcCanvas - Source canvas with original image layer
 * @param {HTMLCanvasElement} dstCanvas - Destination main canvas
 * @param {Object} adj - Adjustments object
 */
export function applyAdjustmentsToCanvas(srcCanvas, dstCanvas, adj = DEFAULT_ADJUSTMENTS) {
  if (!srcCanvas || !dstCanvas) return;

  const ctx = dstCanvas.getContext('2d');
  const w = srcCanvas.width;
  const h = srcCanvas.height;

  if (dstCanvas.width !== w || dstCanvas.height !== h) {
    dstCanvas.width = w;
    dstCanvas.height = h;
  }

  // Build CSS Filter string for native GPU hardware accelerated filters
  const filterParts = [];

  // Brightness (100% is baseline)
  const bVal = 100 + Number(adj.brightness || 0);
  filterParts.push(`brightness(${Math.max(0, bVal)}%)`);

  // Contrast (100% baseline)
  const cVal = 100 + Number(adj.contrast || 0);
  filterParts.push(`contrast(${Math.max(0, cVal)}%)`);

  // Saturation (100% baseline)
  const sVal = 100 + Number(adj.saturation || 0);
  filterParts.push(`saturate(${Math.max(0, sVal)}%)`);

  // Hue rotate
  const hVal = Number(adj.hue || 0);
  if (hVal !== 0) {
    filterParts.push(`hue-rotate(${hVal}deg)`);
  }

  // Blur
  const blurVal = Number(adj.blur || 0);
  if (blurVal > 0) {
    filterParts.push(`blur(${blurVal}px)`);
  }

  // Preset Filters adjustments
  if (adj.preset && adj.preset !== 'normal') {
    switch (adj.preset) {
      case 'vintage':
        filterParts.push('sepia(70%) contrast(110%)');
        break;
      case 'cyberpunk':
        filterParts.push('hue-rotate(180deg) saturate(220%) contrast(120%)');
        break;
      case 'dramatic':
        filterParts.push('grayscale(100%) contrast(180%)');
        break;
      case 'warm':
        filterParts.push('sepia(35%) saturate(160%) brightness(105%)');
        break;
      case 'cool':
        filterParts.push('hue-rotate(90deg) brightness(110%) saturate(120%)');
        break;
      case 'invert':
        filterParts.push('invert(100%)');
        break;
      case 'popart':
        filterParts.push('saturate(300%) contrast(140%)');
        break;
    }
  }

  if (adj.invert) {
    filterParts.push('invert(100%)');
  }

  // Render to destination canvas
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.filter = filterParts.join(' ');
  ctx.drawImage(srcCanvas, 0, 0);
  ctx.restore();

  // Apply convolution Sharpen filter if requested via ImageData pixel math
  if (adj.sharpen > 0) {
    applySharpenConvolution(ctx, w, h, adj.sharpen / 100);
  }
}

/**
 * Perform 3x3 Sharpen Convolution Kernel on ImageData
 */
function applySharpenConvolution(ctx, w, h, amount) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = imgData.data;
  const output = ctx.createImageData(w, h);
  const dst = output.data;

  // Sharpen kernel formula
  const kCenter = 1 + 4 * amount;
  const kEdge = -amount;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) { // R, G, B
        const val = 
          src[i + c] * kCenter +
          (src[((y - 1) * w + x) * 4 + c] +
           src[((y + 1) * w + x) * 4 + c] +
           src[(y * w + (x - 1)) * 4 + c] +
           src[(y * w + (x + 1)) * 4 + c]) * kEdge;
        
        dst[i + c] = Math.min(255, Math.max(0, val));
      }
      dst[i + 3] = src[i + 3]; // Alpha channel preserved
    }
  }

  ctx.putImageData(output, 0, 0);
}
