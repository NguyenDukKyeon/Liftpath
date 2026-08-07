import assert from "node:assert/strict";
import test from "node:test";
import type { SessionRepository } from "../../../src/v5/application/ports/session-repository.js";
import { completeSet } from "../../../src/v5/application/workouts/complete-set.js";
import { completeWorkout } from "../../../src/v5/application/workouts/complete-workout.js";
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
  updateCount = 0;
  rejectSetWrites = false;

  async create(session: TrainingSession): Promise<void> {
    this.createCount += 1;
    this.active = session;
  }

  async createIfNoActive(session: TrainingSession): Promise<void> {
    if (this.active?.status === "active") {
      throw new LiftPathV5Error("VALIDATION_ERROR", "active session already exists");
    }
    this.createCount += 1;
    this.active = session;
  }

  async update(session: TrainingSession): Promise<void> {
    this.updateCount += 1;
    this.active = session;
  }

  async get(id: EntityId): Promise<TrainingSession | undefined> {
    return this.active?.id === id ? this.active : undefined;
  }

  async getActive(): Promise<TrainingSession | undefined> {
    return this.active?.status === "active" ? this.active : undefined;
  }

  async listSets(sessionId: EntityId): Promise<CompletedSet[]> {
    return this.sets.filter((set) => set.sessionId === sessionId);
  }

  async saveSet(set: CompletedSet): Promise<void> {
    if (this.rejectSetWrites) throw new Error("storage unavailable");
    if (this.active?.id !== set.sessionId || this.active.status !== "active") {
      throw new LiftPathV5Error("VALIDATION_ERROR", "set requires active session");
    }
    if (
      this.sets.some(
        (candidate) =>
          candidate.sessionId === set.sessionId &&
          candidate.exerciseId === set.exerciseId &&
          candidate.setOrdinal === set.setOrdinal,
      )
    ) {
      throw new LiftPathV5Error("VALIDATION_ERROR", "logical set already committed");
    }
    this.sets.push(set);
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

test("concurrent workout starts commit exactly one active session", async () => {
  const sessions = new MemorySessions();
  let nextId = 0;
  const concurrentIds = { next: (prefix: string) => `${prefix}-${++nextId}` };

  const outcomes = await Promise.allSettled([
    startWorkout({ programVersion: program(), sessionKey: "upper-a", sessions, ids: concurrentIds, clock }),
    startWorkout({ programVersion: program(), sessionKey: "upper-a", sessions, ids: concurrentIds, clock }),
  ]);

  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.status === "rejected").length, 1);
  assert.equal(sessions.createCount, 1);
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

test("set completion rejects when persistence rejects", async () => {
  const sessions = new MemorySessions();
  sessions.active = activeSession();
  sessions.rejectSetWrites = true;

  await assert.rejects(() =>
    completeSet({
      input: {
        sessionId: "session-active",
        exerciseId: "exercise-1",
        setOrdinal: 1,
        loadKg: 20,
        reps: 10,
        rir: 2,
      },
      sessions,
      ids,
      clock,
    }),
  );
  assert.equal(sessions.sets.length, 0);
});

test("concurrent completion of one logical set commits exactly once", async () => {
  const sessions = new MemorySessions();
  sessions.active = activeSession();
  let nextId = 0;
  const concurrentIds = { next: (prefix: string) => `${prefix}-${++nextId}` };
  const request = {
    sessionId: "session-active",
    exerciseId: "exercise-1",
    setOrdinal: 1,
    loadKg: 20,
    reps: 10,
    rir: 2,
  } as const;

  const outcomes = await Promise.allSettled([
    completeSet({ input: request, sessions, ids: concurrentIds, clock }),
    completeSet({ input: request, sessions, ids: concurrentIds, clock }),
  ]);

  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.status === "rejected").length, 1);
  assert.equal(sessions.sets.length, 1);
});

test("set cannot commit after concurrent workout completion wins", async () => {
  const sessions = new MemorySessions();
  sessions.active = activeSession();

  const outcomes = await Promise.allSettled([
    completeWorkout("session-active", sessions, clock),
    completeSet({
      input: {
        sessionId: "session-active",
        exerciseId: "exercise-1",
        setOrdinal: 1,
        loadKg: 20,
        reps: 10,
        rir: 2,
      },
      sessions,
      ids,
      clock,
    }),
  ]);

  assert.equal(outcomes[0].status, "fulfilled");
  assert.equal(outcomes[1].status, "rejected");
  assert.equal(sessions.sets.length, 0);
  assert.equal(sessions.active?.status, "completed");
});

test("workout completion rejects a non-active session", async () => {
  const sessions = new MemorySessions();
  sessions.active = {
    ...activeSession(),
    status: "completed",
    completedAt: "2026-08-07T08:09:00.000Z",
  };

  await assert.rejects(
    () => completeWorkout("session-active", sessions, clock),
    (error: unknown) =>
      error instanceof LiftPathV5Error && error.code === "VALIDATION_ERROR",
  );
  assert.equal(sessions.updateCount, 0);
});

test("workout completion persists status and completedAt before returning", async () => {
  const sessions = new MemorySessions();
  sessions.active = activeSession();

  const completed = await completeWorkout("session-active", sessions, clock);

  assert.equal(completed.status, "completed");
  assert.equal(completed.completedAt, clock.now());
  assert.equal(completed.updatedAt, clock.now());
  assert.equal(completed.revision, 2);
  assert.equal(sessions.updateCount, 1);
  assert.equal(sessions.active?.status, "completed");
  assert.equal(await sessions.getActive(), undefined);
});
