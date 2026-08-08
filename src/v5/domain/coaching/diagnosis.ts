import type { EntityId } from "../common/types.js";
import type { MuscleId } from "../exercises/exercise.js";
import type { CoachObservation } from "./observation.js";
import { firstPainExercise } from "./pain-safety.js";

export type Diagnosis =
  | { kind: "pain_safety"; exerciseId: EntityId }
  | { kind: "constraint_limited"; exerciseId: EntityId }
  | { kind: "adherence_limited"; sessionIds: EntityId[] }
  | { kind: "effort_too_high"; exerciseId: EntityId }
  | { kind: "session_fatigue"; exerciseId: EntityId }
  | { kind: "progression_plateau"; exerciseId: EntityId }
  | { kind: "specialization_review"; muscle: MuscleId }
  | { kind: "no_change" };

function firstSorted(values: readonly EntityId[]): EntityId | undefined {
  return [...values].sort()[0];
}

export function diagnoseObservation(observation: CoachObservation): Diagnosis {
  const painExercise = firstPainExercise(observation.painExerciseIds);
  if (painExercise) return { kind: "pain_safety", exerciseId: painExercise };

  const constrained = firstSorted(observation.constraintExerciseIds ?? []);
  if (constrained) return { kind: "constraint_limited", exerciseId: constrained };

  if (observation.adherence !== "complete") {
    return { kind: "adherence_limited", sessionIds: [...(observation.missedSessionIds ?? [])].sort() };
  }

  const tooHard = Object.keys(observation.effortByExercise)
    .filter((exerciseId) => observation.effortByExercise[exerciseId] === "too_hard")
    .sort()[0];
  if (tooHard) return { kind: "effort_too_high", exerciseId: tooHard };

  const fatigued = firstSorted(observation.fatigueExerciseIds);
  if (fatigued) return { kind: "session_fatigue", exerciseId: fatigued };

  const plateau = firstSorted(observation.plateauExerciseIds);
  if (plateau) return { kind: "progression_plateau", exerciseId: plateau };

  if (observation.specializationReviewMuscle) {
    return { kind: "specialization_review", muscle: observation.specializationReviewMuscle };
  }

  return { kind: "no_change" };
}
