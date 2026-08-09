import assert from "node:assert/strict";
import test from "node:test";
import { validateReadinessEntry } from "../../../src/v5/domain/training/readiness.js";
import type { ReadinessEntry } from "../../../src/v5/domain/training/readiness.js";

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
