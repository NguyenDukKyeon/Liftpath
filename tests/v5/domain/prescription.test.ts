import assert from "node:assert/strict";
import test from "node:test";
import { CATALOG_SEED } from "../../../src/v5/domain/exercises/catalog-seed.js";
import { validateExerciseCatalog } from "../../../src/v5/domain/exercises/catalog.js";
import { validateTrainingProfileDraft } from "../../../src/v5/domain/programming/profile.js";

const baseConstraints = {
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: ["cable", "dumbbell"],
  dislikedExerciseIds: [],
  restrictedMovementPatterns: [],
} as const;

test("allows one primary and at most one distinct secondary focus", () => {
  assert.doesNotThrow(() =>
    validateTrainingProfileDraft({
      level: "beginner",
      goal: "hypertrophy",
      primarySpecialization: "v_shape",
      secondaryFocus: "arms",
      constraints: baseConstraints,
    }),
  );

  assert.throws(() =>
    validateTrainingProfileDraft({
      level: "beginner",
      goal: "hypertrophy",
      primarySpecialization: "v_shape",
      secondaryFocus: "v_shape",
      constraints: baseConstraints,
    }),
  );
});

test("profile validation rejects unsupported constraints and incompatible specialization goals", () => {
  assert.throws(() =>
    validateTrainingProfileDraft({
      level: "beginner",
      goal: "hypertrophy",
      primarySpecialization: "bench",
      constraints: { ...baseConstraints, equipment: [] },
    }),
  );

  assert.throws(() =>
    validateTrainingProfileDraft({
      level: "beginner",
      goal: "hypertrophy",
      primarySpecialization: "v_shape",
      constraints: { ...baseConstraints, daysPerWeek: 1 as never },
    }),
  );
});

test("catalog seed has unique stable metadata and valid rep ranges", () => {
  assert.doesNotThrow(() => validateExerciseCatalog(CATALOG_SEED));
  assert.equal(new Set(CATALOG_SEED.map((exercise) => exercise.id)).size, CATALOG_SEED.length);
  assert.ok(CATALOG_SEED.every((exercise) => exercise.name.trim().length > 0));
  assert.ok(CATALOG_SEED.every((exercise) => exercise.movementPattern.trim().length > 0));
  assert.ok(CATALOG_SEED.every((exercise) => exercise.primaryMuscles.length > 0));
  assert.ok(CATALOG_SEED.every((exercise) => exercise.substitutionGroup.trim().length > 0));
  assert.ok(
    CATALOG_SEED.every((exercise) =>
      exercise.supportedRepRanges.every(
        (range) => Number.isInteger(range.min) && Number.isInteger(range.max) && range.min > 0 && range.min <= range.max,
      ),
    ),
  );
});
