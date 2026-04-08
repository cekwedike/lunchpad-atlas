export type LinkPart =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string };

const URL_RE =
  /\bhttps?:\/\/[^\s<>()]+\b/gi;

export function linkifyText(input: string): LinkPart[] {
  if (!input) return [{ kind: 'text', text: '' }];

  const out: LinkPart[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_RE);

  while ((m = re.exec(input)) !== null) {
    const start = m.index;
    const raw = m[0];
    const end = start + raw.length;

    if (start > lastIndex) {
      out.push({ kind: 'text', text: input.slice(lastIndex, start) });
    }

    // Trim trailing punctuation that commonly follows URLs in sentences.
    const trimmed = raw.replace(/[)\].,!?;:]+$/g, '');
    const trailing = raw.slice(trimmed.length);

    out.push({ kind: 'link', text: trimmed, href: trimmed });
    if (trailing) out.push({ kind: 'text', text: trailing });

    lastIndex = end;
  }

  if (lastIndex < input.length) {
    out.push({ kind: 'text', text: input.slice(lastIndex) });
  }

  return out.length ? out : [{ kind: 'text', text: input }];
}

export function firstUrl(input: string): string | null {
  const m = input.match(URL_RE);
  if (!m?.[0]) return null;
  // Prefer https previews; still linkify http but preview https-only server-side.
  return m[0];
}

