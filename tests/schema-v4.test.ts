import test from "node:test";
import assert from "node:assert/strict";
import type { ExercisePrescription, LoggedSet } from "../src/types.js";

const prescription: ExercisePrescription = {
  id: "FB-A:db-bench",
  exerciseId: "db_bench",
  order: 0,
  setScheme: [{ kind: "working", targetReps: { min: 8, max: 12 } }],
  restSeconds: 120,
  targetEffort: { mode: "rir", value: 2 },
  progression: { type: "double-progression", incrementKg: 2 },
  optional: false,
  priority: "primary",
};

const logged: LoggedSet = {
  id: "set-1",
  kind: "working",
  trackingMode: "weight-reps",
  weightKg: 20,
  reps: 10,
  effort: null,
  done: true,
};

test("v4 prescription and logged-set contracts are constructible", () => {
  assert.equal(prescription.progression.type, "double-progression");
  assert.equal(logged.trackingMode, "weight-reps");
});
