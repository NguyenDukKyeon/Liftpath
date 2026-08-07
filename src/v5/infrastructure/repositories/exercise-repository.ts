import type { ExerciseRepository } from "../../application/ports/exercise-repository.js";
import type { V5Database } from "../../application/ports/storage.js";
import type { EntityId } from "../../domain/common/types.js";
import type { ExerciseDefinition } from "../../domain/exercises/exercise.js";
import { createIndexedDbDatabase } from "./indexed-db-database.js";

export function createExerciseRepository(
  database: V5Database = createIndexedDbDatabase(),
): ExerciseRepository {
  return {
    async save(exercise: ExerciseDefinition): Promise<void> {
      await database.transaction(["metadata"], "readwrite", async (tx) => {
        await tx.put("metadata", exercise);
      });
    },
    async get(id: EntityId): Promise<ExerciseDefinition | undefined> {
      return database.transaction(["metadata"], "readonly", (tx) =>
        tx.get<ExerciseDefinition>("metadata", id),
      );
    },
  };
}
