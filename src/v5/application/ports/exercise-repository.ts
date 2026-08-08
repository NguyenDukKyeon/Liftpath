import type { EntityId } from "../../domain/common/types.js";
import type { ExerciseMetadata } from "../../domain/exercises/exercise.js";

export interface ExerciseRepository {
  save(exercise: ExerciseMetadata): Promise<void>;
  get(id: EntityId): Promise<ExerciseMetadata | undefined>;
}
