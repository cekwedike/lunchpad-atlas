/**
 * Media Utilities for extracting and handling video/article URLs
 * Supports YouTube, Vimeo, and direct embeds
 */

export interface VideoInfo {
  provider: 'youtube' | 'vimeo' | 'unknown';
  id: string;
  url: string;
}

export interface ArticleInfo {
  provider: string;
  url: string;
  canEmbed: boolean;
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
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
 * Extract Vimeo video ID from URL
 */
export function extractVimeoId(url: string): string | null {
  const pattern = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Get video information from URL
 */
export function getVideoInfo(url: string): VideoInfo | null {
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      provider: 'youtube',
      id: youtubeId,
      url: `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&fs=1&controls=1`,
    };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      provider: 'vimeo',
      id: vimeoId,
      url: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  return null;
}

/**
 * Determine if article can be embedded based on domain
 */
export function canEmbedArticle(url: string): boolean {
  const embeddablePatterns = [
    /medium\.com/,
    /linkedin\.com/,
    /dev\.to/,
    /hashnode\.com/,
  ];

  return embeddablePatterns.some((pattern) => pattern.test(url));
}

/**
 * Get article information
 */
export function getArticleInfo(url: string): ArticleInfo {
  const urlObj = new URL(url);
  const provider = urlObj.hostname.replace('www.', '');

  return {
    provider,
    url,
    canEmbed: canEmbedArticle(url),
  };
}

/**
 * Search for YouTube video by title
 * Returns a search URL that can be used to find the video
 */
export function getYouTubeSearchUrl(title: string): string {
  const encoded = encodeURIComponent(title);
  return `https://www.youtube.com/results?search_query=${encoded}`;
}

/**
 * Get TED Talk URL from title
 */
export function getTEDTalkUrl(title: string): string {
  const encoded = encodeURIComponent(title);
  return `https://www.ted.com/search?q=${encoded}`;
}
