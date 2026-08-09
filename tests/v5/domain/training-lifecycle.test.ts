import assert from "node:assert/strict";
import test from "node:test";
import { validateReadinessEntry } from "../../../src/v5/domain/training/readiness.js";
import type { ReadinessEntry } from "../../../src/v5/domain/training/readiness.js";
import {
  advanceTrainingBlockProgram,
  completeTrainingBlock,
  validateTrainingBlock,
  type TrainingBlock,
} from "../../../src/v5/domain/programming/training-block.js";
import { reviewCompletedBlock } from "../../../src/v5/domain/programming/block-review.js";

function readiness(overrides: Partial<ReadinessEntry> = {}): ReadinessEntry {
  return {
    id: "readiness-1",
    sessionId: "session-1",
    energy: "normal",
    soreness: "mild",
    painExerciseIds: [],
    createdAt: "2026-08-09T00:15:00.000Z",
    updatedAt: "2026-08-09T00:15:00.000Z",
    revision: 1,
    ...overrides,
  };
}

function block(overrides: Partial<TrainingBlock> = {}): TrainingBlock {
  return {
    id: "block-1",
    blockNumber: 1,
    status: "active",
    goal: "hypertrophy",
    primarySpecialization: "v_shape",
    structureId: "upper-lower-4",
    initialProgramVersionId: "program-1",
    currentProgramVersionId: "program-1",
    startedAt: "2026-08-09T00:00:00.000Z",
    createdAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z",
    revision: 1,
    ...overrides,
  };
}

test("readiness entry accepts bounded training-state inputs", () => {
  for (const energy of ["low", "normal", "high"] as const) {
    for (const soreness of ["none", "mild", "high"] as const) {
      assert.doesNotThrow(() => validateReadinessEntry(readiness({ energy, soreness })));
    }
  }

  assert.doesNotThrow(() =>
    validateReadinessEntry(readiness({ painExerciseIds: ["bench-press", "lateral-raise"] })),
  );
});

test("readiness entry rejects duplicate pain exercise ids", () => {
  assert.throws(
    () => validateReadinessEntry(readiness({ painExerciseIds: ["bench-press", "bench-press"] })),
    /duplicate pain exercise/i,
  );
});

test("training block keeps initial version immutable while current version advances", () => {
  const next = advanceTrainingBlockProgram(block(), "program-2", "2026-08-10T00:00:00.000Z");
  assert.equal(next.initialProgramVersionId, "program-1");
  assert.equal(next.currentProgramVersionId, "program-2");
  assert.equal(next.structureId, "upper-lower-4");
  assert.equal(next.revision, 2);
});

test("completed training block requires completedAt", () => {
  assert.throws(
    () => validateTrainingBlock(block({ status: "completed" })),
    /completedAt/i,
  );

  const completed = completeTrainingBlock(block(), "2026-08-12T00:00:00.000Z");
  assert.equal(completed.status, "completed");
  assert.equal(completed.completedAt, "2026-08-12T00:00:00.000Z");
  assert.equal(completed.initialProgramVersionId, "program-1");
});

test("block review continues when adherence is complete and specialization trends improve", () => {
  assert.equal(reviewCompletedBlock({
    block: completeTrainingBlock(block(), "2026-08-12T00:00:00.000Z"),
    adherence: "complete",
    specializationTrends: { lats: "improving", side_delts: "improving" },
    fatigueSignal: "normal",
    evidenceIds: ["set-1", "set-2", "set-3"],
  }).recommendation, "continue");
});

test("block review recommends deload before continuing only with broad regression and high fatigue", () => {
  assert.equal(reviewCompletedBlock({
    block: completeTrainingBlock(block(), "2026-08-12T00:00:00.000Z"),
    adherence: "complete",
    specializationTrends: { lats: "declining", side_delts: "declining", upper_back: "declining" },
    fatigueSignal: "high",
    evidenceIds: ["set-1", "set-2", "set-3", "set-4", "set-5"],
  }).recommendation, "deload_then_continue");
});

test("block review proposes next-block adjustment without activating anything", () => {
  const review = reviewCompletedBlock({
    block: completeTrainingBlock(block(), "2026-08-12T00:00:00.000Z"),
    adherence: "complete",
    specializationTrends: { lats: "improving", side_delts: "stable" },
    fatigueSignal: "normal",
    evidenceIds: ["set-1", "set-2", "set-3"],
  });
  assert.equal(review.recommendation, "adjust_next_block");
  assert.equal("programVersionId" in review, false);
});
