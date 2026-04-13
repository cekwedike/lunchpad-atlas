/**
 * Mention tokens are single, contiguous words:
 * - "@everyone" stays only "@everyone"
 * - mention ends at first whitespace/punctuation
 */
export const CHAT_MENTION_CAPTURE = `([A-Za-z][A-Za-z0-9_.-]*)`;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Optional `knownMentionTokens` enables exact full-name matches (e.g. "Chidiebere Ekwedike")
 * while still supporting generic single-token mentions.
 */
export function getChatMentionRegex(knownMentionTokens?: string[]): RegExp {
  if (knownMentionTokens && knownMentionTokens.length > 0) {
    const alternation = [...knownMentionTokens]
      .filter((token) => token.trim().length > 0)
      .sort((a, b) => b.length - a.length)
      .map((token) => escapeRegex(token.trim()))
      .join("|");
    return new RegExp(`@(${alternation}|[A-Za-z][A-Za-z0-9_.-]*)`, "gi");
  }
  return new RegExp(`@${CHAT_MENTION_CAPTURE}`, "gi");
}
