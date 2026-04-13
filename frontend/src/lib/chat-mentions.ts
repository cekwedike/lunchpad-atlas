/**
 * Mention tokens are single, contiguous words:
 * - "@everyone" stays only "@everyone"
 * - mention ends at first whitespace/punctuation
 */
export const CHAT_MENTION_CAPTURE = `([A-Za-z][A-Za-z0-9_.-]*)`;

export function getChatMentionRegex(): RegExp {
  return new RegExp(`@${CHAT_MENTION_CAPTURE}`, "gi");
}
