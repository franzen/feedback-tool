import html2canvas from 'html2canvas-pro';

const RESOURCE_WAIT_MS = 2500;

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
}

async function waitForPageResources() {
  if (document.fonts?.ready) {
    await withTimeout(document.fonts.ready.catch(() => undefined), RESOURCE_WAIT_MS);
  }

  const images = Array.from(document.images).filter((image) => !image.complete);
  if (!images.length) return;

  await withTimeout(
    Promise.all(
      images.map(
        (image) =>
          new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          }),
      ),
    ),
    RESOURCE_WAIT_MS,
  );
}

export function expectedCaptureDimensions(win = window) {
  const scale = Math.min(Math.max(win.devicePixelRatio || 1, 1), 2);
  return {
    width: Math.round(win.innerWidth * scale),
    height: Math.round(win.innerHeight * scale),
    scale,
  };
}

export async function validateCapture(canvas, expected = expectedCaptureDimensions()) {
  if (!canvas || canvas.width < 1 || canvas.height < 1) {
    throw new Error('The page capture was empty.');
  }

  if (Math.abs(canvas.width - expected.width) > 2 || Math.abs(canvas.height - expected.height) > 2) {
    throw new Error('The page capture dimensions did not match the visible viewport.');
  }

  try {
    canvas.getContext('2d').getImageData(0, 0, 1, 1);
  } catch {
    throw new Error('The page contains cross-origin content that prevents screenshot export.');
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The browser could not export the page capture.');

  return canvas;
}

export async function captureViewport() {
  await waitForPageResources();
  const expected = expectedCaptureDimensions();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const canvas = await html2canvas(document.documentElement, {
    allowTaint: false,
    backgroundColor: getComputedStyle(document.documentElement).backgroundColor || '#ffffff',
    height: window.innerHeight,
    ignoreElements: (element) => element.hasAttribute?.('data-feedback-tool-root'),
    logging: false,
    onclone: (clonedDocument) => {
      const style = clonedDocument.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-delay: 0s !important;
          animation-play-state: paused !important;
          caret-color: transparent !important;
          transition: none !important;
        }
      `;
      clonedDocument.head.append(style);
    },
    scale: expected.scale,
    scrollX,
    scrollY,
    useCORS: true,
    width: window.innerWidth,
    windowHeight: window.innerHeight,
    windowWidth: window.innerWidth,
    x: scrollX,
    y: scrollY,
  });

  return validateCapture(canvas, expected);
}
