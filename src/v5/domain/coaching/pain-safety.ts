import type { EntityId } from "../common/types.js";

export function firstPainExercise(painExerciseIds: readonly EntityId[]): EntityId | undefined {
  return [...painExerciseIds].sort()[0];
}
