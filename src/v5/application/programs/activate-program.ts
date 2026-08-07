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

export interface ActivateProgramDependencies {
  programs: ProgramRepository;
  ids: IdGenerator;
  clock: Clock;
}

export interface ActivatedProgram {
  profile: TrainingProfile;
  program: ProgramVersion;
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

  await dependencies.programs.activateInitial(profile, program);
  return { profile, program };
}
