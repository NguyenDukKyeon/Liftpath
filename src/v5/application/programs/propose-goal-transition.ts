import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { ExerciseMetadata } from "../../domain/exercises/exercise.js";
import type { ProgramProposal } from "../../domain/programming/prescription.js";
import type { TrainingProfileDraft } from "../../domain/programming/profile.js";
import type { ProgramVersion } from "../../domain/programming/program.js";
import { retainTransitionExercises } from "../../domain/programming/transition.js";
import { buildProgramPreview } from "./build-program-preview.js";

export interface GoalTransitionProposal {
  source: "user_goal_change";
  program: ProgramProposal;
  retainedExerciseIds: string[];
  replacedExerciseIds: string[];
}

export interface GoalTransitionDependencies {
  catalog: ExerciseMetadata[];
  requestedStructureId?: string;
}

export function proposeGoalTransition(
  currentProgram: ProgramVersion,
  _currentProfile: TrainingProfileDraft,
  targetProfile: TrainingProfileDraft,
  dependencies: GoalTransitionDependencies,
): GoalTransitionProposal {
  const structureId = currentProgram.structureId;
  if (!structureId) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition requires a stable current structure");
  }
  if (dependencies.requestedStructureId && dependencies.requestedStructureId !== structureId) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition cannot change training structure");
  }

  const generated = buildProgramPreview(targetProfile, structureId, { catalog: dependencies.catalog });
  const retention = retainTransitionExercises(currentProgram, generated, targetProfile, dependencies.catalog);

  return {
    source: "user_goal_change",
    program: { ...generated, sessions: retention.sessions },
    retainedExerciseIds: retention.retainedExerciseIds,
    replacedExerciseIds: retention.replacedExerciseIds,
  };
}
