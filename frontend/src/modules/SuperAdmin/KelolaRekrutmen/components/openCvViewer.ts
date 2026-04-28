function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function openCvViewer(cvUrl: string, applicantName?: string | null): void {
  const normalizedName = (applicantName ?? '').trim();
  const tabTitle = normalizedName ? `CV_${normalizedName}` : 'CV_Pelamar';
  const popup = window.open('', '_blank');

  if (!popup) {
    window.open(cvUrl, '_blank');
    return;
  }

  // Set temporary title before navigating to the browser's native PDF viewer.
  popup.document.title = escapeHtml(tabTitle);
  popup.location.replace(cvUrl);
}