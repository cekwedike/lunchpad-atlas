/**
 * Chat @mention capture: one or more word segments (e.g. @Kira Jotham or @KiraJotham).
 * Must stay aligned with backend extractMentionCandidates in chat.service.ts.
 */
export const CHAT_MENTION_CAPTURE =
  "([A-Za-z][A-Za-z0-9_.-]*(?:\\s+[A-Za-z][A-Za-z0-9_.-]*)*)";

export function getChatMentionRegex(): RegExp {
  return new RegExp(`@${CHAT_MENTION_CAPTURE}`, "g");
}
