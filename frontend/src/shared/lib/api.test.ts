import { apiUrl, resolveAssetUrl } from './api';

describe('resolveAssetUrl', () => {
  it('returns null for empty values', () => {
    expect(resolveAssetUrl('')).toBeNull();
    expect(resolveAssetUrl(null)).toBeNull();
    expect(resolveAssetUrl(undefined)).toBeNull();
  });

  it('returns absolute URL unchanged', () => {
    const url = 'https://cdn.example.com/file.pdf';
    expect(resolveAssetUrl(url)).toBe(url);
  });

  it('normalizes storage-relative path', () => {
    const result = resolveAssetUrl('complaints/sample.pdf');
    expect(result).toContain('/storage/complaints/sample.pdf');
  });

  it('normalizes csrf endpoints under /api', () => {
    expect(apiUrl('/csrf')).toContain('/api/csrf');
    expect(apiUrl('/api/csrf')).toContain('/api/csrf');
  });
});
