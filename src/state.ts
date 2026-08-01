import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_PROGRAM_ID, EXERCISES, getProgram, getWorkout, isCompletableSet, isProgramId, phaseForWeek, programWeek, todayISO } from "./data";
import type { AppState, BodyStat, DayId, Draft, ProgramId, Session, SetEntry, Settings, ThemePreference } from "./types";

const STORAGE_KEY = "liftpath-personal-v2";
const LEGACY_KEY = "liftpath-min-v1";
const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);
const themeValues: ThemePreference[] = ["system", "light", "dark"];

export const defaultState = (): AppState => ({
  settings: {
    startDate: todayISO(),
    sound: true,
    vibration: true,
    notify: false,
    scheduleReminders: false,
    weeklyGoal: 3,
    trainingDays: [1, 3, 5],
    reminderTime: "18:30",
    programId: DEFAULT_PROGRAM_ID,
    theme: "system",
  },
  draft: null,
  history: [],
  bodyStats: [],
});

const validTheme = (value: unknown): value is ThemePreference => typeof value === "string" && themeValues.includes(value as ThemePreference);

const normalizeSettings = (value: Partial<Settings> | undefined): Settings => {
  const defaults = defaultState().settings;
  const merged = { ...defaults, ...(value ?? {}) } as Settings;
  const programId = isProgramId(merged.programId) ? merged.programId : DEFAULT_PROGRAM_ID;
  const program = getProgram(programId);
  const trainingDays = Array.isArray(merged.trainingDays)
    ? [...new Set(merged.trainingDays)].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : program.recommendedDays;
  return {
    startDate: typeof merged.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(merged.startDate) ? merged.startDate : defaults.startDate,
    sound: typeof merged.sound === "boolean" ? merged.sound : true,
    vibration: typeof merged.vibration === "boolean" ? merged.vibration : true,
    notify: typeof merged.notify === "boolean" ? merged.notify : false,
    scheduleReminders: typeof merged.scheduleReminders === "boolean" ? merged.scheduleReminders : false,
    weeklyGoal: Math.max(1, Math.min(7, Math.round(Number(merged.weeklyGoal) || program.daysPerWeek))),
    trainingDays: trainingDays.length ? trainingDays : program.recommendedDays,
    reminderTime: typeof merged.reminderTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(merged.reminderTime) ? merged.reminderTime : "18:30",
    programId,
    theme: validTheme(merged.theme) ? merged.theme : "system",
  };
};

const loadState = (): AppState => {
  const defaults = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      settings: normalizeSettings(parsed.settings),
      draft: parsed.draft && Array.isArray(parsed.draft.exercises) ? parsed.draft : null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      bodyStats: Array.isArray(parsed.bodyStats) ? parsed.bodyStats : [],
    };
  } catch {
    return defaults;
  }
};

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in private browsing.
    }
  }, [state]);

  const week = useMemo(() => programWeek(state.settings.startDate), [state.settings.startDate]);
  const phase = phaseForWeek(week);
  const setSettings = useCallback((settings: Settings) => setState((current) => ({ ...current, settings: normalizeSettings(settings) })), []);

  const selectProgram = useCallback((programId: ProgramId) => {
    const program = getProgram(programId);
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        programId,
        weeklyGoal: program.daysPerWeek,
        trainingDays: [...program.recommendedDays],
      },
    }));
  }, []);

  const startWorkout = useCallback((dayId: DayId) => {
    setState((current) => {
      const programId = current.settings.programId;
      const workout = getWorkout(programId, dayId);
      if (!workout) return current;
      const currentWeek = programWeek(current.settings.startDate);
      const deload = phaseForWeek(currentWeek).deload;
      const draft: Draft = {
        id: uid(),
        programId,
        dayId,
        startedAt: new Date().toISOString(),
        currentEx: 0,
        exercises: workout.exercises.map((exerciseId) => {
          const meta = EXERCISES[exerciseId];
          const count = deload ? Math.max(1, Math.round(meta.sets * 0.5)) : meta.sets;
          return {
            exerciseId,
            note: "",
            sets: Array.from({ length: count }, () => ({ weight: "", reps: "", rpe: "", done: false })),
          };
        }),
      };
      return { ...current, draft };
    });
  }, []);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, patch: Partial<SetEntry>) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises.map((entry, index) => index === exerciseIndex
        ? { ...entry, sets: entry.sets.map((set, index2) => index2 === setIndex ? { ...set, ...patch } : set) }
        : entry);
      return { ...current, draft: { ...current.draft, exercises } };
    });
  }, []);

  const completeSet = useCallback((exerciseIndex: number, setIndex: number): number | null => {
    const entry = state.draft?.exercises[exerciseIndex];
    const set = entry?.sets[setIndex];
    if (!entry || !set || set.done || !isCompletableSet(set)) return null;
    const rest = EXERCISES[entry.exerciseId]?.rest ?? null;
    setState((current) => {
      if (!current.draft) return current;
      const liveEntry = current.draft.exercises[exerciseIndex];
      const liveSet = liveEntry?.sets[setIndex];
      if (!liveEntry || !liveSet || liveSet.done || !isCompletableSet(liveSet)) return current;
      const exercises = current.draft.exercises.map((exercise, index) => index === exerciseIndex
        ? { ...exercise, sets: exercise.sets.map((item, index2) => index2 === setIndex ? { ...item, done: true } : item) }
        : exercise);
      return { ...current, draft: { ...current.draft, exercises } };
    });
    return rest;
  }, [state.draft]);

  const setCurrentExercise = useCallback((index: number) => {
    setState((current) => current.draft
      ? { ...current, draft: { ...current.draft, currentEx: Math.max(0, Math.min(index, current.draft.exercises.length - 1)) } }
      : current);
  }, []);

  const addSet = useCallback((exerciseIndex: number) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises.map((entry, index) => index === exerciseIndex
        ? { ...entry, sets: [...entry.sets, { weight: entry.sets.at(-1)?.weight ?? "", reps: "", rpe: "", done: false }] }
        : entry);
      return { ...current, draft: { ...current.draft, exercises } };
    });
  }, []);

  const removeSet = useCallback((exerciseIndex: number) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises.map((entry, index) => index === exerciseIndex && entry.sets.length > 1
        ? { ...entry, sets: entry.sets.slice(0, -1) }
        : entry);
      return { ...current, draft: { ...current.draft, exercises } };
    });
  }, []);

  const finishWorkout = useCallback(() => {
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
        programId: current.draft.programId ?? current.settings.programId,
        dayId: current.draft.dayId,
        startedAt: current.draft.startedAt,
        endedAt: new Date().toISOString(),
        totalSets: allSets.length,
        avgRpe: rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : null,
        exercises,
      };
      return { ...current, draft: null, history: [session, ...current.history] };
    });
  }, []);

  const cancelWorkout = useCallback(() => setState((current) => ({ ...current, draft: null })), []);
  const deleteSession = useCallback((id: string) => setState((current) => ({ ...current, history: current.history.filter((session) => session.id !== id) })), []);
  const addBodyStat = useCallback((entry: Omit<BodyStat, "id">) => setState((current) => ({ ...current, bodyStats: [{ id: uid(), ...entry }, ...current.bodyStats.filter((item) => item.date !== entry.date)] })), []);
  const deleteBodyStat = useCallback((id: string) => setState((current) => ({ ...current, bodyStats: current.bodyStats.filter((entry) => entry.id !== id) })), []);

  return {
    state,
    week,
    phase,
    setSettings,
    selectProgram,
    startWorkout,
    updateSet,
    completeSet,
    setCurrentExercise,
    addSet,
    removeSet,
    finishWorkout,
    cancelWorkout,
    deleteSession,
    addBodyStat,
    deleteBodyStat,
  };
}
