/**
 * Compresses and resizes an image file using the HTML5 Canvas API.
 * 
 * @param {File} file - The original image file
 * @param {number} maxWidth - Maximum width (default: 1024)
 * @param {number} maxHeight - Maximum height (default: 1024)
 * @param {number} quality - JPEG/WebP quality from 0.0 to 1.0 (default: 0.8)
 * @returns {Promise<File>} The optimized image file
 */
export const optimizeImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // Only optimize if it's an image
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions keeping aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Try to export as webp, fallback to jpeg
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob failed'));
            return;
          }
          // Convert Blob back to File
          const optimizedFile = new File([blob], file.name, {
            type: blob.type,
            lastModified: Date.now(),
          });
          resolve(optimizedFile);
        },
        type,
        quality
      );
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };

    img.src = objectUrl;
  });
};
