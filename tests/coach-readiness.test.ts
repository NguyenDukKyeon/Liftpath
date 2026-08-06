import test from "node:test";
import assert from "node:assert/strict";
import { BUILT_IN_PROGRAMS } from "../src/data.js";
import { adjustWorkoutForReadiness } from "../src/features/coach/readiness.js";

const fullWorkout = BUILT_IN_PROGRAMS["full-body-3"].workouts[0].exercises;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

test("short sessions remove optional accessories before primary work", () => {
  const result = adjustWorkoutForReadiness(fullWorkout, {
    energy: "normal",
    soreness: "manageable",
    pain: null,
    availableMinutes: 35,
  });
  assert.ok(result.value.removedPrescriptionIds.length > 0);
  assert.ok(result.value.prescriptions.some((item) => item.priority === "primary"));
  assert.ok(result.value.removedPrescriptionIds.every((id) => {
    const original = fullWorkout.find((item) => item.id === id);
    return original?.optional || original?.priority === "accessory";
  }));
  assert.equal(result.reasonCode, "session-time-shortened");
});

test("low energy reduces working sets but preserves primary patterns", () => {
  const result = adjustWorkoutForReadiness(fullWorkout, {
    energy: "low",
    soreness: "manageable",
    pain: null,
    availableMinutes: 60,
  });
  assert.ok(result.value.prescriptions.filter((item) => item.priority === "primary").length >= 2);
  assert.ok(result.value.changedSetCounts.length > 0);
  assert.ok(result.value.appliedReasonCodes.includes("readiness-low-energy"));
});

test("sharp knee pain blocks squat and lunge patterns", () => {
  const result = adjustWorkoutForReadiness(fullWorkout, {
    energy: "normal",
    soreness: "none",
    pain: {
      bodyArea: "knee",
      severity: "sharp",
      affectedPatterns: ["squat", "lunge"],
    },
    availableMinutes: 60,
  });
  assert.ok(result.value.blockedPrescriptionIds.length > 0);
  assert.equal(result.value.allowStart, false);
  assert.equal(result.reasonCode, "pain-blocks-movement");
  assert.doesNotMatch(result.explanation.toLowerCase(), /chẩn đoán/);
});

test("high soreness reduces effort without mutating the base workout", () => {
  const before = deepClone(fullWorkout);
  const result = adjustWorkoutForReadiness(fullWorkout, {
    energy: "normal",
    soreness: "high",
    pain: null,
    availableMinutes: 75,
  });
  assert.ok(result.value.changedEffortPrescriptionIds.length > 0);
  assert.deepEqual(fullWorkout, before);
});
