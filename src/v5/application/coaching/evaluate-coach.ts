import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { ReadinessRepository } from "../ports/readiness-repository.js";
import type { RecommendationRepository } from "../ports/recommendation-repository.js";
import {
  COACH_RECENT_READINESS_LIMIT,
  type CoachContext,
} from "../../domain/coaching/context.js";
import { evaluateCoach } from "../../domain/coaching/coach-engine.js";
import type { CoachRecommendation } from "../../domain/coaching/recommendation.js";

export type CoachContextWithoutReadiness = Omit<CoachContext, "readiness">;

export interface EvaluateCoachDependencies {
  recommendations: RecommendationRepository;
  readiness: Pick<ReadinessRepository, "listRecent">;
  ids: IdGenerator;
  clock: Clock;
}

export async function buildCoachContextWithPersistedReadiness(
  context: CoachContextWithoutReadiness,
  readiness: Pick<ReadinessRepository, "listRecent">,
): Promise<CoachContext> {
  const persisted = await readiness.listRecent(COACH_RECENT_READINESS_LIMIT);
  return {
    ...context,
    readiness: persisted.map((entry) => ({
      sessionId: entry.sessionId,
      energy: entry.energy,
      soreness: entry.soreness,
      painExerciseIds: [...entry.painExerciseIds],
    })),
  };
}

export async function evaluateCoachForCompletedSession(
  context: CoachContextWithoutReadiness,
  deps: EvaluateCoachDependencies,
): Promise<CoachRecommendation | null> {
  const persistedContext = await buildCoachContextWithPersistedReadiness(context, deps.readiness);
  const draft = evaluateCoach(persistedContext);
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
