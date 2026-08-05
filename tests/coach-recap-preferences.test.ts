import test from "node:test";
import assert from "node:assert/strict";
import { applyPreferenceSignal } from "../src/features/coach/preferences.js";

test("one temporary substitution does not create a permanent preference", () => {
  const next = applyPreferenceSignal([], {
    type: "temporary-substitution",
    exerciseId: "db_bench",
  });
  assert.deepEqual(next, []);
});

test("always-use substitution stores an explicit preferred signal", () => {
  const next = applyPreferenceSignal([], {
    type: "always-use",
    exerciseId: "machine_press",
    reason: "comfort",
    at: "2026-08-05T14:00:00.000Z",
  });
  assert.equal(next[0].status, "preferred");
  assert.equal(next[0].reason, "comfort");
});

test("avoid signal replaces an earlier preference for the same exercise", () => {
  const next = applyPreferenceSignal([
    {
      exerciseId: "barbell_bench",
      status: "preferred",
      reason: "comfort",
      updatedAt: "2026-08-01T10:00:00.000Z",
    },
  ], {
    type: "avoid",
    exerciseId: "barbell_bench",
    reason: "pain",
    at: "2026-08-05T14:00:00.000Z",
  });
  assert.equal(next.length, 1);
  assert.equal(next[0].status, "avoid");
  assert.equal(next[0].reason, "pain");
});

test("neutral signal removes the stored preference", () => {
  const next = applyPreferenceSignal([
    {
      exerciseId: "db_bench",
      status: "avoid",
      reason: "availability",
      updatedAt: "2026-08-01T10:00:00.000Z",
    },
  ], {
    type: "neutral",
    exerciseId: "db_bench",
    at: "2026-08-05T14:00:00.000Z",
  });
  assert.deepEqual(next, []);
});
