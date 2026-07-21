import { useCallback, useEffect, useMemo, useState } from "react";
import { EXERCISES, PROGRAM, isCompletableSet, phaseForWeek, programWeek, todayISO } from "./data";
import type { AppState, BodyStat, DayId, Draft, Session, SetEntry, Settings } from "./types";

const STORAGE_KEY = "liftpath-personal-v2";
const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);

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
  },
  draft: null,
  history: [],
  bodyStats: [],
});

const loadState = (): AppState => {
  const defaults = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("liftpath-min-v1");
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const settings = { ...defaults.settings, ...(parsed.settings ?? {}) } as Settings;
    const trainingDays = Array.isArray(settings.trainingDays)
      ? [...new Set(settings.trainingDays)].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : defaults.settings.trainingDays;
    return {
      settings: {
        startDate: typeof settings.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(settings.startDate) ? settings.startDate : defaults.settings.startDate,
        sound: typeof settings.sound === "boolean" ? settings.sound : true,
        vibration: typeof settings.vibration === "boolean" ? settings.vibration : true,
        notify: typeof settings.notify === "boolean" ? settings.notify : false,
        scheduleReminders: typeof settings.scheduleReminders === "boolean" ? settings.scheduleReminders : false,
        weeklyGoal: Math.max(1, Math.min(7, Math.round(Number(settings.weeklyGoal) || 3))),
        trainingDays,
        reminderTime: typeof settings.reminderTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.reminderTime) ? settings.reminderTime : "18:30",
      },
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
  const setSettings = useCallback((settings: Settings) => setState((current) => ({ ...current, settings })), []);

  const startWorkout = useCallback((dayId: DayId) => {
    const day = PROGRAM.find((item) => item.id === dayId);
    if (!day) return;
    setState((current) => {
      const currentWeek = programWeek(current.settings.startDate);
      const deload = phaseForWeek(currentWeek).deload;
      const draft: Draft = {
        id: uid(),
        dayId,
        startedAt: new Date().toISOString(),
        currentEx: 0,
        exercises: day.exercises.map((exerciseId) => {
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
      const exercises = current.draft.exercises.map((entry, index) =>
        index === exerciseIndex
          ? { ...entry, sets: entry.sets.map((set, index2) => (index2 === setIndex ? { ...set, ...patch } : set)) }
          : entry,
      );
      return { ...current, draft: { ...current.draft, exercises } };
    });
  }, []);

  const completeSet = useCallback(
    (exerciseIndex: number, setIndex: number): number | null => {
      const entry = state.draft?.exercises[exerciseIndex];
      const set = entry?.sets[setIndex];
      if (!entry || !set || set.done || !isCompletableSet(set)) return null;
      const rest = EXERCISES[entry.exerciseId]?.rest ?? null;
      setState((current) => {
        if (!current.draft) return current;
        const liveEntry = current.draft.exercises[exerciseIndex];
        const liveSet = liveEntry?.sets[setIndex];
        if (!liveEntry || !liveSet || liveSet.done || !isCompletableSet(liveSet)) return current;
        const exercises = current.draft.exercises.map((exercise, index) =>
          index === exerciseIndex
            ? { ...exercise, sets: exercise.sets.map((item, index2) => (index2 === setIndex ? { ...item, done: true } : item)) }
            : exercise,
        );
        return { ...current, draft: { ...current.draft, exercises } };
      });
      return rest;
    },
    [state.draft],
  );

  const setCurrentExercise = useCallback((index: number) => {
    setState((current) =>
      current.draft ? { ...current, draft: { ...current.draft, currentEx: Math.max(0, Math.min(index, current.draft.exercises.length - 1)) } } : current,
    );
  }, []);

  const addSet = useCallback((exerciseIndex: number) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises.map((entry, index) =>
        index === exerciseIndex
          ? { ...entry, sets: [...entry.sets, { weight: entry.sets.at(-1)?.weight ?? "", reps: "", rpe: "", done: false }] }
          : entry,
      );
      return { ...current, draft: { ...current.draft, exercises } };
    });
  }, []);

  const removeSet = useCallback((exerciseIndex: number) => {
    setState((current) => {
      if (!current.draft) return current;
      const exercises = current.draft.exercises.map((entry, index) =>
        index === exerciseIndex && entry.sets.length > 1 ? { ...entry, sets: entry.sets.slice(0, -1) } : entry,
      );
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
  const addBodyStat = useCallback((entry: Omit<BodyStat, "id">) => {
    setState((current) => ({
      ...current,
      bodyStats: [{ id: uid(), ...entry }, ...current.bodyStats.filter((item) => item.date !== entry.date)],
    }));
  }, []);
  const deleteBodyStat = useCallback((id: string) => setState((current) => ({ ...current, bodyStats: current.bodyStats.filter((entry) => entry.id !== id) })), []);

  return {
    state,
    week,
    phase,
    setSettings,
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
