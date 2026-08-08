import type { EntityId } from "../../domain/common/types.js";
import type { ProgramPatch } from "../../domain/coaching/recommendation.js";
import type { ProgramVersion } from "../../domain/programming/program.js";
import { createPatchedProgramVersion, markRecommendation, type CoachDecisionDependencies } from "./accept-recommendation.js";

export async function modifyRecommendation(
  id: EntityId,
  patch: ProgramPatch,
  deps: CoachDecisionDependencies,
): Promise<ProgramVersion | null> {
  const recommendation = await deps.recommendations.get(id);
  if (!recommendation || recommendation.decisionState !== "pending") return null;
  const active = await deps.programs.getActive();
  if (!active) return null;

  const now = deps.clock.now();
  const next = createPatchedProgramVersion(active, patch, recommendation.id, deps.ids.next("program"), now);
  await deps.programs.applyCoachDecision(next, markRecommendation(recommendation, "modified", now));
  return next;
}
