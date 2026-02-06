/**
 * Utility functions for handling video URLs and embedding
 */

/**
 * Extract YouTube video ID from various YouTube URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Remove query parameters after video ID if present
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/, // youtube.com/watch?v=ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/, // youtu.be/ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/, // youtube.com/embed/ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/, // youtube.com/v/ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Convert a YouTube URL to an embeddable iframe URL
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;

  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/**
 * Check if a URL is a YouTube video
 */
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

/**
 * Check if a URL is a Vimeo video
 */
export function isVimeoUrl(url: string): boolean {
  return /vimeo\.com/.test(url);
}

/**
 * Extract Vimeo video ID from URL
 */
export function getVimeoVideoId(url: string): string | null {
  if (!url) return null;

  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Convert a Vimeo URL to an embeddable iframe URL
 */
export function getVimeoEmbedUrl(url: string): string | null {
  const videoId = getVimeoVideoId(url);
  if (!videoId) return null;

  return `https://player.vimeo.com/video/${videoId}`;
}

/**
 * Get embeddable URL for any supported video platform
 */
export function getVideoEmbedUrl(url: string): string | null {
  if (isYouTubeUrl(url)) {
    return getYouTubeEmbedUrl(url);
  }
  
  if (isVimeoUrl(url)) {
    return getVimeoEmbedUrl(url);
  }

  // Return original URL if not a recognized platform
  return url;
}
