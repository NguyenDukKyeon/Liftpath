import assert from "node:assert/strict";
import test from "node:test";
import { evaluateVShapeAdaptation } from "../../../src/v5/domain/coaching/vshape-adaptation.js";

const base = {
  exerciseId: "lateral-raise",
  muscle: "side_delts" as const,
  performanceTrend: "stable" as const,
  effortStatus: "on_target" as const,
  adherence: "complete" as const,
  recoveryNormal: true,
  workloadSets: 10,
  workloadMax: 14,
  exposureCount: 5,
  targetRir: 2,
};

test("VSHAPE-001 improving priorities with normal recovery hold prescription", () => {
  assert.deepEqual(evaluateVShapeAdaptation({
    ...base,
    muscle: "lats",
    exerciseId: "lat-pulldown",
    performanceTrend: "improving",
  }), {
    action: "NO_CHANGE",
    diagnosis: { kind: "no_change" },
    priority: null,
    patch: null,
    confidence: "high",
    reasonCode: "VSHAPE_IMPROVING_HOLD",
  });
});

test("VSHAPE-002 stable side delts with adherence and target effort review specialization", () => {
  assert.deepEqual(evaluateVShapeAdaptation({
    ...base,
    beforeExerciseId: "row",
  }), {
    action: "REVIEW_SPECIALIZATION",
    diagnosis: { kind: "specialization_review", muscle: "side_delts" },
    priority: "specialization",
    patch: { kind: "move_exercise", exerciseId: "lateral-raise", beforeExerciseId: "row" },
    confidence: "high",
    reasonCode: "VSHAPE_PRIORITY_STABLE_REORDER",
  });
});

test("VSHAPE-003 stable lats with repeated RIR zero reduce effort first", () => {
  assert.deepEqual(evaluateVShapeAdaptation({
    ...base,
    muscle: "lats",
    exerciseId: "lat-pulldown",
    effortStatus: "too_hard",
  }), {
    action: "REDUCE_EFFORT_FIRST",
    diagnosis: { kind: "effort_too_high", exerciseId: "lat-pulldown" },
    priority: "fatigue",
    patch: { kind: "set_target_rir", exerciseId: "lat-pulldown", targetRir: 2 },
    confidence: "high",
    reasonCode: "VSHAPE_EFFORT_TOO_HIGH",
  });
});

test("VSHAPE-004 shoulder movement pain stops normal progression", () => {
  assert.deepEqual(evaluateVShapeAdaptation({
    ...base,
    pain: true,
  }), {
    action: "STOP_NORMAL_PROGRESSION",
    diagnosis: { kind: "pain_safety", exerciseId: "lateral-raise" },
    priority: "safety",
    patch: null,
    confidence: "high",
    reasonCode: "VSHAPE_PAIN_BLOCKS_PROGRESSION",
  });
});

test("VSHAPE-005 workload at policy high bound does not add volume", () => {
  assert.deepEqual(evaluateVShapeAdaptation({
    ...base,
    workloadSets: 14,
    workloadMax: 14,
  }), {
    action: "DO_NOT_ADD_VOLUME",
    diagnosis: { kind: "specialization_review", muscle: "side_delts" },
    priority: "specialization",
    patch: null,
    confidence: "high",
    reasonCode: "VSHAPE_HIGH_BOUND_HOLD_VOLUME",
  });
});

test("VSHAPE-002 is deterministic across repeated evaluation", () => {
  const input = { ...base, beforeExerciseId: "row" };
  const first = evaluateVShapeAdaptation(input);
  for (let index = 0; index < 100; index += 1) {
    assert.deepEqual(evaluateVShapeAdaptation(input), first);
  }
});
