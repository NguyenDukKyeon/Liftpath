import assert from "node:assert/strict";
import test from "node:test";
import { composeMusclePriorities } from "../../../src/v5/domain/programming/policies/specialization-policy.js";

test("V-Shape prioritizes lats and side delts without dropping balanced lower-body work", () => {
  const priorities = composeMusclePriorities({
    level: "beginner",
    goal: "hypertrophy",
    primarySpecialization: "v_shape",
    constraints: {
      daysPerWeek: 4,
      sessionMinutes: 60,
      equipment: ["cable", "dumbbell", "machine"],
      dislikedExerciseIds: [],
      restrictedMovementPatterns: [],
    },
  });

  assert.equal(priorities.lats, "specialization");
  assert.equal(priorities.side_delts, "specialization");
  assert.ok(["high", "specialization"].includes(priorities.rear_delts));
  assert.ok(["high", "specialization"].includes(priorities.upper_back));
  assert.ok(priorities.quads !== undefined);
  assert.ok(priorities.hamstrings !== undefined);
  assert.ok(priorities.glutes !== undefined);
  assert.notEqual(priorities.quads, "maintenance");
});

test("secondary focus is capped below primary specialization priority", () => {
  const priorities = composeMusclePriorities({
    level: "beginner",
    goal: "hypertrophy",
    primarySpecialization: "v_shape",
    secondaryFocus: "arms",
    constraints: {
      daysPerWeek: 4,
      sessionMinutes: 60,
      equipment: ["cable", "dumbbell"],
      dislikedExerciseIds: [],
      restrictedMovementPatterns: [],
    },
  });

  assert.equal(priorities.lats, "specialization");
  assert.equal(priorities.side_delts, "specialization");
  assert.equal(priorities.biceps, "high");
  assert.equal(priorities.triceps, "high");
});
