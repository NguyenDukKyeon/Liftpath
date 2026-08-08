import assert from "node:assert/strict";
import test from "node:test";
import type { RecommendationRepository } from "../../../src/v5/application/ports/recommendation-repository.js";
import { evaluateCoachForCompletedSession } from "../../../src/v5/application/coaching/evaluate-coach.js";
import { completeWorkout } from "../../../src/v5/application/workouts/complete-workout.js";
import { LiftPathV5Error } from "../../../src/v5/domain/common/errors.js";
import type { CoachContext } from "../../../src/v5/domain/coaching/context.js";
import type { CoachRecommendation } from "../../../src/v5/domain/coaching/recommendation.js";
import type { SessionRepository } from "../../../src/v5/application/ports/session-repository.js";
import type { TrainingSession } from "../../../src/v5/domain/training/session.js";

const stamp = "2026-08-08T03:00:00.000Z";

function makeContext(exposureCount = 3): CoachContext {
  const sets = Array.from({ length: exposureCount }, (_, index) => ({
    id: `set-${index + 1}`,
    sessionId: `session-${index + 1}`,
    exerciseId: "lat-pulldown",
    setOrdinal: 1,
    loadKg: 50,
    reps: 12,
    rir: 2,
    completedAt: `2026-08-0${index + 5}T01:00:00.000Z`,
    createdAt: stamp,
    updatedAt: stamp,
    revision: 1,
  }));
  const sessions = Array.from({ length: exposureCount }, (_, index) => ({
    id: `session-${index + 1}`,
    programVersionId: "program-1",
    sessionKey: "upper-a",
    status: "completed" as const,
    startedAt: `2026-08-0${index + 5}T00:30:00.000Z`,
    completedAt: `2026-08-0${index + 5}T01:00:00.000Z`,
    createdAt: stamp,
    updatedAt: stamp,
    revision: 1,
  }));
  return {
    now: stamp,
    profile: {
      id: "profile-1", createdAt: stamp, updatedAt: stamp, revision: 1,
      level: "beginner", goal: "hypertrophy", primarySpecialization: "v_shape",
      constraints: { daysPerWeek: 4, sessionMinutes: 60, equipment: ["cable"], dislikedExerciseIds: [], restrictedMovementPatterns: [] },
    },
    activeProgram: {
      id: "program-1", createdAt: stamp, updatedAt: stamp, revision: 1, versionNumber: 1,
      name: "V-Shape 4 Day", profileId: "profile-1", policyVersion: "1.0.0", structureId: "upper-lower-4",
      sessions: [{ key: "upper-a", name: "Upper A", exercises: [{ exerciseId: "lat-pulldown", order: 1, sets: [{ ordinal: 1, minReps: 8, maxReps: 12, targetRir: 2, prescribedLoadKg: 50 }] }] }],
    },
    recentSets: sets,
    recentSessions: sessions,
    readiness: sessions.map((session) => ({ sessionId: session.id, energy: "normal" as const, soreness: "none" as const, painExerciseIds: [] })),
    programmingPolicyVersion: "1.0.0",
    coachPolicyVersion: "1.0.0",
  };
}

class MemoryRecommendations implements RecommendationRepository {
  records: CoachRecommendation[] = [];
  async save(recommendation: CoachRecommendation): Promise<void> { this.records.push(recommendation); }
  async get(id: string): Promise<CoachRecommendation | undefined> { return this.records.find((record) => record.id === id); }
  async listPending(): Promise<CoachRecommendation[]> { return this.records.filter((record) => record.decisionState === "pending"); }
  async update(recommendation: CoachRecommendation): Promise<void> {
    const index = this.records.findIndex((record) => record.id === recommendation.id);
    if (index >= 0) this.records[index] = recommendation;
  }
}

test("persists recommendation as pending with evidence and policy provenance", async () => {
  const recommendations = new MemoryRecommendations();
  const result = await evaluateCoachForCompletedSession(makeContext(3), {
    recommendations,
    ids: { next: () => "recommendation-1" },
    clock: { now: () => stamp },
  });

  assert.equal(recommendations.records.length, 1);
  assert.equal(result?.decisionState, "pending");
  assert.deepEqual(result?.evidenceIds, ["set-1", "set-2", "set-3"]);
  assert.equal(result?.coachPolicyVersion, "1.0.0");
  assert.equal(result?.programmingPolicyVersion, "1.0.0");
});

test("persists no recommendation when Coach has insufficient evidence", async () => {
  const recommendations = new MemoryRecommendations();
  const result = await evaluateCoachForCompletedSession(makeContext(1), {
    recommendations,
    ids: { next: () => "recommendation-1" },
    clock: { now: () => stamp },
  });
  assert.equal(result, null);
  assert.equal(recommendations.records.length, 0);
});

class CompletingSessions implements SessionRepository {
  committed = false;
  session: TrainingSession = {
    id: "session-1", programVersionId: "program-1", sessionKey: "upper-a", status: "active",
    startedAt: stamp, createdAt: stamp, updatedAt: stamp, revision: 1,
  };
  async create(): Promise<void> {}
  async createIfNoActive(): Promise<void> {}
  async update(): Promise<void> {}
  async completeIfActive(_id: string, completedAt: string): Promise<TrainingSession> {
    this.committed = true;
    this.session = { ...this.session, status: "completed", completedAt, updatedAt: completedAt, revision: 2 };
    return this.session;
  }
  async get(): Promise<TrainingSession | undefined> { return this.session; }
  async getActive(): Promise<TrainingSession | undefined> { return undefined; }
  async listSets(): Promise<[]> { return []; }
  async saveSet(): Promise<void> {}
}

test("completed workout remains committed when post-commit Coach evaluation fails", async () => {
  const sessions = new CompletingSessions();
  let surfaced: unknown;
  const completed = await completeWorkout(
    "session-1",
    sessions,
    { now: () => stamp },
    {
      evaluateCoachAfterCommit: async () => { throw new LiftPathV5Error("COACH_POLICY_ERROR", "coach failed"); },
      onCoachFailure: (error) => { surfaced = error; },
    },
  );

  assert.equal(sessions.committed, true);
  assert.equal(completed.status, "completed");
  assert.ok(surfaced instanceof LiftPathV5Error);
  assert.equal((surfaced as LiftPathV5Error).code, "COACH_POLICY_ERROR");
});
