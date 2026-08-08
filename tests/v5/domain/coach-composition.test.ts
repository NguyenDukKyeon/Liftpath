import assert from "node:assert/strict";
import test from "node:test";
import type { CoachContext } from "../../../src/v5/domain/coaching/context.js";
import { evaluateCoach } from "../../../src/v5/domain/coaching/coach-engine.js";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

const stamp = "2026-08-08T01:00:00.000Z";

const context: CoachContext = {
  now: "2026-08-08T02:00:00.000Z",
  profile: {
    id: "profile-1",
    createdAt: stamp,
    updatedAt: stamp,
    revision: 1,
    level: "beginner",
    goal: "hypertrophy",
    primarySpecialization: "v_shape",
    constraints: {
      daysPerWeek: 4,
      sessionMinutes: 60,
      equipment: ["cable"],
      dislikedExerciseIds: [],
      restrictedMovementPatterns: [],
    },
  },
  activeProgram: {
    id: "program-1",
    createdAt: stamp,
    updatedAt: stamp,
    revision: 1,
    versionNumber: 1,
    name: "V-Shape 4 Day",
    profileId: "profile-1",
    policyVersion: "1.0.0",
    structureId: "upper-lower-4",
    sessions: [{
      key: "upper-a",
      name: "Upper A",
      exercises: [{
        exerciseId: "lat-pulldown",
        order: 1,
        sets: [{ ordinal: 1, minReps: 8, maxReps: 12, targetRir: 2, prescribedLoadKg: 50 }],
      }],
    }],
  },
  recentSets: [
    { id: "set-1", sessionId: "session-1", exerciseId: "lat-pulldown", setOrdinal: 1, loadKg: 50, reps: 12, rir: 2, completedAt: "2026-08-05T01:00:00.000Z", createdAt: stamp, updatedAt: stamp, revision: 1 },
    { id: "set-2", sessionId: "session-2", exerciseId: "lat-pulldown", setOrdinal: 1, loadKg: 50, reps: 12, rir: 2, completedAt: "2026-08-06T01:00:00.000Z", createdAt: stamp, updatedAt: stamp, revision: 1 },
    { id: "set-3", sessionId: "session-3", exerciseId: "lat-pulldown", setOrdinal: 1, loadKg: 50, reps: 12, rir: 2, completedAt: "2026-08-07T01:00:00.000Z", createdAt: stamp, updatedAt: stamp, revision: 1 },
  ],
  recentSessions: [
    { id: "session-1", programVersionId: "program-1", sessionKey: "upper-a", status: "completed", startedAt: "2026-08-05T00:30:00.000Z", completedAt: "2026-08-05T01:00:00.000Z", createdAt: stamp, updatedAt: stamp, revision: 1 },
    { id: "session-2", programVersionId: "program-1", sessionKey: "upper-a", status: "completed", startedAt: "2026-08-06T00:30:00.000Z", completedAt: "2026-08-06T01:00:00.000Z", createdAt: stamp, updatedAt: stamp, revision: 1 },
    { id: "session-3", programVersionId: "program-1", sessionKey: "upper-a", status: "completed", startedAt: "2026-08-07T00:30:00.000Z", completedAt: "2026-08-07T01:00:00.000Z", createdAt: stamp, updatedAt: stamp, revision: 1 },
  ],
  readiness: [
    { sessionId: "session-1", energy: "normal", soreness: "none", painExerciseIds: [] },
    { sessionId: "session-2", energy: "normal", soreness: "none", painExerciseIds: [] },
    { sessionId: "session-3", energy: "normal", soreness: "none", painExerciseIds: [] },
  ],
  programmingPolicyVersion: "1.0.0",
  coachPolicyVersion: "1.0.0",
};

test("Coach Engine is deterministic, pure, and emits one bounded progression recommendation", () => {
  const frozen = deepFreeze(structuredClone(context));
  const before = JSON.stringify(frozen);

  const first = evaluateCoach(frozen);
  const second = evaluateCoach(frozen);

  assert.deepEqual(first, {
    type: "progression",
    priority: "progression",
    reasonCode: "PROGRESSION_TOP_RANGE",
    evidenceIds: ["set-1", "set-2", "set-3"],
    confidence: "medium",
    proposedPatch: { kind: "set_load", exerciseId: "lat-pulldown", loadKg: 52.5 },
    expectedIntent: "Progress load after repeated top-of-range work at target effort.",
    coachPolicyVersion: "1.0.0",
    programmingPolicyVersion: "1.0.0",
  });
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(frozen), before);
});
