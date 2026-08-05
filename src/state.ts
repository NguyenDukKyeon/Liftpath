import { useCallback, useEffect, useMemo, useState } from "react";
import {
  allExercises,
  defaultProgression,
  getProgram,
  phaseForWeek,
  programWeek,
  recommendProgramForProfile,
  todayISO,
} from "./data.js";
import { buildWorkoutEntries } from "./domain/planning.js";
import {
  defaultState,
  loadState,
  normalizeState,
  STORAGE_KEY,
} from "./domain/storage.js";
import {
  isCompletableSet,
  makeDraftEntry,
  makeRecap,
  uid,
  weeklyReview,
} from "./domain/training.js";
import type {
  AppState,
  BodyStat,
  DayId,
  Exercise,
  ExerciseEntry,
  ExercisePrescription,
  LoggedSet,
  ProgramId,
  ProgramSwitchOptions,
  Session,
  SessionFeedback,
  SetEntry,
  SetKind,
  Settings,
  SyncConfig,
  TrackingMode,
  TrainingProgram,
  UserProfile,
} from "./types.js";

const touch = (state: AppState): AppState => ({ ...state, updatedAt: new Date().toISOString() });

const snapshotExercise = (exercise: Exercise) => ({
  id: exercise.id,
  name: exercise.name,
  primary: exercise.primary,
  secondary: exercise.secondary,
  equipment: exercise.equipment,
  suffix: exercise.suffix,
  incrementKg: exercise.incrementKg,
  trackingMode: exercise.trackingMode,
  movementPattern: exercise.movementPattern,
  unilateral: exercise.unilateral,
});

const feedbackValue = (value: number): 1 | 2 | 3 | 4 | 5 =>
  Math.max(1, Math.min(5, Math.round(value))) as 1 | 2 | 3 | 4 | 5;

const numericOrNull = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const trackingModeForEntry = (entry: ExerciseEntry): TrackingMode => {
  if (entry.snapshot.trackingMode) return entry.snapshot.trackingMode;
  if (entry.snapshot.suffix === "seconds") return "duration";
  if (entry.snapshot.incrementKg === 0) return "bodyweight-reps";
  return "weight-reps";
};

const loggedEffort = (rpe: string): LoggedSet["effort"] => {
  const value = numericOrNull(rpe);
  return value != null && value >= 1 && value <= 10 ? { mode: "rpe", value } : null;
};

const loggedFromLegacy = (set: SetEntry, mode: TrackingMode): LoggedSet => {
  const base = { id: set.id, kind: set.kind, effort: loggedEffort(set.rpe), done: set.done };
  const reps = numericOrNull(set.reps);
  const weight = numericOrNull(set.weight);
  if (mode === "duration") return { ...base, trackingMode: "duration", seconds: reps };
  if (mode === "distance") return { ...base, trackingMode: "distance", distanceMeters: reps };
  if (mode === "bodyweight-reps") return { ...base, trackingMode: "bodyweight-reps", reps };
  if (mode === "assisted-reps") return { ...base, trackingMode: "assisted-reps", assistanceKg: weight, reps };
  if (mode === "weighted-bodyweight-reps") return { ...base, trackingMode: "weighted-bodyweight-reps", addedWeightKg: weight, reps };
  return { ...base, trackingMode: "weight-reps", weightKg: weight, reps };
};

const withSynchronizedSets = (entry: ExerciseEntry, sets: SetEntry[]): ExerciseEntry => ({
  ...entry,
  sets,
  loggedSets: sets.map((set) => loggedFromLegacy(set, trackingModeForEntry(entry))),
});

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The app remains usable when storage is unavailable, but data is not persistent.
    }
  }, [state]);

  const currentProgram = useMemo(
    () => getProgram(state.settings.programId, state.customPrograms),
    [state.customPrograms, state.settings.programId],
  );
  const currentProgress = state.programProgress[state.settings.programId] ?? {
    startedAt: todayISO(),
    currentWeek: 1,
    autoDeload: true,
  };
  const week = programWeek(currentProgress.startedAt);
  const phase = phaseForWeek(week);
  const review = useMemo(() => weeklyReview(state), [state]);

  const replaceState = useCallback((next: AppState) => setState(touch(normalizeState(next))), []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((current) => touch({ ...current, settings: { ...current.settings, ...patch } }));
  }, []);

  const completeOnboarding = useCallback((profile: UserProfile) => {
    const programId = recommendProgramForProfile(profile);
    const program = getProgram(programId);
    setState((current) => touch({
      ...current,
      profile: { ...profile, onboardingComplete: true },
      settings: {
        ...current.settings,
        programId,
        weeklyGoal: program.daysPerWeek,
        trainingDays: [...program.recommendedDays],
      },
      programProgress: {
        ...current.programProgress,
        [programId]: { startedAt: todayISO(), currentWeek: 1, autoDeload: true },
      },
    }));
  }, []);

  const switchProgram = useCallback((programId: ProgramId, options: ProgramSwitchOptions) => {
    setState((current) => {
      const program = getProgram(programId, current.customPrograms);
      const existingProgress = current.programProgress[programId];
      return touch({
        ...current,
        settings: {
          ...current.settings,
          programId,
          weeklyGoal: program.daysPerWeek,
          trainingDays: options.keepSchedule ? current.settings.trainingDays : [...program.recommendedDays],
        },
        programProgress: {
          ...current.programProgress,
          [programId]: options.resetCycle || !existingProgress
            ? { startedAt: todayISO(), currentWeek: 1, autoDeload: true }
            : existingProgress,
        },
      });
    });
  }, []);

  const updateProgramProgress = useCallback((programId: ProgramId, patch: Partial<AppState["programProgress"][string]>) => {
    setState((current) => touch({
      ...current,
      programProgress: {
        ...current.programProgress,
        [programId]: {
          ...(current.programProgress[programId] ?? { startedAt: todayISO(), currentWeek: 1, autoDeload: true }),
          ...patch,
        },
      },
    }));
  }, []);

  const startWorkout = useCallback((dayId: DayId) => {
    setState((current) => {
      if (current.draft) return current;
      const progress = current.programProgress[current.settings.programId] ?? {
        startedAt: todayISO(),
        currentWeek: 1,
        autoDeload: true,
      };
      const targetRpe = phaseForWeek(programWeek(progress.startedAt)).targetRpe;
      const planned = buildWorkoutEntries({
        programId: current.settings.programId,
        dayId,
        customPrograms: current.customPrograms,
        customExercises: current.customExercises,
        profile: current.profile,
        history: current.history,
        targetRpe,
      });
      if (!planned || !planned.entries.length) return current;

      return touch({
        ...current,
        draft: {
          id: uid(),
          programId: planned.program.id,
          programSnapshot: {
            id: planned.program.id,
            name: planned.program.name,
            version: planned.program.version,
            dayId: planned.workout.id,
            workoutName: planned.workout.name,
          },
          dayId: planned.workout.id,
          startedAt: new Date().toISOString(),
          currentEx: 0,
          exercises: planned.entries,
          note: "",
          weeklyGoalAtStart: current.settings.weeklyGoal,
        },
        lastRecap: null,
      });
    });
  }, []);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, patch: Partial<SetEntry>) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises.map((entry, index) => {
        if (index !== exerciseIndex) return entry;
        const sets = entry.sets.map((set, index2) => index2 === setIndex ? { ...set, ...patch } : set);
        return withSynchronizedSets(entry, sets);
      });
      return touch({ ...current, draft: { ...current.draft, exercises } });
    });
  }, []);

  const completeSet = useCallback((exerciseIndex: number, setIndex: number): number | null => {
    const entry = state.draft?.exercises[exerciseIndex];
    const set = entry?.sets[setIndex];
    if (!entry || !set || set.done || !isCompletableSet(set)) return null;
    const rest = entry.target.rest;
    setState((current) => {
      if (!current.draft) return current;
      const liveEntry = current.draft.exercises[exerciseIndex];
      const live = liveEntry?.sets[setIndex];
      if (!liveEntry || !live || live.done || !isCompletableSet(live)) return current;
      const exercises = current.draft.exercises.map((exercise, index) => {
        if (index !== exerciseIndex) return exercise;
        const sets = exercise.sets.map((item, index2) => index2 === setIndex ? { ...item, done: true } : item);
        return withSynchronizedSets(exercise, sets);
      });
      return touch({ ...current, draft: { ...current.draft, exercises } });
    });
    return rest;
  }, [state.draft]);

  const undoSet = useCallback((exerciseIndex: number, setIndex: number) => {
    updateSet(exerciseIndex, setIndex, { done: false });
  }, [updateSet]);

  const setCurrentExercise = useCallback((index: number) => {
    setState((current) => current.draft
      ? touch({ ...current, draft: { ...current.draft, currentEx: Math.max(0, Math.min(index, current.draft.exercises.length - 1)) } })
      : current);
  }, []);

  const addSet = useCallback((exerciseIndex: number, kind: SetKind = "working") => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises.map((entry, index) => {
        if (index !== exerciseIndex) return entry;
        const nextSet: SetEntry = {
          id: uid(),
          kind,
          weight: entry.sets.at(-1)?.weight ?? "",
          reps: "",
          rpe: "",
          done: false,
        };
        return withSynchronizedSets(entry, [...entry.sets, nextSet]);
      });
      return touch({ ...current, draft: { ...current.draft, exercises } });
    });
  }, []);

  const removeSet = useCallback((exerciseIndex: number, setIndex?: number) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises.map((entry, index) => {
        if (index !== exerciseIndex || entry.sets.length <= 1) return entry;
        const target = setIndex ?? entry.sets.length - 1;
        return withSynchronizedSets(entry, entry.sets.filter((_, setPosition) => setPosition !== target));
      });
      return touch({ ...current, draft: { ...current.draft, exercises } });
    });
  }, []);

  const copyPreviousSet = useCallback((exerciseIndex: number, setIndex: number) => {
    setState((current) => {
      if (!current.draft) return current;
      const entry = current.draft.exercises[exerciseIndex];
      const previous = entry?.sets[setIndex - 1];
      if (!entry || !previous || entry.sets[setIndex]?.done) return current;
      const exercises = current.draft.exercises.map((item, index) => {
        if (index !== exerciseIndex) return item;
        const sets = item.sets.map((set, position) => position === setIndex
          ? { ...set, weight: previous.weight, reps: previous.reps, rpe: previous.rpe }
          : set);
        return withSynchronizedSets(item, sets);
      });
      return touch({ ...current, draft: { ...current.draft, exercises } });
    });
  }, []);

  const updateExerciseNote = useCallback((exerciseIndex: number, note: string) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises.map((entry, index) => index === exerciseIndex ? { ...entry, note: note.slice(0, 1000) } : entry);
      return touch({ ...current, draft: { ...current.draft, exercises } });
    });
  }, []);

  const updateWorkoutNote = useCallback((note: string) => {
    setState((current) => current.draft ? touch({ ...current, draft: { ...current.draft, note: note.slice(0, 2000) } }) : current);
  }, []);

  const swapExercise = useCallback((exerciseIndex: number, exerciseId: string) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercisesById = allExercises(current.customExercises);
      const replacement = exercisesById[exerciseId];
      const currentEntry = current.draft.exercises[exerciseIndex];
      if (!replacement || !currentEntry) return current;
      const setScheme = currentEntry.sets.map((set) => replacement.trackingMode === "duration"
        ? { kind: set.kind, targetSeconds: { min: replacement.min, max: replacement.max } }
        : replacement.trackingMode === "distance"
          ? { kind: set.kind, targetDistanceMeters: { min: replacement.min, max: replacement.max } }
          : { kind: set.kind, targetReps: { min: replacement.min, max: replacement.max } });
      const prescription: ExercisePrescription = {
        id: `${current.draft.dayId}:${replacement.id}:${exerciseIndex}:swap`,
        exerciseId: replacement.id,
        order: exerciseIndex,
        setScheme,
        restSeconds: replacement.rest,
        targetEffort: currentEntry.target.targetEffort ?? { mode: "rpe", value: currentEntry.target.targetRpe },
        progression: defaultProgression(replacement),
        coachingCue: replacement.technique,
        optional: false,
        priority: exerciseIndex < 2 ? "primary" : "secondary",
      };
      const replacementEntry = makeDraftEntry(prescription, replacement, current.history);
      const entries = current.draft.exercises.map((entry, index) => index === exerciseIndex ? {
        ...replacementEntry,
        replacedExerciseId: currentEntry.replacedExerciseId ?? currentEntry.exerciseId,
        note: currentEntry.note,
      } : entry);
      return touch({ ...current, draft: { ...current.draft, exercises: entries } });
    });
  }, []);

  const finishWorkout = useCallback((feedback?: SessionFeedback) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises
        .map((entry) => {
          const completedIndexes = entry.sets.flatMap((set, index) => set.done ? [index] : []);
          return {
            ...entry,
            sets: completedIndexes.map((index) => entry.sets[index]),
            loggedSets: entry.loggedSets
              ? completedIndexes.flatMap((index) => entry.loggedSets?.[index] ? [entry.loggedSets[index]] : [])
              : undefined,
          };
        })
        .filter((entry) => entry.sets.length > 0);
      const allSets = exercises.flatMap((entry) => entry.sets);
      if (!allSets.length) return current;
      const rpes = allSets.map((set) => Number(set.rpe)).filter((value) => Number.isFinite(value) && value > 0);
      const session: Session = {
        id: current.draft.id,
        programId: current.draft.programId,
        programSnapshot: current.draft.programSnapshot,
        dayId: current.draft.dayId,
        startedAt: current.draft.startedAt,
        endedAt: new Date().toISOString(),
        totalSets: allSets.length,
        avgRpe: rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : null,
        exercises,
        note: current.draft.note,
        weeklyGoalAtCompletion: current.draft.weeklyGoalAtStart,
        feedback: feedback ? {
          energy: feedbackValue(feedback.energy),
          soreness: feedbackValue(feedback.soreness),
          note: feedback.note.slice(0, 1000),
        } : undefined,
      };
      const recap = makeRecap(session, current.history);
      const progress = current.programProgress[session.programId] ?? { startedAt: todayISO(), currentWeek: 1, autoDeload: true };
      return touch({
        ...current,
        draft: null,
        history: [session, ...current.history],
        lastRecap: recap,
        programProgress: {
          ...current.programProgress,
          [session.programId]: { ...progress, currentWeek: programWeek(progress.startedAt) },
        },
      });
    });
  }, []);

  const cancelWorkout = useCallback(() => setState((current) => touch({ ...current, draft: null })), []);
  const dismissRecap = useCallback(() => setState((current) => touch({ ...current, lastRecap: null })), []);

  const deleteSession = useCallback((id: string) => setState((current) => touch({
    ...current,
    history: current.history.filter((session) => session.id !== id),
  })), []);

  const addBodyStat = useCallback((entry: Omit<BodyStat, "id">) => setState((current) => touch({
    ...current,
    bodyStats: [{ id: uid(), ...entry }, ...current.bodyStats.filter((item) => item.date !== entry.date)],
  })), []);
  const deleteBodyStat = useCallback((id: string) => setState((current) => touch({
    ...current,
    bodyStats: current.bodyStats.filter((entry) => entry.id !== id),
  })), []);

  const addCustomExercise = useCallback((exercise: Exercise) => {
    setState((current) => touch({
      ...current,
      customExercises: [...current.customExercises.filter((item) => item.id !== exercise.id), { ...exercise, custom: true }],
    }));
  }, []);

  const addCustomProgram = useCallback((program: TrainingProgram) => {
    setState((current) => touch({
      ...current,
      customPrograms: [...current.customPrograms.filter((item) => item.id !== program.id), { ...program, custom: true }],
      programProgress: {
        ...current.programProgress,
        [program.id]: current.programProgress[program.id] ?? { startedAt: todayISO(), currentWeek: 1, autoDeload: true },
      },
    }));
  }, []);

  const deleteCustomProgram = useCallback((programId: ProgramId) => {
    setState((current) => {
      const nextProgramId = current.settings.programId === programId ? "full-body-3" : current.settings.programId;
      return touch({
        ...current,
        customPrograms: current.customPrograms.filter((program) => program.id !== programId),
        settings: { ...current.settings, programId: nextProgramId },
      });
    });
  }, []);

  const updateSync = useCallback((patch: Partial<SyncConfig>) => setState((current) => touch({
    ...current,
    sync: { ...current.sync, ...patch },
  })), []);

  const markBackup = useCallback(() => updateSettings({ lastBackupAt: new Date().toISOString() }), [updateSettings]);

  const resetAll = useCallback(() => setState(defaultState()), []);

  return {
    state,
    currentProgram,
    currentProgress,
    week,
    phase,
    review,
    replaceState,
    updateSettings,
    completeOnboarding,
    switchProgram,
    updateProgramProgress,
    startWorkout,
    updateSet,
    completeSet,
    undoSet,
    setCurrentExercise,
    addSet,
    removeSet,
    copyPreviousSet,
    updateExerciseNote,
    updateWorkoutNote,
    swapExercise,
    finishWorkout,
    cancelWorkout,
    dismissRecap,
    deleteSession,
    addBodyStat,
    deleteBodyStat,
    addCustomExercise,
    addCustomProgram,
    deleteCustomProgram,
    updateSync,
    markBackup,
    resetAll,
  };
}
