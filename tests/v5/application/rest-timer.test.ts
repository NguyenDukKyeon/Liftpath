import assert from "node:assert/strict";
import test from "node:test";
import {
  remainingRestSeconds,
  type RestTimerState,
} from "../../../src/v5/application/workouts/rest-timer.js";

const state: RestTimerState = {
  startedAt: "2026-08-10T10:00:00.000Z",
  targetSeconds: 120,
};

test("rest timer derives remaining time from committed set timestamp", () => {
  assert.equal(remainingRestSeconds(state, "2026-08-10T10:00:30.000Z"), 90);
});

test("rest timer clamps elapsed rests to zero", () => {
  assert.equal(remainingRestSeconds(state, "2026-08-10T10:02:10.000Z"), 0);
  assert.ok(remainingRestSeconds(state, "2026-08-10T10:05:00.000Z") >= 0);
});

test("rest timer rejects invalid target durations and timestamps", () => {
  assert.throws(() => remainingRestSeconds({ ...state, targetSeconds: 0 }, "2026-08-10T10:00:30.000Z"));
  assert.throws(() => remainingRestSeconds(state, "not-a-date"));
});
