import assert from "node:assert/strict";
import test from "node:test";
import { acceptRecommendation } from "../../../src/v5/application/coaching/accept-recommendation.js";
import { modifyRecommendation } from "../../../src/v5/application/coaching/modify-recommendation.js";
import { skipRecommendation } from "../../../src/v5/application/coaching/skip-recommendation.js";
import { LiftPathV5Error } from "../../../src/v5/domain/common/errors.js";
import type { CoachRecommendation, ProgramPatch } from "../../../src/v5/domain/coaching/recommendation.js";
import type { ProgramVersion } from "../../../src/v5/domain/programming/program.js";

const stamp = "2026-08-08T04:00:00.000Z";
const decisionStamp = "2026-08-08T04:30:00.000Z";

function program(): ProgramVersion {
  return {
    id: "program-1",
    createdAt: stamp,
    updatedAt: stamp,
    revision: 1,
    versionNumber: 1,
    name: "V-Shape 4 Day",
    profileId: "profile-1",
    policyVersion: "1.0.0",
    structureId: "upper-lower-4",
    sessions: [
      {
        key: "upper-a",
        name: "Upper A",
        exercises: [
          {
            exerciseId: "lat-pulldown",
            order: 1,
            sets: [{ ordinal: 1, minReps: 8, maxReps: 12, targetRir: 2, prescribedLoadKg: 50 }],
          },
          {
            exerciseId: "seated-cable-row",
            order: 2,
            sets: [{ ordinal: 1, minReps: 8, maxReps: 12, targetRir: 2, prescribedLoadKg: 45 }],
          },
        ],
      },
      { key: "lower-a", name: "Lower A", exercises: [] },
    ],
  };
}

function recommendation(patch: ProgramPatch = { kind: "set_load", exerciseId: "lat-pulldown", loadKg: 52.5 }): CoachRecommendation {
  return {
    id: "recommendation-1",
    createdAt: stamp,
    updatedAt: stamp,
    revision: 1,
    type: "progression",
    priority: "progression",
    reasonCode: "PROGRESSION_TOP_RANGE",
    evidenceIds: ["set-1", "set-2", "set-3"],
    confidence: "medium",
    proposedPatch: patch,
    expectedIntent: "Progress load after repeated top-of-range work at target effort.",
    decisionState: "pending",
    coachPolicyVersion: "1.0.0",
    programmingPolicyVersion: "1.0.0",
  };
}

class DecisionRecommendations {
  record = recommendation();
  async get(id: string): Promise<CoachRecommendation | undefined> {
    return id === this.record.id ? this.record : undefined;
  }
  async update(next: CoachRecommendation): Promise<void> { this.record = next; }
  async save(next: CoachRecommendation): Promise<void> { this.record = next; }
  async listPending(): Promise<CoachRecommendation[]> {
    return this.record.decisionState === "pending" ? [this.record] : [];
  }
}

class DecisionPrograms {
  active = program();
  versions = [this.active];
  atomicCalls = 0;
  failAtomic = false;

  async getActive(): Promise<ProgramVersion | undefined> { return this.active; }
  async applyCoachDecision(nextProgram: ProgramVersion, nextRecommendation: CoachRecommendation): Promise<void> {
    this.atomicCalls += 1;
    if (this.failAtomic) throw new Error("transaction aborted");
    this.versions.push(nextProgram);
    this.active = nextProgram;
    // The real adapter persists recommendation state in the same transaction.
    decisionRecommendations.record = nextRecommendation;
  }
}

let decisionRecommendations = new DecisionRecommendations();

function deps(programs: DecisionPrograms, recommendations: DecisionRecommendations) {
  decisionRecommendations = recommendations;
  return {
    programs,
    recommendations,
    ids: { next: () => "program-2" },
    clock: { now: () => decisionStamp },
  };
}

test("Accept creates one new ProgramVersion and accepted decision atomically", async () => {
  const programs = new DecisionPrograms();
  const recommendations = new DecisionRecommendations();

  const next = await acceptRecommendation("recommendation-1", deps(programs, recommendations));

  assert.equal(programs.atomicCalls, 1);
  assert.equal(programs.versions.length, 2);
  assert.equal(next?.versionNumber, 2);
  assert.equal(next?.sourceRecommendationId, "recommendation-1");
  assert.equal(next?.structureId, "upper-lower-4");
  assert.deepEqual(next?.sessions.map((session) => session.key), ["upper-a", "lower-a"]);
  assert.equal(next?.sessions[0]?.exercises[0]?.sets[0]?.prescribedLoadKg, 52.5);
  assert.equal(recommendations.record.decisionState, "accepted");
  assert.equal(programs.versions[0]?.id, "program-1");
});

test("Accept rollback leaves active program and recommendation unchanged when atomic write fails", async () => {
  const programs = new DecisionPrograms();
  programs.failAtomic = true;
  const recommendations = new DecisionRecommendations();

  await assert.rejects(() => acceptRecommendation("recommendation-1", deps(programs, recommendations)));

  assert.equal(programs.atomicCalls, 1);
  assert.equal(programs.active.id, "program-1");
  assert.equal(programs.versions.length, 1);
  assert.equal(recommendations.record.decisionState, "pending");
});

test("Modify creates a new version from the user patch and preserves structure", async () => {
  const programs = new DecisionPrograms();
  const recommendations = new DecisionRecommendations();

  const next = await modifyRecommendation(
    "recommendation-1",
    { kind: "set_target_rir", exerciseId: "lat-pulldown", targetRir: 3 },
    deps(programs, recommendations),
  );

  assert.equal(programs.atomicCalls, 1);
  assert.equal(next?.versionNumber, 2);
  assert.equal(next?.sourceRecommendationId, "recommendation-1");
  assert.equal(next?.sessions[0]?.exercises[0]?.sets[0]?.targetRir, 3);
  assert.deepEqual(next?.sessions.map((session) => session.key), ["upper-a", "lower-a"]);
  assert.equal(recommendations.record.decisionState, "modified");
});

test("Modify rejects fabricated structure-changing patches before persistence", async () => {
  const programs = new DecisionPrograms();
  const recommendations = new DecisionRecommendations();
  const fabricated = { kind: "change_structure", structureId: "ppl-6" } as unknown as ProgramPatch;

  await assert.rejects(
    () => modifyRecommendation("recommendation-1", fabricated, deps(programs, recommendations)),
    (error: unknown) => error instanceof LiftPathV5Error && error.code === "VALIDATION_ERROR",
  );

  assert.equal(programs.atomicCalls, 0);
  assert.equal(programs.active.structureId, "upper-lower-4");
  assert.equal(recommendations.record.decisionState, "pending");
});

test("Skip changes only recommendation state and creates no program version", async () => {
  const programs = new DecisionPrograms();
  const recommendations = new DecisionRecommendations();

  await skipRecommendation("recommendation-1", {
    recommendations,
    clock: { now: () => decisionStamp },
  });

  assert.equal(recommendations.record.decisionState, "skipped");
  assert.equal(programs.atomicCalls, 0);
  assert.equal(programs.versions.length, 1);
});
