import { LiftPathV5Error } from "../common/errors.js";
import type { ExerciseMetadata } from "../exercises/exercise.js";
import type { ProgramProposal } from "./prescription.js";
import type { TrainingProfileDraft } from "./profile.js";
import type { ProgramExercise, ProgramVersion } from "./program.js";

export interface TransitionRetentionResult {
  sessions: ProgramProposal["sessions"];
  retainedExerciseIds: string[];
  replacedExerciseIds: string[];
}

function compatibleExercise(exercise: ExerciseMetadata, profile: TrainingProfileDraft): boolean {
  const equipment = new Set(profile.constraints.equipment);
  return exercise.equipment.every((item) => equipment.has(item)) &&
    !profile.constraints.dislikedExerciseIds.includes(exercise.id) &&
    !profile.constraints.restrictedMovementPatterns.includes(exercise.movementPattern) &&
    (profile.goal !== "strength" || exercise.supportedRepRanges.some((range) => range.min <= 8));
}

export function validateTransitionShape(current: ProgramVersion, proposed: ProgramProposal): void {
  if (!current.structureId || proposed.structureId !== current.structureId) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition cannot change training structure");
  }
  if (proposed.sessions.length !== current.sessions.length) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition cannot change session count");
  }
  const currentKeys = current.sessions.map((session) => session.key);
  const nextKeys = proposed.sessions.map((session) => session.key);
  if (currentKeys.some((key, index) => key !== nextKeys[index])) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Goal transition must preserve session structure");
  }
}

export function retainTransitionExercises(
  current: ProgramVersion,
  proposed: ProgramProposal,
  targetProfile: TrainingProfileDraft,
  catalog: readonly ExerciseMetadata[],
): TransitionRetentionResult {
  validateTransitionShape(current, proposed);
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
    retainedExerciseIds: [...retained].sort(),
    replacedExerciseIds: [...replaced].filter((id) => !retained.has(id)).sort(),
  };
}
