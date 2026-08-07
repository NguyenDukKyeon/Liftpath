import type { EntityId } from "../../domain/common/types.js";
import type { ExerciseDefinition } from "../../domain/exercises/exercise.js";

export interface ExerciseRepository {
  save(exercise: ExerciseDefinition): Promise<void>;
  get(id: EntityId): Promise<ExerciseDefinition | undefined>;
}
