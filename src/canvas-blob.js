/**
 * Encode a canvas as a PNG Blob.
 *
 * Chromium schedules `HTMLCanvasElement.toBlob()` (and `OffscreenCanvas.convertToBlob()`)
 * encoding into idle periods and only forces it after a multi-second timeout, so on a
 * busy page the promise can take ~7s to settle. `toDataURL()` encodes synchronously,
 * which briefly blocks the main thread but finishes in predictable time.
 *
 * Yields one frame first so any "Preparing…" UI can paint before encoding starts.
 * Resolves to null if the browser could not produce PNG data. Throws a SecurityError
 * for tainted canvases, like `toBlob()`.
 */
export async function canvasToPngBlob(canvas) {
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));

  const dataUrl = canvas.toDataURL('image/png');
  const prefix = 'data:image/png;base64,';
  if (!dataUrl.startsWith(prefix)) return null;

  const binary = atob(dataUrl.slice(prefix.length));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: 'image/png' });
}
