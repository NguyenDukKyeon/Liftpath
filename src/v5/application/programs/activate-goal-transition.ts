import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { GoalTransitionRepository } from "../ports/program-repository.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import {
  validateTrainingProfileDraft,
  type TrainingProfile,
  type TrainingProfileDraft,
} from "../../domain/programming/profile.js";
import type { ProgramVersion } from "../../domain/programming/program.js";
import {
  completeTrainingBlock,
  validateTrainingBlock,
  type TrainingBlock,
} from "../../domain/programming/training-block.js";
import { validateTransitionShape } from "../../domain/programming/transition.js";
import type { GoalTransitionProposal } from "./propose-goal-transition.js";

export { type GoalTransitionRepository } from "../ports/program-repository.js";

export interface ActivateGoalTransitionInput {
  currentProfile: TrainingProfile;
  currentProgram: ProgramVersion;
  activeBlock: TrainingBlock;
  targetProfile: TrainingProfileDraft;
  proposal: GoalTransitionProposal;
}

export interface ActivateGoalTransitionDependencies {
  lifecycle: GoalTransitionRepository;
  clock: Clock;
  ids: IdGenerator;
}

export interface ActivatedGoalTransition {
  profile: TrainingProfile;
  program: ProgramVersion;
  completedBlock: TrainingBlock;
  block: TrainingBlock;
}

export async function activateGoalTransition(
  input: ActivateGoalTransitionInput,
  dependencies: ActivateGoalTransitionDependencies,
): Promise<ActivatedGoalTransition> {
  validateTrainingProfileDraft(input.targetProfile);
  if (input.proposal.source !== "user_goal_change") {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition requires explicit user initiation");
  }
  if (input.activeBlock.status !== "active") {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition requires an active training block");
  }
  if (input.activeBlock.currentProgramVersionId !== input.currentProgram.id) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition is based on a stale active program");
  }
  if (input.activeBlock.structureId !== input.currentProgram.structureId) {
    throw new LiftPathV5Error("CORRUPTED_DATA", "Active block and program structure do not match");
  }
  validateTransitionShape(input.currentProgram, input.proposal.program);

  const timestamp = dependencies.clock.now();
  const completedBlock = completeTrainingBlock(input.activeBlock, timestamp);
  const profile: TrainingProfile = {
    ...input.currentProfile,
    ...input.targetProfile,
    constraints: {
      ...input.targetProfile.constraints,
      equipment: [...input.targetProfile.constraints.equipment],
      dislikedExerciseIds: [...input.targetProfile.constraints.dislikedExerciseIds],
      restrictedMovementPatterns: [...input.targetProfile.constraints.restrictedMovementPatterns],
    },
    id: input.currentProfile.id,
    createdAt: input.currentProfile.createdAt,
    updatedAt: timestamp,
    revision: input.currentProfile.revision + 1,
  };

  const program: ProgramVersion = {
    id: dependencies.ids.next("program"),
    versionNumber: input.currentProgram.versionNumber + 1,
    name: input.proposal.program.name,
    sessions: input.proposal.program.sessions.map((session) => ({
      ...session,
      exercises: session.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set })),
      })),
    })),
    profileId: profile.id,
    policyVersion: input.proposal.program.policyVersion,
    structureId: input.proposal.program.structureId,
    rationale: [...input.proposal.program.rationale],
    source: "user_goal_change",
    transitionRetainedExerciseIds: [...input.proposal.retainedExerciseIds],
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
  };

  const block: TrainingBlock = {
    id: dependencies.ids.next("block"),
    blockNumber: input.activeBlock.blockNumber + 1,
    status: "active",
    goal: profile.goal,
    primarySpecialization: profile.primarySpecialization,
    secondaryFocus: profile.secondaryFocus,
    structureId: input.activeBlock.structureId,
    initialProgramVersionId: program.id,
    currentProgramVersionId: program.id,
    startedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
  };
  validateTrainingBlock(block);

  await dependencies.lifecycle.activateGoalTransition({
    expectedActiveProgramId: input.currentProgram.id,
    expectedActiveBlockId: input.activeBlock.id,
    expectedProfileRevision: input.currentProfile.revision,
    completedBlock,
    profile,
    program,
    nextBlock: block,
  });

  return { profile, program, completedBlock, block };
}
