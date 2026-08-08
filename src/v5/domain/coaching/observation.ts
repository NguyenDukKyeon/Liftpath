import type { EntityId } from "../common/types.js";
import type { MuscleId } from "../exercises/exercise.js";
import type { AdherenceStatus } from "./adherence.js";
import type { EffortStatus } from "./effort-status.js";
import type { PerformanceTrend } from "./performance-trend.js";

export interface CoachObservation {
  painExerciseIds: EntityId[];
  constraintExerciseIds?: EntityId[];
  adherence: AdherenceStatus;
  missedSessionIds?: EntityId[];
  effortByExercise: Record<EntityId, EffortStatus>;
  performanceByExercise: Record<EntityId, PerformanceTrend>;
  fatigueExerciseIds: EntityId[];
  plateauExerciseIds: EntityId[];
  specializationReviewMuscle?: MuscleId;
}
