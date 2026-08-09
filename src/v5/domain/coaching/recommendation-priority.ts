export type RecommendationPriority = "safety" | "constraint" | "adherence" | "fatigue" | "progression" | "specialization";

export const RECOMMENDATION_PRIORITY_ORDER: readonly RecommendationPriority[] = [
  "safety",
  "constraint",
  "adherence",
  "fatigue",
  "progression",
  "specialization",
];
