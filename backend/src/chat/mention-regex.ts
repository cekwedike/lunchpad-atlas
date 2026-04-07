/**
 * Must stay aligned with frontend/src/lib/chat-mentions.ts
 */

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MENTION_SECOND_WORD_BLOCKLIST = new Set(
  [
    'as',
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'by',
    'with',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'if',
    'so',
    'that',
    'this',
    'from',
    'has',
    'have',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'can',
    'not',
    'no',
    'all',
    'both',
    'each',
    'every',
    'more',
    'some',
    'such',
    'than',
    'too',
    'very',
    'just',
    'also',
    'what',
    'when',
    'where',
    'who',
    'which',
    'why',
    'how',
    'favour',
    'favor',
    'me',
    'we',
    'you',
    'he',
    'she',
    'it',
    'they',
    'them',
    'their',
    'there',
    'here',
    'my',
    'your',
    'his',
    'her',
    'its',
    'our',
  ].map((w) => w.toLowerCase()),
);

const STOP_PATTERN = [...MENTION_SECOND_WORD_BLOCKLIST]
  .map(escapeRegex)
  .join('|');

/** Captures @name (single or two-word names); second word not allowed if blocklisted. */
export const CHAT_MENTION_CAPTURE = `([A-Za-z][A-Za-z0-9_.-]*(?:\\s+(?!${STOP_PATTERN}\\b)([A-Za-z][A-Za-z0-9_.-]*))?)`;

export function getChatMentionRegExp(): RegExp {
  return new RegExp(`@${CHAT_MENTION_CAPTURE}`, 'gi');
}
