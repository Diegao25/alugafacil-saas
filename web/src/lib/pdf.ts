function isIosSafari() {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isWebKit = /WebKit/.test(userAgent);
  const isCriOS = /CriOS/.test(userAgent);
  const isFxiOS = /FxiOS/.test(userAgent);

  return isIOS && isWebKit && !isCriOS && !isFxiOS;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível converter o PDF.'));
    reader.readAsDataURL(blob);
  });
}

export async function openPdfPreviewFromBlob(blob: Blob, previewWindow: Window | null) {
  if (isIosSafari()) {
    const dataUrl = await blobToDataUrl(blob);
    if (previewWindow && !previewWindow.closed) {
      previewWindow.close();
    }
    // On iOS Safari, navigating the current tab is more reliable than trying
    // to hydrate an about:blank popup with PDF data after an async request.
    window.location.href = dataUrl;
    return;
  }

  const targetWindow = previewWindow ?? window.open('', '_blank');

  if (!targetWindow) {
    throw new Error('Não foi possível abrir a pré-visualização do PDF.');
  }

  const objectUrl = window.URL.createObjectURL(blob);
  targetWindow.location.href = objectUrl;
  targetWindow.addEventListener(
    'beforeunload',
    () => {
      window.URL.revokeObjectURL(objectUrl);
    },
    { once: true }
  );
}
