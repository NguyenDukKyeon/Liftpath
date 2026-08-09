import { activateGoalTransition } from "../application/programs/activate-goal-transition.js";
import { buildProgramPreview } from "../application/programs/build-program-preview.js";
import { proposeGoalTransition } from "../application/programs/propose-goal-transition.js";
import { CATALOG_SEED } from "../domain/exercises/catalog-seed.js";
import type { TrainingProfile } from "../domain/programming/profile.js";
import type { ProgramVersion } from "../domain/programming/program.js";
import type { TrainingBlock } from "../domain/programming/training-block.js";
import { createBlockRepository } from "../infrastructure/repositories/block-repository.js";
import { createIndexedDbDatabase } from "../infrastructure/repositories/indexed-db-database.js";
import { createProgramRepository } from "../infrastructure/repositories/program-repository.js";

export interface TrainingLifecycleDiagnosticResult {
  source: "user_goal_change";
  proposalStructureId: string;
  retainedExerciseIds: string[];
  oldProgramId: string;
  newProgramId: string;
  oldBlockId: string;
  newBlockId: string;
}

const stamp = "2026-08-09T01:00:00.000Z";
const transitionStamp = "2026-08-09T02:00:00.000Z";

function initialProfile(): TrainingProfile {
  return {
    id: "lifecycle-profile-1",
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

function initialProgram(profile: TrainingProfile): ProgramVersion {
  const preview = buildProgramPreview(profile, "upper-lower-4", { catalog: [...CATALOG_SEED] });
  return {
    id: "lifecycle-program-1",
    versionNumber: 1,
    name: preview.name,
    sessions: preview.sessions,
    profileId: profile.id,
    policyVersion: preview.policyVersion,
    structureId: preview.structureId,
    rationale: preview.rationale,
    source: "initial",
    createdAt: stamp,
    updatedAt: stamp,
    revision: 1,
  };
}

function initialBlock(profile: TrainingProfile, program: ProgramVersion): TrainingBlock {
  return {
    id: "lifecycle-block-1",
    blockNumber: 1,
    status: "active",
    goal: profile.goal,
    primarySpecialization: profile.primarySpecialization,
    secondaryFocus: profile.secondaryFocus,
    structureId: program.structureId ?? "upper-lower-4",
    initialProgramVersionId: program.id,
    currentProgramVersionId: program.id,
    startedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    revision: 1,
  };
}

export async function verifyTrainingLifecycleTransition(): Promise<TrainingLifecycleDiagnosticResult> {
  const database = createIndexedDbDatabase();
  await database.transaction(
    ["profiles", "programVersions", "trainingBlocks", "metadata"],
    "readwrite",
    async (tx) => {
      await tx.clear("profiles");
      await tx.clear("programVersions");
      await tx.clear("trainingBlocks");
      await tx.clear("metadata");
    },
  );

  const programs = createProgramRepository(database);
  const blocks = createBlockRepository(database);
  const profile = initialProfile();
  const program = initialProgram(profile);
  const block = initialBlock(profile, program);
  await programs.activateInitial(profile, program);
  await blocks.createIfNoActive(block);

  const targetProfile = { ...profile, primarySpecialization: "arms" as const };
  const proposal = proposeGoalTransition(program, profile, targetProfile, { catalog: [...CATALOG_SEED] });
  const activated = await activateGoalTransition(
    {
      currentProfile: profile,
      currentProgram: program,
      activeBlock: block,
      targetProfile,
      proposal,
    },
    {
      lifecycle: programs,
      clock: { now: () => transitionStamp },
      ids: {
        next: (prefix) => prefix === "program" ? "lifecycle-program-2" : "lifecycle-block-2",
      },
    },
  );

  return {
    source: proposal.source,
    proposalStructureId: proposal.program.structureId,
    retainedExerciseIds: [...proposal.retainedExerciseIds],
    oldProgramId: program.id,
    newProgramId: activated.program.id,
    oldBlockId: block.id,
    newBlockId: activated.block.id,
  };
}
