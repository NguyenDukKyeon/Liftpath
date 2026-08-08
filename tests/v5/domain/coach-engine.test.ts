import assert from "node:assert/strict";
import test from "node:test";
import { classifyPerformanceTrend } from "../../../src/v5/domain/coaching/performance-trend.js";
import { classifyEffortStatus } from "../../../src/v5/domain/coaching/effort-status.js";
import { classifyAdherence } from "../../../src/v5/domain/coaching/adherence.js";
import { COACH_POLICY_VERSION, confidenceForExposureCount } from "../../../src/v5/domain/coaching/confidence.js";
import { diagnoseObservation } from "../../../src/v5/domain/coaching/diagnosis.js";

const improvingExposures = [
  { id: "set-1", loadKg: 50, reps: 8, rir: 2 },
  { id: "set-2", loadKg: 50, reps: 9, rir: 2 },
  { id: "set-3", loadKg: 50, reps: 10, rir: 2 },
] as const;

test("performance trend requires at least three comparable exposures", () => {
  assert.equal(classifyPerformanceTrend(improvingExposures.slice(0, 2)), "insufficient_data");
  assert.equal(confidenceForExposureCount(2), "low");
});

test("performance trend detects improving reps or load at similar effort", () => {
  assert.equal(classifyPerformanceTrend(improvingExposures), "improving");
});

test("effort status marks repeated RIR 0-1 against target RIR 2 as too hard", () => {
  assert.equal(classifyEffortStatus([{ id: "set-1", rir: 1 }, { id: "set-2", rir: 0 }, { id: "set-3", rir: 1 }], 2), "too_hard");
});

test("adherence distinguishes repeatedly missing prescribed work from plateau evidence", () => {
  assert.equal(classifyAdherence([
    { sessionId: "session-1", prescribedSets: 12, completedSets: 8 },
    { sessionId: "session-2", prescribedSets: 12, completedSets: 7 },
    { sessionId: "session-3", prescribedSets: 12, completedSets: 0 },
  ]), "partial");
  assert.equal(classifyAdherence([
    { sessionId: "session-1", prescribedSets: 12, completedSets: 0 },
    { sessionId: "session-2", prescribedSets: 12, completedSets: 0 },
    { sessionId: "session-3", prescribedSets: 12, completedSets: 0 },
  ]), "missed");
});

test("Coach classifier policy is explicitly versioned", () => {
  assert.match(COACH_POLICY_VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(confidenceForExposureCount(3), "medium");
  assert.equal(confidenceForExposureCount(5), "high");
});

test("diagnosis priority puts pain safety before eligible progression", () => {
  assert.deepEqual(diagnoseObservation({
    painExerciseIds: ["lateral-raise"],
    adherence: "complete",
    effortByExercise: { "lateral-raise": "on_target" },
    performanceByExercise: { "lateral-raise": "improving" },
    fatigueExerciseIds: [],
    plateauExerciseIds: [],
  }), { kind: "pain_safety", exerciseId: "lateral-raise" });
});

test("diagnosis priority puts poor adherence before plateau", () => {
  assert.deepEqual(diagnoseObservation({
    painExerciseIds: [],
    adherence: "partial",
    missedSessionIds: ["session-2", "session-3"],
    effortByExercise: { row: "on_target" },
    performanceByExercise: { row: "stable" },
    fatigueExerciseIds: [],
    plateauExerciseIds: ["row"],
  }), { kind: "adherence_limited", sessionIds: ["session-2", "session-3"] });
});
