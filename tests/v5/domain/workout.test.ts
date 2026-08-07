import assert from "node:assert/strict";
import test from "node:test";
import { validateCompletedSetInput } from "../../../src/v5/domain/training/set.js";
import { buildTrainingSession } from "../../../src/v5/domain/training/session.js";
import type { ProgramVersion } from "../../../src/v5/domain/programming/program.js";

const clock = { now: () => "2026-08-07T08:00:00.000Z" } as const;
const ids = { next: (prefix: string) => `${prefix}-1` } as const;

function program(): ProgramVersion {
  return {
    id: "program-1",
    versionNumber: 1,
    name: "Workout Core",
    sessions: [
      {
        key: "upper-a",
        name: "Upper A",
        exercises: [],
      },
    ],
    createdAt: "2026-08-07T07:00:00.000Z",
    updatedAt: "2026-08-07T07:00:00.000Z",
    revision: 1,
  };
}

test("completed-set validation rejects impossible values", () => {
  assert.throws(() => validateCompletedSetInput({ loadKg: -2.5, reps: 10, rir: 2 }));
  assert.throws(() => validateCompletedSetInput({ loadKg: 20, reps: -1, rir: 2 }));
  assert.throws(() => validateCompletedSetInput({ loadKg: 20, reps: 10, rir: 11 }));
  assert.throws(() => validateCompletedSetInput({ loadKg: 20, reps: 10.5, rir: 2 }));
  assert.doesNotThrow(() => validateCompletedSetInput({ loadKg: 20, reps: 10, rir: 2 }));
});

test("training-session builder rejects an unknown session key", () => {
  assert.throws(() => buildTrainingSession(program(), "missing", ids, clock));

  const session = buildTrainingSession(program(), "upper-a", ids, clock);
  assert.equal(session.programVersionId, "program-1");
  assert.equal(session.sessionKey, "upper-a");
  assert.equal(session.status, "active");
  assert.equal(session.id, "session-1");
});
