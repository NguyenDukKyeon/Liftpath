import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { RecommendationRepository } from "../ports/recommendation-repository.js";
import type { CoachContext } from "../../domain/coaching/context.js";
import { evaluateCoach } from "../../domain/coaching/coach-engine.js";
import type { CoachRecommendation } from "../../domain/coaching/recommendation.js";

export interface EvaluateCoachDependencies {
  recommendations: RecommendationRepository;
  ids: IdGenerator;
  clock: Clock;
}

export async function evaluateCoachForCompletedSession(
  context: CoachContext,
  deps: EvaluateCoachDependencies,
): Promise<CoachRecommendation | null> {
  const draft = evaluateCoach(context);
  if (!draft) return null;

  const now = deps.clock.now();
  const recommendation: CoachRecommendation = {
    ...draft,
    id: deps.ids.next("recommendation"),
    createdAt: now,
    updatedAt: now,
    revision: 1,
    decisionState: "pending",
  };
  await deps.recommendations.save(recommendation);
  return recommendation;
}
