import type { EntityId } from "../../domain/common/types.js";
import type { CoachRecommendation } from "../../domain/coaching/recommendation.js";

export interface RecommendationRepository {
  save(recommendation: CoachRecommendation): Promise<void>;
  get(id: EntityId): Promise<CoachRecommendation | undefined>;
  listPending(): Promise<CoachRecommendation[]>;
  update(recommendation: CoachRecommendation): Promise<void>;
}
