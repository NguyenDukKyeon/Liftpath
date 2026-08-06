import test from "node:test";
import assert from "node:assert/strict";
import { BUILT_IN_EXERCISES } from "../src/data.js";
import { buildPlanRecommendation } from "../src/features/coach/plan-builder.js";
import {
  findSafeSubstitution,
  isExerciseAvailable,
} from "../src/features/coach/substitution.js";
import type { PlanBuilderInput } from "../src/features/coach/contracts.js";

const beginnerThreeDayInput: PlanBuilderInput = {
  goal: "hypertrophy",
  experience: "beginner",
  availableDays: 3,
  sessionMinutes: 60,
  equipment: ["dumbbell", "bodyweight", "bench"],
  preferredDays: [1, 3, 5],
  priorityMuscles: [],
  restrictions: [],
  effortLanguage: "simple-rir",
  movementFamiliarity: "new",
  consistencyWeeks: 0,
  recentLoads: {},
};

const intermediateFourDayInput: PlanBuilderInput = {
  ...beginnerThreeDayInput,
  experience: "intermediate",
  availableDays: 4,
  sessionMinutes: 75,
  equipment: ["barbell", "dumbbell", "machine", "cable", "bodyweight", "rack", "bench"],
  preferredDays: [1, 2, 4, 5],
  movementFamiliarity: "comfortable",
  consistencyWeeks: 24,
};

test("never falls back to the unavailable original exercise", () => {
  const result = findSafeSubstitution({
    exerciseId: "back_squat",
    equipment: ["dumbbell", "bodyweight"],
    restrictions: [],
    exercises: BUILT_IN_EXERCISES,
  });
  assert.notEqual(result.value?.id, "back_squat");
  assert.ok(result.value);
  assert.equal(isExerciseAvailable(result.value, ["dumbbell", "bodyweight"]), true);
  assert.equal(result.reasonCode, "equipment-safe-substitution");
});

test("returns no exercise when the movement pattern is restricted", () => {
  const result = findSafeSubstitution({
    exerciseId: "db_ohp",
    equipment: ["dumbbell", "bench"],
    restrictions: [{
      id: "r1",
      bodyArea: "shoulder",
      affectedPatterns: ["vertical-push"],
      note: "pain",
    }],
    exercises: BUILT_IN_EXERCISES,
  });
  assert.equal(result.value, null);
  assert.equal(result.reasonCode, "pain-blocks-movement");
});

test("beginner with three days receives an equipment-safe Full Body plan", () => {
  const result = buildPlanRecommendation(beginnerThreeDayInput);
  assert.equal(result.value.program.id, "full-body-3");
  assert.equal(result.value.program.daysPerWeek, 3);
  assert.equal(result.value.invalidPrescriptionIds.length, 0);
  assert.ok(result.evidence.some((item) => item.key === "availableDays" && item.value === 3));
  for (const workout of result.value.program.workouts) {
    for (const prescription of workout.exercises) {
      assert.equal(
        isExerciseAvailable(BUILT_IN_EXERCISES[prescription.exerciseId], beginnerThreeDayInput.equipment),
        true,
        prescription.exerciseId,
      );
    }
  }
});

test("four-day intermediate receives Upper Lower when session duration is sufficient", () => {
  const result = buildPlanRecommendation(intermediateFourDayInput);
  assert.equal(result.value.program.id, "upper-lower-4");
  assert.equal(result.value.invalidPrescriptionIds.length, 0);
});

test("a no-rack profile never receives a rack-only prescription", () => {
  const result = buildPlanRecommendation({
    ...beginnerThreeDayInput,
    equipment: ["dumbbell", "bodyweight", "bench", "cable"],
  });
  for (const workout of result.value.program.workouts) {
    for (const prescription of workout.exercises) {
      assert.equal(
        isExerciseAvailable(BUILT_IN_EXERCISES[prescription.exerciseId], ["dumbbell", "bodyweight", "bench", "cable"]),
        true,
        prescription.exerciseId,
      );
    }
  }
});
