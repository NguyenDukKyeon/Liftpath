import assert from "node:assert/strict";
import test from "node:test";
import type { SessionRepository } from "../../../src/v5/application/ports/session-repository.js";
import { startWorkout } from "../../../src/v5/application/workouts/start-workout.js";
import { resumeWorkout } from "../../../src/v5/application/workouts/resume-workout.js";
import { LiftPathV5Error } from "../../../src/v5/domain/common/errors.js";
import type { EntityId } from "../../../src/v5/domain/common/types.js";
import type { ProgramVersion } from "../../../src/v5/domain/programming/program.js";
import type { CompletedSet } from "../../../src/v5/domain/training/set.js";
import type { TrainingSession } from "../../../src/v5/domain/training/session.js";

class MemorySessions implements SessionRepository {
  active: TrainingSession | undefined;
  sets: CompletedSet[] = [];
  createCount = 0;

  async create(session: TrainingSession): Promise<void> {
    this.createCount += 1;
    this.active = session;
  }

  async get(id: EntityId): Promise<TrainingSession | undefined> {
    return this.active?.id === id ? this.active : undefined;
  }

  async getActive(): Promise<TrainingSession | undefined> {
    return this.active;
  }

  async listSets(sessionId: EntityId): Promise<CompletedSet[]> {
    return this.sets.filter((set) => set.sessionId === sessionId);
  }
}

const clock = { now: () => "2026-08-07T08:10:00.000Z" } as const;
const ids = { next: (prefix: string) => `${prefix}-new` } as const;

function program(): ProgramVersion {
  return {
    id: "program-1",
    versionNumber: 1,
    name: "Workout Core",
    sessions: [{ key: "upper-a", name: "Upper A", exercises: [] }],
    createdAt: "2026-08-07T08:00:00.000Z",
    updatedAt: "2026-08-07T08:00:00.000Z",
    revision: 1,
  };
}

function activeSession(): TrainingSession {
  return {
    id: "session-active",
    programVersionId: "program-1",
    sessionKey: "upper-a",
    status: "active",
    startedAt: "2026-08-07T08:00:00.000Z",
    createdAt: "2026-08-07T08:00:00.000Z",
    updatedAt: "2026-08-07T08:00:00.000Z",
    revision: 1,
  };
}

test("active workout prevents starting a second session", async () => {
  const sessions = new MemorySessions();
  sessions.active = activeSession();

  await assert.rejects(
    () => startWorkout({ programVersion: program(), sessionKey: "upper-a", sessions, ids, clock }),
    (error: unknown) =>
      error instanceof LiftPathV5Error && error.code === "VALIDATION_ERROR",
  );
  assert.equal(sessions.createCount, 0);
});

test("active workout resumes with already persisted sets", async () => {
  const sessions = new MemorySessions();
  sessions.active = activeSession();
  sessions.sets = [
    {
      id: "set-1",
      sessionId: "session-active",
      exerciseId: "exercise-1",
      setOrdinal: 1,
      loadKg: 20,
      reps: 10,
      rir: 2,
      completedAt: "2026-08-07T08:05:00.000Z",
      createdAt: "2026-08-07T08:05:00.000Z",
      updatedAt: "2026-08-07T08:05:00.000Z",
      revision: 1,
    },
  ];

  const resumed = await resumeWorkout(sessions);
  assert.equal(resumed?.session.id, "session-active");
  assert.deepEqual(resumed?.sets.map((set) => set.id), ["set-1"]);
});
