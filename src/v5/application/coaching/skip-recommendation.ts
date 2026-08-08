import type { Clock } from "../ports/clock.js";
import type { RecommendationRepository } from "../ports/recommendation-repository.js";
import type { EntityId } from "../../domain/common/types.js";
import { markRecommendation } from "./accept-recommendation.js";

export interface SkipRecommendationDependencies {
  recommendations: RecommendationRepository;
  clock: Clock;
}

export async function skipRecommendation(
  id: EntityId,
  deps: SkipRecommendationDependencies,
): Promise<void> {
  const recommendation = await deps.recommendations.get(id);
  if (!recommendation || recommendation.decisionState !== "pending") return;
  await deps.recommendations.update(markRecommendation(recommendation, "skipped", deps.clock.now()));
}
