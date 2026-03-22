export function openWhatsAppLink(url: string) {
  if (typeof window === 'undefined') return;

  const userAgent = window.navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);

  if (isMobile) {
    window.location.href = url;
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
