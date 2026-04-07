import type { LucideIcon } from "lucide-react";
import {
  ThumbsUp,
  Heart,
  Laugh,
  Flame,
  PartyPopper,
  Sparkles,
  CheckCircle2,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Stored in API / DB (replaces emoji characters for new reactions). */
export type ChatReactionId =
  | "like"
  | "love"
  | "laugh"
  | "fire"
  | "celebrate"
  | "hype"
  | "agree"
  | "star";

export const CHAT_REACTION_OPTIONS: ReadonlyArray<{
  id: ChatReactionId;
  label: string;
  Icon: LucideIcon;
  /** Accent for picker “gem” button */
  accent: string;
  /** Icon on gradient */
  iconClass: string;
  /** Inline bubble (other) */
  tintOther: string;
  /** Inline bubble (your own, blue) */
  tintOwn: string;
}> = [
  {
    id: "like",
    label: "Like",
    Icon: ThumbsUp,
    accent: "from-sky-400 to-blue-600",
    iconClass: "text-white",
    tintOther: "text-sky-600",
    tintOwn: "text-sky-100",
  },
  {
    id: "love",
    label: "Love",
    Icon: Heart,
    accent: "from-rose-400 to-pink-600",
    iconClass: "text-white",
    tintOther: "text-rose-600",
    tintOwn: "text-rose-100",
  },
  {
    id: "laugh",
    label: "Laugh",
    Icon: Laugh,
    accent: "from-amber-400 to-orange-500",
    iconClass: "text-white",
    tintOther: "text-amber-600",
    tintOwn: "text-amber-100",
  },
  {
    id: "fire",
    label: "Fire",
    Icon: Flame,
    accent: "from-orange-500 to-red-600",
    iconClass: "text-white",
    tintOther: "text-orange-600",
    tintOwn: "text-orange-100",
  },
  {
    id: "celebrate",
    label: "Celebrate",
    Icon: PartyPopper,
    accent: "from-violet-400 to-purple-600",
    iconClass: "text-white",
    tintOther: "text-violet-600",
    tintOwn: "text-violet-100",
  },
  {
    id: "hype",
    label: "Hype",
    Icon: Sparkles,
    accent: "from-cyan-400 to-indigo-600",
    iconClass: "text-white",
    tintOther: "text-cyan-600",
    tintOwn: "text-cyan-100",
  },
  {
    id: "agree",
    label: "Agree",
    Icon: CheckCircle2,
    accent: "from-emerald-400 to-teal-600",
    iconClass: "text-white",
    tintOther: "text-emerald-600",
    tintOwn: "text-emerald-100",
  },
  {
    id: "star",
    label: "Top",
    Icon: BadgeCheck,
    accent: "from-amber-500 to-yellow-600",
    iconClass: "text-white",
    tintOther: "text-amber-700",
    tintOwn: "text-amber-100",
  },
];

/** Unicode shown in 3D picker and aligned with legacy stored emoji. */
export const CHAT_REACTION_EMOJI: Record<ChatReactionId, string> = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  fire: "🔥",
  celebrate: "🎉",
  hype: "👏",
  agree: "✅",
  star: "💯",
};

/** Legacy rows still store emoji — map to the same icon + canonical id for new toggles. */
const LEGACY_EMOJI_TO_ID: Record<string, ChatReactionId> = {
  [CHAT_REACTION_EMOJI.like]: "like",
  [CHAT_REACTION_EMOJI.love]: "love",
  [CHAT_REACTION_EMOJI.laugh]: "laugh",
  [CHAT_REACTION_EMOJI.fire]: "fire",
  [CHAT_REACTION_EMOJI.celebrate]: "celebrate",
  [CHAT_REACTION_EMOJI.hype]: "hype",
  [CHAT_REACTION_EMOJI.agree]: "agree",
  [CHAT_REACTION_EMOJI.star]: "star",
};

const idSet = new Set(CHAT_REACTION_OPTIONS.map((o) => o.id));

export function canonicalReactionId(stored: string): ChatReactionId {
  const t = stored.trim();
  if (LEGACY_EMOJI_TO_ID[t]) return LEGACY_EMOJI_TO_ID[t];
  if (idSet.has(t as ChatReactionId)) return t as ChatReactionId;
  return "like";
}

export function reactionOptionById(id: ChatReactionId) {
  return CHAT_REACTION_OPTIONS.find((o) => o.id === id) ?? CHAT_REACTION_OPTIONS[0];
}

export function ChatReactionGlyph({
  storedKey,
  isOwnMessage,
  className,
  size = 15,
}: {
  storedKey: string;
  isOwnMessage: boolean;
  className?: string;
  size?: number;
}) {
  const id = canonicalReactionId(storedKey);
  const { Icon, tintOwn, tintOther } = reactionOptionById(id);
  return (
    <Icon
      className={cn(
        "shrink-0 drop-shadow-sm",
        isOwnMessage ? tintOwn : tintOther,
        className,
      )}
      strokeWidth={2.25}
      width={size}
      height={size}
      aria-hidden
    />
  );
}
