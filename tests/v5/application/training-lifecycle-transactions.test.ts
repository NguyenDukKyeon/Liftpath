import assert from "node:assert/strict";
import test from "node:test";
import {
  activateGoalTransition,
  type GoalTransitionRepository,
} from "../../../src/v5/application/programs/activate-goal-transition.js";
import type { GoalTransitionProposal } from "../../../src/v5/application/programs/propose-goal-transition.js";
import type { TrainingProfile } from "../../../src/v5/domain/programming/profile.js";
import type { ProgramVersion } from "../../../src/v5/domain/programming/program.js";
import type { TrainingBlock } from "../../../src/v5/domain/programming/training-block.js";

const stamp = "2026-08-09T01:00:00.000Z";
const transitionStamp = "2026-08-09T02:00:00.000Z";

function profile(): TrainingProfile {
  return {
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
      equipment: ["barbell", "rack", "bench", "dumbbell", "cable", "machine"],
      dislikedExerciseIds: [],
      restrictedMovementPatterns: [],
    },
  };
}

function program(): ProgramVersion {
  return {
    id: "program-1",
    versionNumber: 3,
    name: "V-Shape",
    profileId: "profile-1",
    policyVersion: "1.0.0",
    structureId: "upper-lower-4",
    sessions: [
      { key: "upper-a", name: "Upper A", exercises: [{ exerciseId: "barbell-bench-press", order: 1, sets: [{ ordinal: 1, minReps: 6, maxReps: 10, targetRir: 2 }] }] },
      { key: "lower-a", name: "Lower A", exercises: [] },
      { key: "upper-b", name: "Upper B", exercises: [] },
      { key: "lower-b", name: "Lower B", exercises: [] },
    ],
    createdAt: stamp,
    updatedAt: stamp,
    revision: 1,
  };
}

function block(): TrainingBlock {
  return {
    id: "block-1",
    blockNumber: 1,
    status: "active",
    goal: "hypertrophy",
    primarySpecialization: "v_shape",
    structureId: "upper-lower-4",
    initialProgramVersionId: "program-1",
    currentProgramVersionId: "program-1",
    startedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    revision: 1,
  };
}

function proposal(): GoalTransitionProposal {
  return {
    source: "user_goal_change",
    program: {
      name: "Arms",
      policyVersion: "1.0.0",
      structureId: "upper-lower-4",
      rationale: ["Shift specialization priority toward arms while preserving the selected structure."],
      sessions: program().sessions,
      workloadByMuscle: {
        lats: 4, side_delts: 4, rear_delts: 3, upper_back: 4, upper_chest: 3, chest: 6,
        biceps: 8, triceps: 8, quads: 6, hamstrings: 6, glutes: 6, calves: 4, core: 3,
      },
    },
    retainedExerciseIds: ["barbell-bench-press"],
    replacedExerciseIds: [],
  };
}

class MemoryLifecycleRepository implements GoalTransitionRepository {
  profile = profile();
  programs = [program()];
  blocks = [block()];
  activeProgramId = "program-1";
  atomicCalls = 0;
  failAtomic = false;

  async activateGoalTransition(input: Parameters<GoalTransitionRepository["activateGoalTransition"]>[0]): Promise<void> {
    this.atomicCalls += 1;
    if (this.failAtomic) throw new Error("transaction aborted");
    this.profile = input.profile;
    this.blocks = [input.completedBlock, input.nextBlock];
    this.programs = [...this.programs, input.program];
    this.activeProgramId = input.program.id;
  }
}

test("activate goal transition commits profile, ProgramVersion and block boundary atomically", async () => {
  const repository = new MemoryLifecycleRepository();
  const result = await activateGoalTransition(
    {
      currentProfile: profile(),
      currentProgram: program(),
      activeBlock: block(),
      targetProfile: { ...profile(), goal: "hypertrophy", primarySpecialization: "arms" },
      proposal: proposal(),
    },
    {
      lifecycle: repository,
      clock: { now: () => transitionStamp },
      ids: { next: (prefix) => prefix === "program" ? "program-2" : "block-2" },
    },
  );

  assert.equal(repository.atomicCalls, 1);
  assert.equal(repository.profile.primarySpecialization, "arms");
  assert.deepEqual(repository.programs.map((item) => item.id), ["program-1", "program-2"]);
  assert.equal(repository.activeProgramId, "program-2");
  assert.equal(repository.blocks[0]?.status, "completed");
  assert.equal(repository.blocks[0]?.initialProgramVersionId, "program-1");
  assert.equal(repository.blocks[1]?.status, "active");
  assert.equal(repository.blocks[1]?.currentProgramVersionId, "program-2");
  assert.equal(result.program.source, "user_goal_change");
  assert.deepEqual(result.program.transitionRetainedExerciseIds, ["barbell-bench-press"]);
  assert.equal(result.block.structureId, "upper-lower-4");
});

test("activate goal transition rollback leaves prior profile/program/block untouched", async () => {
  const repository = new MemoryLifecycleRepository();
  repository.failAtomic = true;

  await assert.rejects(() => activateGoalTransition(
    {
      currentProfile: profile(),
      currentProgram: program(),
      activeBlock: block(),
      targetProfile: { ...profile(), goal: "hypertrophy", primarySpecialization: "arms" },
      proposal: proposal(),
    },
    {
      lifecycle: repository,
      clock: { now: () => transitionStamp },
      ids: { next: (prefix) => prefix === "program" ? "program-2" : "block-2" },
    },
  ));

  assert.equal(repository.atomicCalls, 1);
  assert.equal(repository.profile.primarySpecialization, "v_shape");
  assert.deepEqual(repository.programs.map((item) => item.id), ["program-1"]);
  assert.deepEqual(repository.blocks.map((item) => item.id), ["block-1"]);
  assert.equal(repository.blocks[0]?.status, "active");
  assert.equal(repository.activeProgramId, "program-1");
});
