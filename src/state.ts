import { useCallback, useEffect, useMemo, useState } from "react";
import {
  allExercises,
  availableExerciseIds,
  getProgram,
  getWorkout,
  phaseForWeek,
  programWeek,
  recommendProgramForProfile,
  todayISO,
} from "./data.js";
import {
  defaultState,
  loadState,
  normalizeState,
  STORAGE_KEY,
} from "./domain/storage.js";
import {
  autofillSetsFromHistory,
  isCompletableSet,
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
  ProgramId,
  ProgramSwitchOptions,
  Session,
  SessionFeedback,
  SetEntry,
  SetKind,
  Settings,
  SyncConfig,
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
});

const feedbackValue = (value: number): 1 | 2 | 3 | 4 | 5 =>
  Math.max(1, Math.min(5, Math.round(value))) as 1 | 2 | 3 | 4 | 5;

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
      const program = getProgram(current.settings.programId, current.customPrograms);
      const workout = getWorkout(program.id, dayId, current.customPrograms);
      if (!workout) return current;
      const exercises = allExercises(current.customExercises);
      const allowed = new Set(availableExerciseIds(current.profile, current.customExercises));
      const progress = current.programProgress[program.id] ?? { startedAt: todayISO(), currentWeek: 1, autoDeload: true };
      const targetRpe = phaseForWeek(programWeek(progress.startedAt)).targetRpe;

      const priority = new Set(current.profile.priorityMuscles);
      const head = workout.exercises.slice(0, 2);
      const tail = workout.exercises.slice(2).sort((a, b) => Number(priority.has(exercises[b]?.primary)) - Number(priority.has(exercises[a]?.primary)));
      const maxExercises = current.profile.sessionMinutes <= 40 ? 5 : current.profile.sessionMinutes <= 60 ? 6 : current.profile.sessionMinutes <= 75 ? 7 : 8;
      const personalizedIds = [...head, ...tail].slice(0, maxExercises);
      const strengthCompounds = new Set(["back_squat", "barbell_bench", "barbell_rdl", "db_ohp", "pull_up", "leg_press"]);

      const entries: ExerciseEntry[] = personalizedIds.flatMap((originalId) => {
        const original = exercises[originalId];
        if (!original) return [];
        const chosenId = allowed.has(originalId)
          ? originalId
          : original.alternatives.find((alternative) => allowed.has(alternative)) ?? originalId;
        const exercise = exercises[chosenId] ?? original;
        const strengthMode = current.profile.goal === "strength" && strengthCompounds.has(exercise.id);
        const generalMode = current.profile.goal === "general" || current.profile.goal === "fat-loss";
        const experienceAdjustment = current.profile.experience === "beginner" ? -1 : 0;
        const targetSets = Math.max(2, (strengthMode ? Math.max(3, exercise.sets + 1) : generalMode ? Math.min(3, exercise.sets) : exercise.sets) + experienceAdjustment);
        const targetMin = strengthMode ? 3 : generalMode ? Math.max(8, exercise.min) : exercise.min;
        const targetMax = strengthMode ? 6 : generalMode ? Math.max(12, exercise.max) : exercise.max;
        const targetRest = strengthMode ? Math.max(150, exercise.rest) : generalMode ? Math.min(90, exercise.rest) : exercise.rest;
        const personalizedExercise = { ...exercise, sets: targetSets, min: targetMin, max: targetMax, rest: targetRest };
        return [{
          exerciseId: exercise.id,
          replacedExerciseId: chosenId !== originalId ? originalId : undefined,
          snapshot: snapshotExercise(exercise),
          target: {
            sets: targetSets,
            min: targetMin,
            max: targetMax,
            rest: targetRest,
            targetRpe,
          },
          sets: autofillSetsFromHistory(current.history, personalizedExercise, targetSets, targetRpe),
          note: "",
        }];
      });
      if (!entries.length) return current;

      return touch({
        ...current,
        draft: {
          id: uid(),
          programId: program.id,
          programSnapshot: {
            id: program.id,
            name: program.name,
            version: program.version,
            dayId: workout.id,
            workoutName: workout.name,
          },
          dayId: workout.id,
          startedAt: new Date().toISOString(),
          currentEx: 0,
          exercises: entries,
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
      const exercises = current.draft.exercises.map((entry, index) => index === exerciseIndex
        ? { ...entry, sets: entry.sets.map((set, index2) => index2 === setIndex ? { ...set, ...patch } : set) }
        : entry);
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
      const live = current.draft.exercises[exerciseIndex]?.sets[setIndex];
      if (!live || live.done || !isCompletableSet(live)) return current;
      const exercises = current.draft.exercises.map((exercise, index) => index === exerciseIndex
        ? { ...exercise, sets: exercise.sets.map((item, index2) => index2 === setIndex ? { ...item, done: true } : item) }
        : exercise);
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
      const exercises = current.draft.exercises.map((entry, index) => index === exerciseIndex
        ? { ...entry, sets: [...entry.sets, { id: uid(), kind, weight: entry.sets.at(-1)?.weight ?? "", reps: "", rpe: "", done: false }] }
        : entry);
      return touch({ ...current, draft: { ...current.draft, exercises } });
    });
  }, []);

  const removeSet = useCallback((exerciseIndex: number, setIndex?: number) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises.map((entry, index) => {
        if (index !== exerciseIndex || entry.sets.length <= 1) return entry;
        const target = setIndex ?? entry.sets.length - 1;
        return { ...entry, sets: entry.sets.filter((_, setPosition) => setPosition !== target) };
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
      const exercises = current.draft.exercises.map((item, index) => index === exerciseIndex
        ? {
          ...item,
          sets: item.sets.map((set, position) => position === setIndex
            ? { ...set, weight: previous.weight, reps: previous.reps, rpe: previous.rpe }
            : set),
        }
        : item);
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
      const replacementEntry: ExerciseEntry = {
        exerciseId: replacement.id,
        replacedExerciseId: currentEntry.replacedExerciseId ?? currentEntry.exerciseId,
        snapshot: snapshotExercise(replacement),
        target: {
          sets: replacement.sets,
          min: replacement.min,
          max: replacement.max,
          rest: replacement.rest,
          targetRpe: currentEntry.target.targetRpe,
        },
        sets: autofillSetsFromHistory(current.history, replacement, replacement.sets, currentEntry.target.targetRpe),
        note: currentEntry.note,
      };
      const entries = current.draft.exercises.map((entry, index) => index === exerciseIndex ? replacementEntry : entry);
      return touch({ ...current, draft: { ...current.draft, exercises: entries } });
    });
  }, []);

  const finishWorkout = useCallback((feedback?: SessionFeedback) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises
        .map((entry) => ({ ...entry, sets: entry.sets.filter((set) => set.done) }))
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
