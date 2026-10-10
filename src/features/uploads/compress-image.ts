// Shrinks a user-picked image in the browser before it's uploaded, so storage and every later
// page view serve a ~100–200 KB file instead of a multi-megabyte photo straight off a phone.

interface CompressImageOptions {
  maxWidth: number;
  maxHeight: number;
  // Aim to come in at or under this size; quality (and if needed, dimensions) step down to get there.
  targetBytes: number;
}

const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55];
const MIN_SCALE = 0.4;

async function decodeImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  // createImageBitmap applies the photo's EXIF orientation, so phone pictures aren't sideways.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Some formats (e.g. SVG) can't be decoded this way; fall through to an <img>.
    }
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File, { maxWidth, maxHeight, targetBytes }: CompressImageOptions): Promise<Blob> {
  const image = await decodeImage(file);
  const fitScale = Math.min(1, maxWidth / image.width, maxHeight / image.height);

  let best: Blob | null = null;
  for (let scale = fitScale; scale >= fitScale * MIN_SCALE; scale *= 0.8) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) break;
    // JPEG has no transparency; a white backdrop stops transparent PNG areas turning black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of QUALITY_STEPS) {
      // WebP is smaller; browsers that can't encode it hand back a PNG, so fall back to JPEG.
      let blob = await canvasToBlob(canvas, 'image/webp', quality);
      if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= targetBytes) return blob;
    }
  }

  // Never upload something bigger than what the user picked (e.g. an already-small image).
  if (!best || best.size >= file.size) return file;
  return best;
}
