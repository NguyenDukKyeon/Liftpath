import test from "node:test";
import assert from "node:assert/strict";
import { migrateV3ToV4 } from "../src/domain/migrations/v3-to-v4.js";
import { expectedV3Totals, v3StateFixture } from "./fixtures/v3-state.js";

test("migrates a complete v3 state without losing user-visible records", () => {
  const { state, warnings } = migrateV3ToV4(v3StateFixture);
  assert.equal(state.schemaVersion, 4);
  assert.equal(state.history.length, expectedV3Totals.historySessions);
  assert.equal(
    state.history[0].exercises[0].sets.filter((set) => set.done).length,
    expectedV3Totals.completedSets,
  );
  assert.equal(state.bodyStats.length, expectedV3Totals.bodyStats);
  assert.equal(state.customExercises.length, expectedV3Totals.customExercises);
  assert.equal(state.customPrograms.length, expectedV3Totals.customPrograms);
  assert.ok(state.draft);
  assert.equal(warnings.length, 0);
});

test("migrates legacy set values into tracking-aware logged sets", () => {
  const { state } = migrateV3ToV4(v3StateFixture);
  const entry = state.history[0].exercises[0];
  assert.equal(entry.loggedSets?.[0].trackingMode, "weight-reps");
  assert.deepEqual(entry.loggedSets?.[0].effort, { mode: "rpe", value: 7 });
});

test("converts custom program exercise IDs into prescriptions", () => {
  const { state } = migrateV3ToV4(v3StateFixture);
  const exercise = state.customPrograms[0].workouts[0].exercises[0];
  assert.equal(typeof exercise, "object");
  assert.equal(exercise.exerciseId, "custom:landmine-press");
  assert.equal(exercise.order, 0);
});

test("isolates malformed records and emits warnings", () => {
  const malformed = { ...v3StateFixture, history: [null, v3StateFixture.history[0]] };
  const { state, warnings } = migrateV3ToV4(malformed);
  assert.equal(state.history.length, 1);
  assert.ok(warnings.some((warning) => warning.code === "history-record-dropped"));
});
