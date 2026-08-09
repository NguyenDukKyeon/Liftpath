import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { ExerciseMetadata } from "../../domain/exercises/exercise.js";
import type { ProgramProposal } from "../../domain/programming/prescription.js";
import type { TrainingProfileDraft } from "../../domain/programming/profile.js";
import type { ProgramExercise, ProgramVersion } from "../../domain/programming/program.js";
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

function compatibleExercise(
  exercise: ExerciseMetadata,
  profile: TrainingProfileDraft,
): boolean {
  const equipment = new Set(profile.constraints.equipment);
  return exercise.equipment.every((item) => equipment.has(item)) &&
    !profile.constraints.dislikedExerciseIds.includes(exercise.id) &&
    !profile.constraints.restrictedMovementPatterns.includes(exercise.movementPattern) &&
    (profile.goal !== "strength" || exercise.supportedRepRanges.some((range) => range.min <= 8));
}

function retainCompatibleExercises(
  current: ProgramVersion,
  proposed: ProgramProposal,
  targetProfile: TrainingProfileDraft,
  catalog: ExerciseMetadata[],
): { sessions: ProgramProposal["sessions"]; retained: string[]; replaced: string[] } {
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise] as const));
  const retained = new Set<string>();
  const replaced = new Set<string>();

  const sessions = proposed.sessions.map((targetSession) => {
    const currentSession = current.sessions.find((session) => session.key === targetSession.key);
    const used = new Set<string>();
    const exercises = targetSession.exercises.map((targetExercise): ProgramExercise => {
      const targetMetadata = byId.get(targetExercise.exerciseId);
      const currentCandidates = (currentSession?.exercises ?? [])
        .map((exercise) => ({ exercise, metadata: byId.get(exercise.exerciseId) }))
        .filter((candidate): candidate is { exercise: ProgramExercise; metadata: ExerciseMetadata } =>
          candidate.metadata !== undefined &&
          compatibleExercise(candidate.metadata, targetProfile) &&
          !used.has(candidate.exercise.exerciseId),
        )
        .sort((left, right) => left.exercise.order - right.exercise.order || left.exercise.exerciseId.localeCompare(right.exercise.exerciseId));

      const exact = currentCandidates.find((candidate) => candidate.exercise.exerciseId === targetExercise.exerciseId);
      const intentMatch = targetMetadata
        ? currentCandidates.find((candidate) => candidate.metadata.substitutionGroup === targetMetadata.substitutionGroup)
        : undefined;
      const chosen = exact ?? intentMatch;
      if (!chosen) {
        replaced.add(targetExercise.exerciseId);
        return { ...targetExercise, sets: targetExercise.sets.map((set) => ({ ...set })) };
      }

      used.add(chosen.exercise.exerciseId);
      retained.add(chosen.exercise.exerciseId);
      return {
        ...targetExercise,
        exerciseId: chosen.exercise.exerciseId,
        sets: targetExercise.sets.map((set) => ({ ...set })),
      };
    });
    return { ...targetSession, exercises };
  });

  return {
    sessions,
    retained: [...retained].sort(),
    replaced: [...replaced].filter((id) => !retained.has(id)).sort(),
  };
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
  if (generated.structureId !== structureId || generated.sessions.length !== currentProgram.sessions.length) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition must preserve structure and session count");
  }
  const currentKeys = currentProgram.sessions.map((session) => session.key);
  const generatedKeys = generated.sessions.map((session) => session.key);
  if (currentKeys.some((key, index) => key !== generatedKeys[index])) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition must preserve session structure");
  }

  const retention = retainCompatibleExercises(
    currentProgram,
    generated,
    targetProfile,
    dependencies.catalog,
  );

  return {
    source: "user_goal_change",
    program: { ...generated, sessions: retention.sessions },
    retainedExerciseIds: retention.retained,
    replacedExerciseIds: retention.replaced,
  };
}
