import {
  BUILT_IN_EXERCISES,
  BUILT_IN_PROGRAMS,
  allExercises,
  availableExerciseIds,
  defaultProgression,
  getProgram,
  isBuiltInProgramId,
} from "../data.js";
import { makeDraftEntry } from "./training.js";
import type {
  DayId,
  Exercise,
  ExerciseEntry,
  ExerciseId,
  ExercisePrescription,
  ProgramId,
  Session,
  SetPrescription,
  TrainingProgram,
  UserProfile,
} from "../types.js";

type PlannedWorkout = {
  program: {
    id: ProgramId;
    name: string;
    version: number;
  };
  workout: {
    id: DayId;
    name: string;
    shortName: string;
    focus: string;
    exercises: ExercisePrescription[];
  };
  entries: ExerciseEntry[];
};

export type BuildWorkoutEntriesInput = {
  programId: ProgramId;
  dayId: DayId;
  customPrograms: TrainingProgram[];
  customExercises: Exercise[];
  profile: UserProfile;
  history: Session[];
  targetRpe: number;
};

const strengthCompounds = new Set<ExerciseId>([
  "back_squat",
  "barbell_bench",
  "barbell_rdl",
  "db_ohp",
  "pull_up",
  "leg_press",
]);

const schemeFor = (
  exercise: Exercise,
  count: number,
  min: number,
  max: number,
  source?: SetPrescription[],
): SetPrescription[] => Array.from({ length: count }, (_, index) => {
  const kind = source?.[index]?.kind ?? source?.at(-1)?.kind ?? "working";
  if (exercise.trackingMode === "duration") {
    return { kind, targetSeconds: { min, max } };
  }
  if (exercise.trackingMode === "distance") {
    return { kind, targetDistanceMeters: { min, max } };
  }
  return { kind, targetReps: { min, max } };
});

const basePrescription = (
  workoutId: string,
  exercise: Exercise,
  order: number,
): ExercisePrescription => ({
  id: `${workoutId}:${exercise.id}:${order}`,
  exerciseId: exercise.id,
  order,
  setScheme: schemeFor(exercise, exercise.sets, exercise.min, exercise.max),
  restSeconds: exercise.rest,
  targetEffort: { mode: "simple", repsInReserve: 2 },
  progression: defaultProgression(exercise),
  coachingCue: exercise.technique,
  optional: order >= 5,
  priority: order < 2 ? "primary" : order < 5 ? "secondary" : "accessory",
});

const canonicalWorkout = (
  programId: ProgramId,
  dayId: DayId,
  customPrograms: TrainingProgram[],
  exercises: Record<string, Exercise>,
) => {
  if (isBuiltInProgramId(programId)) {
    const program = BUILT_IN_PROGRAMS[programId];
    const workout = program.workouts.find((item) => item.id === dayId);
    return workout ? {
      program: { id: program.id, name: program.name, version: program.version },
      workout,
    } : null;
  }

  const program = getProgram(programId, customPrograms);
  const workout = program.workouts.find((item) => item.id === dayId);
  if (!workout) return null;
  const prescriptions = workout.exercises.flatMap((exerciseId, order): ExercisePrescription[] => {
    const exercise = exercises[exerciseId];
    return exercise ? [basePrescription(workout.id, exercise, order)] : [];
  });
  return {
    program: { id: program.id, name: program.name, version: program.version },
    workout: { ...workout, exercises: prescriptions },
  };
};

const replacementPrescription = (
  original: ExercisePrescription,
  replacement: Exercise,
): ExercisePrescription => {
  const ranges = original.setScheme.flatMap((set) => [
    set.targetReps,
    set.targetSeconds,
    set.targetDistanceMeters,
  ].filter((range): range is { min: number; max: number } => Boolean(range)));
  const min = ranges[0]?.min ?? replacement.min;
  const max = ranges[0]?.max ?? replacement.max;
  return {
    ...original,
    id: `${original.id}:replacement:${replacement.id}`,
    exerciseId: replacement.id,
    setScheme: schemeFor(replacement, original.setScheme.length, min, max, original.setScheme),
    progression: defaultProgression(replacement),
    coachingCue: replacement.technique,
  };
};

const personalizePrescription = (
  prescription: ExercisePrescription,
  exercise: Exercise,
  profile: UserProfile,
  targetRpe: number,
): ExercisePrescription => {
  const strengthMode = profile.goal === "strength" && strengthCompounds.has(exercise.id);
  const generalMode = profile.goal === "general" || profile.goal === "fat-loss";
  const baseCount = prescription.setScheme.length;
  const experienceAdjustment = profile.experience === "beginner" ? -1 : 0;
  const desiredCount = Math.max(
    2,
    (strengthMode ? Math.max(3, baseCount + 1) : generalMode ? Math.min(3, baseCount) : baseCount)
      + experienceAdjustment,
  );
  const min = strengthMode ? 3 : generalMode ? Math.max(8, exercise.min) : exercise.min;
  const max = strengthMode ? 6 : generalMode ? Math.max(12, exercise.max) : exercise.max;
  const restSeconds = strengthMode
    ? Math.max(150, prescription.restSeconds)
    : generalMode
      ? Math.min(90, prescription.restSeconds)
      : prescription.restSeconds;

  return {
    ...prescription,
    setScheme: schemeFor(exercise, desiredCount, min, max, prescription.setScheme),
    restSeconds,
    targetEffort: { mode: "rpe", value: Math.max(1, Math.min(10, targetRpe)) },
  };
};

export const buildWorkoutEntries = ({
  programId,
  dayId,
  customPrograms,
  customExercises,
  profile,
  history,
  targetRpe,
}: BuildWorkoutEntriesInput): PlannedWorkout | null => {
  const exercises = allExercises(customExercises);
  const canonical = canonicalWorkout(programId, dayId, customPrograms, exercises);
  if (!canonical) return null;

  const allowed = new Set(availableExerciseIds(profile, customExercises));
  const priority = new Set(profile.priorityMuscles);
  const head = canonical.workout.exercises.slice(0, 2);
  const tail = canonical.workout.exercises.slice(2).sort((a, b) => {
    const aExercise = exercises[a.exerciseId];
    const bExercise = exercises[b.exerciseId];
    return Number(priority.has(bExercise?.primary)) - Number(priority.has(aExercise?.primary));
  });
  const maxExercises = profile.sessionMinutes <= 40
    ? 5
    : profile.sessionMinutes <= 60
      ? 6
      : profile.sessionMinutes <= 75
        ? 7
        : 8;

  const selected = [...head, ...tail].slice(0, maxExercises);
  const entries = selected.flatMap((prescription): ExerciseEntry[] => {
    const original = exercises[prescription.exerciseId];
    if (!original) return [];
    const chosenId = allowed.has(original.id)
      ? original.id
      : original.alternatives.find((alternativeId) => allowed.has(alternativeId));
    if (!chosenId) return [];
    const chosen = exercises[chosenId];
    if (!chosen) return [];
    const safePrescription = chosen.id === original.id
      ? prescription
      : replacementPrescription(prescription, chosen);
    const personalized = personalizePrescription(safePrescription, chosen, profile, targetRpe);
    const entry = makeDraftEntry(personalized, chosen, history);
    return [{
      ...entry,
      replacedExerciseId: chosen.id === original.id ? undefined : original.id,
    }];
  });

  return {
    program: canonical.program,
    workout: canonical.workout,
    entries,
  };
};
