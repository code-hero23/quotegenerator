/**
 * Image Optimizer for Quotation & Unit Snips
 * 
 * Automatically enhances snip quality:
 * 1. Detects low-resolution screenshots (e.g. 600px - 1400px captured from standard 1080p monitors)
 * 2. Uses high-quality bicubic resampling to scale up to crisp 200-300 DPI equivalent (~2000-2400px width)
 * 3. Converts lossy formats (JPEG) to clean, lossless PNG to prevent double-compression artifacts in PPTX & PDF
 */
export async function optimizeSnipFile(file) {
  if (!file || !(file instanceof Blob || file instanceof File)) {
    return file;
  }

  // Only optimize image types
  if (file.type && !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        // If already high-resolution (>= 2200px wide or >= 2800px tall) and already PNG, keep original
        if (origWidth >= 2200 || origHeight >= 2800) {
          if (file.type === 'image/png') {
            return resolve(file);
          }
        }

        // Calculate upscale ratio to match slide content width (~2200px for 250+ DPI)
        let scale = 1;
        if (origWidth < 900) {
          scale = 2.5;
        } else if (origWidth < 1500) {
          scale = 2.0;
        } else if (origWidth < 2000) {
          scale = 1.4;
        }

        // If image is already wide enough, only re-encode if it was a lossy JPEG
        if (scale === 1 && file.type === 'image/png') {
          return resolve(file);
        }

        const targetWidth = Math.round(origWidth * scale);
        const targetHeight = Math.round(origHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(file);
        }

        // Enable highest quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob((blob) => {
          if (!blob) {
            return resolve(file);
          }
          const baseName = (file.name || 'snip').replace(/\.[^.]+$/, '');
          const optimizedFile = new File([blob], `${baseName}.png`, {
            type: 'image/png',
            lastModified: Date.now()
          });
          resolve(optimizedFile);
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };

      img.src = url;
    } catch (e) {
      console.warn('Image optimization skipped:', e);
      resolve(file);
    }
  });
}

