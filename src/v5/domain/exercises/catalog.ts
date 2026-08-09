import { LiftPathV5Error } from "../common/errors.js";
import type { ExerciseMetadata } from "./exercise.js";

function assertNonEmpty(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${name} must not be empty`);
  }
}

function validateExercise(exercise: ExerciseMetadata): void {
  assertNonEmpty("exercise.id", exercise.id);
  assertNonEmpty("exercise.name", exercise.name);
  assertNonEmpty("exercise.movementPattern", exercise.movementPattern);
  assertNonEmpty("exercise.substitutionGroup", exercise.substitutionGroup);

  if (exercise.primaryMuscles.length === 0) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${exercise.id} requires a primary muscle`);
  }
  if (exercise.supportedRepRanges.length === 0) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${exercise.id} requires a supported rep range`);
  }
  for (const range of exercise.supportedRepRanges) {
    if (!Number.isInteger(range.min) || !Number.isInteger(range.max) || range.min <= 0 || range.min > range.max) {
      throw new LiftPathV5Error("VALIDATION_ERROR", `${exercise.id} has an invalid rep range`);
    }
  }
  if (new Set(exercise.equipment).size !== exercise.equipment.length) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${exercise.id} has duplicate equipment requirements`);
  }
}

export function validateExerciseCatalog(catalog: readonly ExerciseMetadata[]): void {
  const ids = new Set<string>();
  for (const exercise of catalog) {
    validateExercise(exercise);
    if (ids.has(exercise.id)) {
      throw new LiftPathV5Error("VALIDATION_ERROR", `Duplicate exercise id: ${exercise.id}`);
    }
    ids.add(exercise.id);
  }
}

export function findExerciseById(
  catalog: readonly ExerciseMetadata[],
  exerciseId: string,
): ExerciseMetadata | undefined {
  return catalog.find((exercise) => exercise.id === exerciseId);
}
