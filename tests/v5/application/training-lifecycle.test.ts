import assert from "node:assert/strict";
import test from "node:test";
import type { ReadinessRepository } from "../../../src/v5/application/ports/readiness-repository.js";
import { recordReadiness } from "../../../src/v5/application/workouts/record-readiness.js";
import { LiftPathV5Error } from "../../../src/v5/domain/common/errors.js";
import type { ReadinessEntry } from "../../../src/v5/domain/training/readiness.js";
import type { TrainingSession } from "../../../src/v5/domain/training/session.js";

class MemoryReadiness implements ReadinessRepository {
  entries: ReadinessEntry[] = [];

  async save(entry: ReadinessEntry): Promise<void> {
    this.entries.push(entry);
  }

  async getForSession(sessionId: string): Promise<ReadinessEntry | undefined> {
    return this.entries.find((entry) => entry.sessionId === sessionId);
  }

  async listRecent(limit: number): Promise<ReadinessEntry[]> {
    return this.entries.slice(-limit).reverse();
  }
}

function session(status: TrainingSession["status"] = "active"): TrainingSession {
  return {
    id: "session-1",
    programVersionId: "program-1",
    sessionKey: "upper-a",
    status,
    startedAt: "2026-08-09T00:00:00.000Z",
    createdAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z",
    revision: 1,
  };
}

const clock = { now: () => "2026-08-09T00:15:00.000Z" } as const;
const ids = { next: (prefix: string) => `${prefix}-1` } as const;

test("record readiness persists only for an active known session", async () => {
  const readiness = new MemoryReadiness();
  const sessions = { get: async (id: string) => (id === "session-1" ? session() : undefined) };

  const entry = await recordReadiness(
    {
      sessionId: "session-1",
      energy: "low",
      soreness: "high",
      painExerciseIds: ["bench-press"],
    },
    { readiness, sessions, clock, ids },
  );

  assert.equal(entry.sessionId, "session-1");
  assert.equal(entry.id, "readiness-1");
  assert.deepEqual(readiness.entries, [entry]);
});

test("record readiness rejects an unknown session id", async () => {
  const readiness = new MemoryReadiness();
  const sessions = { get: async () => undefined };

  await assert.rejects(
    recordReadiness(
      { sessionId: "missing", energy: "normal", soreness: "none", painExerciseIds: [] },
      { readiness, sessions, clock, ids },
    ),
    (error: unknown) => error instanceof LiftPathV5Error && error.code === "VALIDATION_ERROR",
  );
  assert.equal(readiness.entries.length, 0);
});

test("record readiness rejects a completed session", async () => {
  const readiness = new MemoryReadiness();
  const sessions = { get: async () => session("completed") };

  await assert.rejects(
    recordReadiness(
      { sessionId: "session-1", energy: "high", soreness: "mild", painExerciseIds: [] },
      { readiness, sessions, clock, ids },
    ),
    /active session/i,
  );
  assert.equal(readiness.entries.length, 0);
});
