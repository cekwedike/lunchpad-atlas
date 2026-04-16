import { ResourceType } from "@/types/api";

/** Matches `ResourcesService.completeArticleOpen` — not the stored `pointValue` on articles. */
export const ARTICLE_COMPLETION_POINTS_CORE = 30;
export const ARTICLE_COMPLETION_POINTS_OPTIONAL = 15;

export function getArticleCompletionPoints(isCore: boolean | null | undefined): number {
  return isCore !== false
    ? ARTICLE_COMPLETION_POINTS_CORE
    : ARTICLE_COMPLETION_POINTS_OPTIONAL;
}

type CatalogResource = {
  type: string;
  isCore?: boolean | null;
  pointValue?: number | null;
  pointsValue?: number | null;
};

/**
 * Points shown in resource lists and headers. Articles always use fixed completion awards;
 * other types use the stored base `pointValue` (videos/exercises may earn bonuses on top).
 */
export function getResourceCatalogPoints(resource: CatalogResource): number {
  if (resource.type === ResourceType.ARTICLE) {
    return getArticleCompletionPoints(resource.isCore);
  }
  const raw = resource.pointValue ?? resource.pointsValue;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
