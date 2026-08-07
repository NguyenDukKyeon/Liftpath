import assert from "node:assert/strict";
import test from "node:test";
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
