import { LiftPathV5Error } from "../common/errors.js";
import type { EntityId } from "../common/types.js";

export const SUPPORTED_TRAINING_DAYS = [2, 3, 4, 5, 6] as const;
export type TrainingDaysPerWeek = (typeof SUPPORTED_TRAINING_DAYS)[number];

export const SUPPORTED_SESSION_MINUTES = [30, 45, 60, 75, 90] as const;
export type SessionMinutes = (typeof SUPPORTED_SESSION_MINUTES)[number];

export interface TrainingConstraints {
  daysPerWeek: TrainingDaysPerWeek;
  sessionMinutes: SessionMinutes;
  equipment: readonly string[];
  dislikedExerciseIds: readonly EntityId[];
  restrictedMovementPatterns: readonly string[];
}

function assertSupportedNumber<T extends number>(name: string, value: number, supported: readonly T[]): asserts value is T {
  if (!supported.includes(value as T)) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${name} is unsupported`);
  }
}

function assertUniqueNonEmptyStrings(name: string, values: readonly string[], allowEmpty: boolean): void {
  if (!allowEmpty && values.length === 0) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${name} must not be empty`);
  }
  const normalized = values.map((value) => value.trim());
  if (normalized.some((value) => value.length === 0)) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${name} contains an empty value`);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${name} contains duplicate values`);
  }
}

export function validateTrainingConstraints(constraints: TrainingConstraints): void {
  assertSupportedNumber("daysPerWeek", constraints.daysPerWeek, SUPPORTED_TRAINING_DAYS);
  assertSupportedNumber("sessionMinutes", constraints.sessionMinutes, SUPPORTED_SESSION_MINUTES);
  assertUniqueNonEmptyStrings("equipment", constraints.equipment, false);
  assertUniqueNonEmptyStrings("dislikedExerciseIds", constraints.dislikedExerciseIds, true);
  assertUniqueNonEmptyStrings("restrictedMovementPatterns", constraints.restrictedMovementPatterns, true);
}
