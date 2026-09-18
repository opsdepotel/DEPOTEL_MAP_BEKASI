export const DEFAULT_ACTIVITY_PHOTO =
  'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&auto=format&fit=crop&q=80';

/**
 * Format photo URLs, especially converting Google Drive links to direct image CDN links.
 */
export function formatPhotoUrl(url?: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_ACTIVITY_PHOTO;
  }

  const clean = url.trim();

  // Handle Google Drive links
  const driveMatch =
    clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    clean.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    clean.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }

  return clean;
}
