import test from "node:test";
import assert from "node:assert/strict";
import { defaultState } from "../src/domain/storage.js";
import {
  createDraftAfterReadiness,
  prepareWorkoutFromState,
} from "../src/features/workout/preparation.js";

const readyState = () => {
  const state = defaultState();
  state.profile = {
    ...state.profile,
    onboardingComplete: true,
    equipment: ["barbell", "dumbbell", "machine", "cable", "bodyweight", "rack", "bench"],
  };
  return state;
};

test("preparing a workout is transient and does not create a draft", () => {
  const state = readyState();
  const prepared = prepareWorkoutFromState(state, "FB-A");
  assert.ok(prepared);
  assert.equal(state.draft, null);
  assert.ok(prepared.prescriptions.length > 0);
  assert.equal(prepared.workout.id, "FB-A");
});

test("confirming readiness creates a draft with an adjustment snapshot", () => {
  const state = readyState();
  const prepared = prepareWorkoutFromState(state, "FB-A");
  assert.ok(prepared);
  const result = createDraftAfterReadiness(state, prepared, {
    energy: "normal",
    soreness: "manageable",
    pain: null,
    availableMinutes: 60,
  });
  assert.ok(result.draft);
  assert.equal(result.draft.readiness.input.availableMinutes, 60);
  assert.equal(result.draft.exercises.length, result.adjustment.value.prescriptions.length);
});

test("sharp pain blocks draft creation and preserves the prepared workout", () => {
  const state = readyState();
  const prepared = prepareWorkoutFromState(state, "FB-A");
  assert.ok(prepared);
  const result = createDraftAfterReadiness(state, prepared, {
    energy: "normal",
    soreness: "none",
    pain: {
      bodyArea: "knee",
      severity: "sharp",
      affectedPatterns: ["squat", "lunge"],
    },
    availableMinutes: 60,
  });
  assert.equal(result.draft, null);
  assert.equal(result.adjustment.value.allowStart, false);
  assert.equal(result.adjustment.reasonCode, "pain-blocks-movement");
  assert.ok(prepared.prescriptions.length > 0);
});
