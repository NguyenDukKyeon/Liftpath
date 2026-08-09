import assert from "node:assert/strict";
import test from "node:test";
import type { ReadinessRepository } from "../../../src/v5/application/ports/readiness-repository.js";
import { buildCoachContextWithPersistedReadiness } from "../../../src/v5/application/coaching/evaluate-coach.js";
import { buildProgramPreview } from "../../../src/v5/application/programs/build-program-preview.js";
import { proposeGoalTransition } from "../../../src/v5/application/programs/propose-goal-transition.js";
import { recordReadiness } from "../../../src/v5/application/workouts/record-readiness.js";
import { LiftPathV5Error } from "../../../src/v5/domain/common/errors.js";
import type { CoachContext } from "../../../src/v5/domain/coaching/context.js";
import { CATALOG_SEED } from "../../../src/v5/domain/exercises/catalog-seed.js";
import type { TrainingProfileDraft } from "../../../src/v5/domain/programming/profile.js";
import type { ProgramVersion } from "../../../src/v5/domain/programming/program.js";
import type { ReadinessEntry } from "../../../src/v5/domain/training/readiness.js";
import type { TrainingSession } from "../../../src/v5/domain/training/session.js";

class MemoryReadiness implements ReadinessRepository {
  entries: ReadinessEntry[] = [];
  requestedLimit: number | undefined;

  async save(entry: ReadinessEntry): Promise<void> {
    this.entries.push(entry);
  }

  async getForSession(sessionId: string): Promise<ReadinessEntry | undefined> {
    return this.entries.find((entry) => entry.sessionId === sessionId);
  }

  async listRecent(limit: number): Promise<ReadinessEntry[]> {
    this.requestedLimit = limit;
    return this.entries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
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

const broadEquipment = ["barbell", "rack", "bench", "dumbbell", "cable", "machine"];

function profile(overrides: Partial<TrainingProfileDraft> = {}): TrainingProfileDraft {
  return {
    level: "beginner",
    goal: "hypertrophy",
    primarySpecialization: "v_shape",
    constraints: {
      daysPerWeek: 4,
      sessionMinutes: 60,
      equipment: [...broadEquipment],
      dislikedExerciseIds: [],
      restrictedMovementPatterns: [],
    },
    ...overrides,
  };
}

function currentProgram(): ProgramVersion {
  const preview = buildProgramPreview(profile(), "upper-lower-4", { catalog: [...CATALOG_SEED] });
  return {
    id: "program-current",
    versionNumber: 3,
    name: preview.name,
    sessions: preview.sessions,
    profileId: "profile-1",
    policyVersion: preview.policyVersion,
    structureId: preview.structureId,
    rationale: preview.rationale,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    revision: 1,
  };
}

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

test("CoachContext readiness is rebuilt from a bounded persisted window", async () => {
  const readiness = new MemoryReadiness();
  readiness.entries = Array.from({ length: 8 }, (_, index) => ({
    id: `readiness-${index + 1}`,
    sessionId: `session-${index + 1}`,
    energy: index === 7 ? "low" as const : "normal" as const,
    soreness: index === 7 ? "high" as const : "none" as const,
    painExerciseIds: index === 7 ? ["bench-press"] : [],
    createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T01:00:00.000Z`,
    updatedAt: `2026-08-${String(index + 1).padStart(2, "0")}T01:00:00.000Z`,
    revision: 1,
  }));

  const base: Omit<CoachContext, "readiness"> = {
    now: "2026-08-09T00:15:00.000Z",
    profile: {
      id: "profile-1",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      revision: 1,
      ...profile({ constraints: { ...profile().constraints, equipment: ["cable"] } }),
    },
    activeProgram: {
      id: "program-1",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      revision: 1,
      versionNumber: 1,
      name: "V-Shape",
      profileId: "profile-1",
      policyVersion: "1.0.0",
      structureId: "upper-lower-4",
      sessions: [],
    },
    recentSets: [],
    recentSessions: [],
    programmingPolicyVersion: "1.0.0",
    coachPolicyVersion: "1.0.0",
  };

  const context = await buildCoachContextWithPersistedReadiness(base, readiness);

  assert.equal(readiness.requestedLimit, 6);
  assert.equal(context.readiness.length, 6);
  assert.equal(context.readiness[0]?.sessionId, "session-8");
  assert.deepEqual(context.readiness[0]?.painExerciseIds, ["bench-press"]);
  assert.equal(context.readiness.some((entry) => entry.sessionId === "session-1"), false);
});

test("V-Shape to Arms transition keeps the selected structure and retains compatible movements", () => {
  const current = currentProgram();
  const proposal = proposeGoalTransition(current, profile(), profile({ primarySpecialization: "arms" }), {
    catalog: [...CATALOG_SEED],
  });

  assert.equal(proposal.program.structureId, current.structureId);
  assert.equal(proposal.program.sessions.length, current.sessions.length);
  assert.deepEqual(proposal.program.sessions.map((session) => session.key), current.sessions.map((session) => session.key));
  assert.ok(proposal.retainedExerciseIds.length > 0);
});

test("V-Shape hypertrophy to Strength plus Bench retains shared suitable movements", () => {
  const current = currentProgram();
  const proposal = proposeGoalTransition(
    current,
    profile(),
    profile({ goal: "strength", primarySpecialization: "bench" }),
    { catalog: [...CATALOG_SEED] },
  );

  assert.equal(proposal.program.structureId, "upper-lower-4");
  assert.ok(proposal.retainedExerciseIds.includes("barbell-bench-press"));
  assert.equal(proposal.source, "user_goal_change");
});

test("goal transition rejects a requested structure change", () => {
  assert.throws(
    () => proposeGoalTransition(
      currentProgram(),
      profile(),
      profile({ primarySpecialization: "arms" }),
      { catalog: [...CATALOG_SEED], requestedStructureId: "torso-lower-4" },
    ),
    /structure/i,
  );
});
