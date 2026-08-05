import {
  allExercises,
  defaultProgression,
  phaseForWeek,
  programWeek,
  todayISO,
} from "../../data.js";
import { buildWorkoutEntries } from "../../domain/planning.js";
import { makeDraftEntry, uid } from "../../domain/training.js";
import type {
  AppState,
  DayId,
  Draft,
  ExerciseEntry,
  ExerciseId,
  ExercisePrescription,
  ProgramId,
  SetPrescription,
} from "../../types.js";
import type {
  CoachDecision,
  CoachReasonCode,
  ReadinessAdjustment,
  ReadinessInput,
} from "../coach/contracts.js";
import { adjustWorkoutForReadiness } from "../coach/readiness.js";

export type PreparedWorkout = {
  program: {
    id: ProgramId;
    name: string;
    version: number;
  };
  workout: {
    id: DayId;
    name: string;
  };
  prescriptions: ExercisePrescription[];
  replacementOrigins: Record<string, ExerciseId>;
  preparedAt: string;
};

export type ReadinessSnapshot = {
  input: ReadinessInput;
  reasonCode: CoachReasonCode;
  explanation: string;
  appliedReasonCodes: CoachReasonCode[];
  removedPrescriptionIds: string[];
  blockedPrescriptionIds: string[];
  changedSetCounts: ReadinessAdjustment["changedSetCounts"];
  changedEffortPrescriptionIds: string[];
  confirmedAt: string;
};

export type GuidedDraft = Draft & {
  readiness: ReadinessSnapshot;
};

const setSchemeFromEntry = (entry: ExerciseEntry): SetPrescription[] => {
  const mode = entry.snapshot.trackingMode;
  return entry.sets.map((set) => {
    if (mode === "duration") {
      return { kind: set.kind, targetSeconds: { min: entry.target.min, max: entry.target.max } };
    }
    if (mode === "distance") {
      return { kind: set.kind, targetDistanceMeters: { min: entry.target.min, max: entry.target.max } };
    }
    return { kind: set.kind, targetReps: { min: entry.target.min, max: entry.target.max } };
  });
};

const prescriptionFromEntry = (
  entry: ExerciseEntry,
  order: number,
  state: AppState,
): ExercisePrescription | null => {
  const exercise = allExercises(state.customExercises)[entry.exerciseId];
  if (!exercise) return null;
  return {
    id: entry.target.prescriptionId ?? `${entry.exerciseId}:${order}:prepared`,
    exerciseId: entry.exerciseId,
    order,
    setScheme: setSchemeFromEntry(entry),
    restSeconds: entry.target.rest,
    targetEffort: entry.target.targetEffort ?? { mode: "rpe", value: entry.target.targetRpe },
    progression: entry.target.progression ?? defaultProgression(exercise),
    coachingCue: exercise.technique,
    optional: order >= 5,
    priority: order < 2 ? "primary" : order < 5 ? "secondary" : "accessory",
  };
};

export const prepareWorkoutFromState = (
  state: AppState,
  dayId: DayId,
): PreparedWorkout | null => {
  if (state.draft) return null;
  const progress = state.programProgress[state.settings.programId] ?? {
    startedAt: todayISO(),
    currentWeek: 1,
    autoDeload: true,
  };
  const targetRpe = phaseForWeek(programWeek(progress.startedAt)).targetRpe;
  const planned = buildWorkoutEntries({
    programId: state.settings.programId,
    dayId,
    customPrograms: state.customPrograms,
    customExercises: state.customExercises,
    profile: state.profile,
    history: state.history,
    targetRpe,
  });
  if (!planned || !planned.entries.length) return null;

  const prescriptions = planned.entries.flatMap((entry, order): ExercisePrescription[] => {
    const prescription = prescriptionFromEntry(entry, order, state);
    return prescription ? [prescription] : [];
  });
  if (!prescriptions.length) return null;

  return {
    program: planned.program,
    workout: { id: planned.workout.id, name: planned.workout.name },
    prescriptions,
    replacementOrigins: Object.fromEntries(
      planned.entries.flatMap((entry) => entry.replacedExerciseId && entry.target.prescriptionId
        ? [[entry.target.prescriptionId, entry.replacedExerciseId]]
        : []),
    ),
    preparedAt: new Date().toISOString(),
  };
};

export const createDraftAfterReadiness = (
  state: AppState,
  prepared: PreparedWorkout,
  input: ReadinessInput,
): {
  draft: GuidedDraft | null;
  adjustment: CoachDecision<ReadinessAdjustment>;
} => {
  const adjustment = adjustWorkoutForReadiness(prepared.prescriptions, input);
  if (!adjustment.value.allowStart) return { draft: null, adjustment };

  const exercisesById = allExercises(state.customExercises);
  const entries = adjustment.value.prescriptions.flatMap((prescription): ExerciseEntry[] => {
    const exercise = exercisesById[prescription.exerciseId];
    if (!exercise) return [];
    const entry = makeDraftEntry(prescription, exercise, state.history);
    return [{
      ...entry,
      replacedExerciseId: prepared.replacementOrigins[prescription.id],
    }];
  });
  if (!entries.length) return { draft: null, adjustment };

  const readiness: ReadinessSnapshot = {
    input,
    reasonCode: adjustment.reasonCode,
    explanation: adjustment.explanation,
    appliedReasonCodes: adjustment.value.appliedReasonCodes,
    removedPrescriptionIds: adjustment.value.removedPrescriptionIds,
    blockedPrescriptionIds: adjustment.value.blockedPrescriptionIds,
    changedSetCounts: adjustment.value.changedSetCounts,
    changedEffortPrescriptionIds: adjustment.value.changedEffortPrescriptionIds,
    confirmedAt: new Date().toISOString(),
  };

  const draft: GuidedDraft = {
    id: uid(),
    programId: prepared.program.id,
    programSnapshot: {
      id: prepared.program.id,
      name: prepared.program.name,
      version: prepared.program.version,
      dayId: prepared.workout.id,
      workoutName: prepared.workout.name,
    },
    dayId: prepared.workout.id,
    startedAt: new Date().toISOString(),
    currentEx: 0,
    exercises: entries,
    note: "",
    weeklyGoalAtStart: state.settings.weeklyGoal,
    readiness,
  };

  return { draft, adjustment };
};
