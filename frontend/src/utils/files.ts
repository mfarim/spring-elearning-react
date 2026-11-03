import api from '../api/client';

const FILES_PREFIX = '/api/v1/files/';

/** Files served by the backend require the Bearer token, so they cannot be opened with a plain link. */
export const isProtectedFileUrl = (url?: string | null): boolean => !!url && url.startsWith(FILES_PREFIX);

/** Only allow http(s) links or our own protected file endpoint (blocks javascript:, data:, etc.). */
export const isSafeExternalUrl = (url?: string | null): boolean => !!url && /^https?:\/\//i.test(url);

/**
 * Downloads a protected file with the user's token and opens it in a new tab
 * (inline for PDFs/images/media, otherwise the browser downloads it).
 */
export async function openProtectedFile(url: string): Promise<void> {
  // Open the tab synchronously (inside the click handler) so popup blockers allow it.
  const win = window.open('', '_blank');
  try {
    const response = await api.get<Blob>(url.replace(/^\/api\/v1/, ''), { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(response.data);
    if (win) {
      win.opener = null;
      win.location.href = blobUrl;
    } else {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = url.split('/').pop() || 'file';
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (err) {
    win?.close();
    alert('Berkas tidak dapat dibuka. Anda mungkin tidak memiliki akses atau berkas sudah dihapus.');
    throw err;
  }
}
