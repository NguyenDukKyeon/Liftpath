import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { ProgramRepository } from "../ports/program-repository.js";
import type { ProgramProposal } from "../../domain/programming/prescription.js";
import {
  validateTrainingProfileDraft,
  type TrainingProfile,
  type TrainingProfileDraft,
} from "../../domain/programming/profile.js";
import type { ProgramVersion } from "../../domain/programming/program.js";
import { validateTrainingBlock, type TrainingBlock } from "../../domain/programming/training-block.js";

export interface ActivateProgramDependencies {
  programs: ProgramRepository;
  ids: IdGenerator;
  clock: Clock;
}

export interface ActivatedProgram {
  profile: TrainingProfile;
  program: ProgramVersion;
  block: TrainingBlock;
}

export async function activateProgram(
  proposal: ProgramProposal,
  draft: TrainingProfileDraft,
  dependencies: ActivateProgramDependencies,
): Promise<ActivatedProgram> {
  validateTrainingProfileDraft(draft);
  const now = dependencies.clock.now();
  const profile: TrainingProfile = {
    ...draft,
    constraints: {
      ...draft.constraints,
      equipment: [...draft.constraints.equipment],
      dislikedExerciseIds: [...draft.constraints.dislikedExerciseIds],
      restrictedMovementPatterns: [...draft.constraints.restrictedMovementPatterns],
    },
    id: dependencies.ids.next("profile"),
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };

  const program: ProgramVersion = {
    id: dependencies.ids.next("program-version"),
    versionNumber: 1,
    name: proposal.name,
    profileId: profile.id,
    policyVersion: proposal.policyVersion,
    structureId: proposal.structureId,
    rationale: [...proposal.rationale],
    source: "initial",
    sessions: proposal.sessions.map((session) => ({
      ...session,
      exercises: session.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set })),
      })),
    })),
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };

  const block: TrainingBlock = {
    id: dependencies.ids.next("block"),
    blockNumber: 1,
    status: "active",
    goal: profile.goal,
    primarySpecialization: profile.primarySpecialization,
    secondaryFocus: profile.secondaryFocus,
    structureId: proposal.structureId,
    initialProgramVersionId: program.id,
    currentProgramVersionId: program.id,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  validateTrainingBlock(block);

  await dependencies.programs.activateInitial(profile, program, block);
  return { profile, program, block };
}
