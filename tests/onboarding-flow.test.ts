import test from "node:test";
import assert from "node:assert/strict";
import { defaultProfile } from "../src/domain/storage.js";
import {
  createOnboardingState,
  onboardingReducer,
} from "../src/features/onboarding/onboarding-state.js";

test("guided onboarding follows the four-step order", () => {
  let state = createOnboardingState(defaultProfile());
  assert.equal(state.step, "goal");
  state = onboardingReducer(state, { type: "next" });
  assert.equal(state.step, "schedule");
  state = onboardingReducer(state, { type: "next" });
  assert.equal(state.step, "experience");
  state = onboardingReducer(state, { type: "next" });
  assert.equal(state.step, "preview");
  state = onboardingReducer(state, { type: "back" });
  assert.equal(state.step, "experience");
});

test("schedule step cannot advance without equipment and preferred days", () => {
  let state = createOnboardingState({
    ...defaultProfile(),
    equipment: [],
    preferredDays: [],
  });
  state = onboardingReducer(state, { type: "next" });
  assert.equal(state.step, "schedule");
  state = onboardingReducer(state, { type: "next" });
  assert.equal(state.step, "schedule");
  assert.equal(state.validationMessage, "Chọn thiết bị và lịch tập trước khi tiếp tục.");

  state = onboardingReducer(state, {
    type: "patch-profile",
    patch: { equipment: ["bodyweight"], preferredDays: [1, 3, 5] },
  });
  state = onboardingReducer(state, { type: "next" });
  assert.equal(state.step, "experience");
});

test("changing available days trims invalid preferred day overflow", () => {
  let state = createOnboardingState({
    ...defaultProfile(),
    availableDays: 4,
    preferredDays: [1, 2, 4, 5],
  });
  state = onboardingReducer(state, {
    type: "patch-profile",
    patch: { availableDays: 3 },
  });
  assert.deepEqual(state.profile.preferredDays, [1, 2, 4]);
});
