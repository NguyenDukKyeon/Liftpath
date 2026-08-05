import { useCallback, useState } from "react";
import { allExercises, defaultProgression } from "./data.js";
import { latestExerciseEntry, makeDraftEntry, uid } from "./domain/training.js";
import { useAppState } from "./state.js";
import type {
  CoachDecision,
  PlanRecommendation,
  ReadinessAdjustment,
  ReadinessInput,
} from "./features/coach/contracts.js";
import { applyPreferenceSignal, type PreferenceSignal } from "./features/coach/preferences.js";
import { findSafeSubstitution } from "./features/coach/substitution.js";
import type { WarmupSet } from "./features/coach/warmup.js";
import {
  createDraftAfterReadiness,
  prepareWorkoutFromState,
  type PreparedWorkout,
} from "./features/workout/preparation.js";
import type {
  DayId,
  Exercise,
  ExerciseEntry,
  ExerciseId,
  ExercisePreferenceReason,
  ExercisePrescription,
  LoggedSet,
  ProgramId,
  SetEntry,
  SetPrescription,
  TrackingMode,
  TrainingProgram,
  UserProfile,
} from "./types.js";

const runtimeProgramFromRecommendation = (
  recommendation: PlanRecommendation,
  id: ProgramId,
): TrainingProgram => ({
  ...recommendation.program,
  id,
  name: `${recommendation.program.name} · Coach`,
  shortName: "Coach",
  recommendedDays: [...recommendation.program.recommendedDays],
  workouts: recommendation.program.workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((prescription) => prescription.exerciseId),
  })),
  custom: true,
});

const modeFor = (entry: ExerciseEntry): TrackingMode => {
  if (entry.snapshot.trackingMode) return entry.snapshot.trackingMode;
  if (entry.snapshot.suffix === "seconds") return "duration";
  if (entry.snapshot.incrementKg === 0) return "bodyweight-reps";
  return "weight-reps";
};

const setSchemeFor = (exercise: Exercise, count: number): SetPrescription[] => Array.from(
  { length: Math.max(1, count) },
  () => exercise.trackingMode === "duration"
    ? { kind: "working" as const, targetSeconds: { min: exercise.min, max: exercise.max } }
    : exercise.trackingMode === "distance"
      ? { kind: "working" as const, targetDistanceMeters: { min: exercise.min, max: exercise.max } }
      : { kind: "working" as const, targetReps: { min: exercise.min, max: exercise.max } },
);

const sourceSetFromHistory = (
  entry: ExerciseEntry,
  previousEntry: ExerciseEntry,
  setIndex: number,
): SetEntry | null => {
  const current = entry.sets[setIndex];
  if (!current) return null;
  const sameKindPosition = entry.sets
    .slice(0, setIndex + 1)
    .filter((set) => set.kind === current.kind)
    .length - 1;
  const sameKind = previousEntry.sets.filter((set) => set.done && set.kind === current.kind);
  const working = previousEntry.sets.filter((set) => set.done && set.kind !== "warmup");
  return sameKind[sameKindPosition]
    ?? sameKind.at(-1)
    ?? working[sameKindPosition]
    ?? working.at(-1)
    ?? null;
};

const makeWarmupRows = (sets: WarmupSet[]): { legacy: SetEntry[]; logged: LoggedSet[] } => {
  const rows = sets.map((set) => {
    const id = uid();
    return {
      legacy: {
        id,
        kind: "warmup" as const,
        weight: String(set.weightKg),
        reps: String(set.reps),
        rpe: "",
        done: false,
      },
      logged: {
        id,
        kind: "warmup" as const,
        trackingMode: "weight-reps" as const,
        weightKg: set.weightKg,
        reps: set.reps,
        effort: null,
        done: false,
      },
    };
  });
  return {
    legacy: rows.map((row) => row.legacy),
    logged: rows.map((row) => row.logged),
  };
};

export function useGuidedAppState() {
  const base = useAppState();
  const [preparedWorkout, setPreparedWorkout] = useState<PreparedWorkout | null>(null);

  const completeOnboarding = useCallback((
    profile: UserProfile,
    recommendation?: PlanRecommendation,
  ) => {
    const completedProfile = { ...profile, onboardingComplete: true };
    base.completeOnboarding(completedProfile);
    if (!recommendation) return;

    const isVariant = recommendation.substitutions.length > 0
      || recommendation.removedPrescriptionIds.length > 0
      || recommendation.invalidPrescriptionIds.length > 0;

    if (isVariant) {
      const programId = `custom:coach-${recommendation.canonicalProgramId}` as ProgramId;
      const program = runtimeProgramFromRecommendation(recommendation, programId);
      base.addCustomProgram(program);
      base.switchProgram(programId, { keepSchedule: false, resetCycle: true });
      return;
    }

    base.updateSettings({
      programId: recommendation.canonicalProgramId,
      weeklyGoal: recommendation.program.daysPerWeek,
      trainingDays: [...recommendation.program.recommendedDays],
    });
  }, [base]);

  const prepareWorkout = useCallback((dayId: DayId) => {
    const prepared = prepareWorkoutFromState(base.state, dayId);
    if (prepared) setPreparedWorkout(prepared);
  }, [base.state]);

  const cancelPreparedWorkout = useCallback(() => setPreparedWorkout(null), []);

  const confirmReadiness = useCallback((
    input: ReadinessInput,
  ): CoachDecision<ReadinessAdjustment> | null => {
    if (!preparedWorkout) return null;
    const result = createDraftAfterReadiness(base.state, preparedWorkout, input);
    if (!result.draft) return result.adjustment;
    base.replaceState({
      ...base.state,
      draft: result.draft,
      lastRecap: null,
    });
    setPreparedWorkout(null);
    return result.adjustment;
  }, [base, preparedWorkout]);

  const copyPreviousSet = useCallback((exerciseIndex: number, setIndex: number) => {
    const entry = base.state.draft?.exercises[exerciseIndex];
    if (!entry || entry.sets[setIndex]?.done) return;
    const previous = latestExerciseEntry(base.state.history, entry.exerciseId)?.entry;
    if (!previous || modeFor(previous) !== modeFor(entry)) return;
    const source = sourceSetFromHistory(entry, previous, setIndex);
    if (!source) return;
    base.updateSet(exerciseIndex, setIndex, {
      weight: source.weight,
      reps: source.reps,
      rpe: "",
    });
  }, [base]);

  const insertWarmupSets = useCallback((exerciseIndex: number, sets: WarmupSet[]) => {
    const draft = base.state.draft;
    const entry = draft?.exercises[exerciseIndex];
    if (!draft || !entry || modeFor(entry) !== "weight-reps" || !sets.length) return;
    const rows = makeWarmupRows(sets);
    const exercises = draft.exercises.map((item, index) => index === exerciseIndex
      ? {
          ...item,
          sets: [...rows.legacy, ...item.sets],
          loggedSets: [...rows.logged, ...(item.loggedSets ?? [])],
        }
      : item);
    base.replaceState({ ...base.state, draft: { ...draft, exercises } });
  }, [base]);

  const addExerciseToDraft = useCallback((exerciseId: ExerciseId) => {
    const draft = base.state.draft;
    if (!draft) return;
    const exercises = allExercises(base.state.customExercises);
    const safety = findSafeSubstitution({
      exerciseId,
      equipment: base.state.profile.equipment,
      restrictions: base.state.profile.restrictions ?? [],
      exercises,
    });
    if (!safety.value || safety.value.id !== exerciseId) return;
    const exercise = safety.value;
    const order = draft.exercises.length;
    const prescription: ExercisePrescription = {
      id: `${draft.dayId}:${exercise.id}:${order}:added`,
      exerciseId: exercise.id,
      order,
      setScheme: setSchemeFor(exercise, exercise.sets),
      restSeconds: exercise.rest,
      targetEffort: { mode: "simple", repsInReserve: 2 },
      progression: defaultProgression(exercise),
      coachingCue: exercise.technique,
      optional: true,
      priority: "accessory",
    };
    const next = makeDraftEntry(prescription, exercise, base.state.history);
    base.replaceState({
      ...base.state,
      draft: { ...draft, exercises: [...draft.exercises, next] },
    });
  }, [base]);

  const removeExerciseFromDraft = useCallback((exerciseIndex: number) => {
    const draft = base.state.draft;
    if (!draft || draft.exercises.length <= 1) return;
    const exercises = draft.exercises.filter((_, index) => index !== exerciseIndex);
    const currentEx = Math.max(0, Math.min(draft.currentEx, exercises.length - 1));
    base.replaceState({ ...base.state, draft: { ...draft, exercises, currentEx } });
  }, [base]);

  const moveExerciseInDraft = useCallback((exerciseIndex: number, direction: -1 | 1) => {
    const draft = base.state.draft;
    if (!draft) return;
    const target = exerciseIndex + direction;
    if (target < 0 || target >= draft.exercises.length) return;
    const exercises = [...draft.exercises];
    [exercises[exerciseIndex], exercises[target]] = [exercises[target], exercises[exerciseIndex]];
    const currentEx = draft.currentEx === exerciseIndex
      ? target
      : draft.currentEx === target
        ? exerciseIndex
        : draft.currentEx;
    base.replaceState({ ...base.state, draft: { ...draft, exercises, currentEx } });
  }, [base]);

  const replaceExerciseInDraft = useCallback((
    exerciseIndex: number,
    exerciseId: ExerciseId,
    reason: ExercisePreferenceReason = "other",
    alwaysUse = false,
  ) => {
    const draft = base.state.draft;
    const currentEntry = draft?.exercises[exerciseIndex];
    if (!draft || !currentEntry) return;
    const exercisesById = allExercises(base.state.customExercises);
    const safety = findSafeSubstitution({
      exerciseId,
      equipment: base.state.profile.equipment,
      restrictions: base.state.profile.restrictions ?? [],
      exercises: exercisesById,
    });
    const replacement = safety.value;
    if (!replacement || replacement.id !== exerciseId) return;
    const prescription: ExercisePrescription = {
      id: `${currentEntry.target.prescriptionId ?? draft.dayId}:${replacement.id}:replacement`,
      exerciseId: replacement.id,
      order: exerciseIndex,
      setScheme: setSchemeFor(replacement, currentEntry.sets.length),
      restSeconds: currentEntry.target.rest,
      targetEffort: currentEntry.target.targetEffort ?? { mode: "simple", repsInReserve: 2 },
      progression: defaultProgression(replacement),
      coachingCue: replacement.technique,
      optional: exerciseIndex >= 5,
      priority: exerciseIndex < 2 ? "primary" : exerciseIndex < 5 ? "secondary" : "accessory",
    };
    const next = {
      ...makeDraftEntry(prescription, replacement, base.state.history),
      note: currentEntry.note,
      replacedExerciseId: currentEntry.replacedExerciseId ?? currentEntry.exerciseId,
      substitutionReason: reason,
    };
    const entries = draft.exercises.map((entry, index) => index === exerciseIndex ? next : entry);
    const preferences = alwaysUse
      ? applyPreferenceSignal(base.state.exercisePreferences ?? [], {
          type: "always-use",
          exerciseId,
          reason,
        })
      : base.state.exercisePreferences ?? [];
    base.replaceState({
      ...base.state,
      draft: { ...draft, exercises: entries },
      exercisePreferences: preferences,
    });
  }, [base]);

  const saveExercisePreference = useCallback((signal: PreferenceSignal) => {
    base.replaceState({
      ...base.state,
      exercisePreferences: applyPreferenceSignal(base.state.exercisePreferences ?? [], signal),
    });
  }, [base]);

  return {
    ...base,
    completeOnboarding,
    preparedWorkout,
    prepareWorkout,
    startWorkout: prepareWorkout,
    confirmReadiness,
    cancelPreparedWorkout,
    copyPreviousSet,
    insertWarmupSets,
    addExerciseToDraft,
    removeExerciseFromDraft,
    moveExerciseInDraft,
    replaceExerciseInDraft,
    swapExercise: (exerciseIndex: number, exerciseId: string) => replaceExerciseInDraft(exerciseIndex, exerciseId),
    saveExercisePreference,
  };
}
