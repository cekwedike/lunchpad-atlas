export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

const MAX_HTML_CHARS = 120_000;

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeBasicEntities(input: string): string {
  // Keep intentionally small: enough for titles/descriptions.
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function pickMeta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=[\"']${prop}[\"'][^>]+content=[\"']([^\"']+)[\"'][^>]*>`,
    'i',
  );
  const m = html.match(re);
  return m?.[1] ? decodeBasicEntities(m[1]).trim() : null;
}

function pickTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m?.[1]) return null;
  const t = decodeBasicEntities(stripTags(m[1]));
  return t.length ? t.slice(0, 200) : null;
}

export function buildPreviewFromHtml(url: string, html: string): LinkPreview {
  html = html.slice(0, MAX_HTML_CHARS);

  const title =
    pickMeta(html, 'og:title') ||
    pickMeta(html, 'twitter:title') ||
    pickTitle(html);
  const description =
    pickMeta(html, 'og:description') ||
    pickMeta(html, 'description') ||
    pickMeta(html, 'twitter:description');
  const image =
    pickMeta(html, 'og:image') ||
    pickMeta(html, 'twitter:image') ||
    pickMeta(html, 'twitter:image:src');
  const siteName = pickMeta(html, 'og:site_name');

  return {
    url,
    title,
    description: description ? description.slice(0, 300) : null,
    image,
    siteName,
  };
}

