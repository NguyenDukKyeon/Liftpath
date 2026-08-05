import { programWeek, todayISO } from "../../data.js";
import type {
  AppState,
  Session,
  SessionFeedback,
} from "../../types.js";
import { buildWorkoutRecap } from "../coach/recap.js";
import type { ReadinessSnapshot } from "./preparation.js";

const feedbackValue = (value: number): 1 | 2 | 3 | 4 | 5 =>
  Math.max(1, Math.min(5, Math.round(value))) as 1 | 2 | 3 | 4 | 5;

export const finishGuidedWorkoutState = (
  state: AppState,
  feedback?: SessionFeedback,
  endedAt = new Date().toISOString(),
): AppState | null => {
  if (!state.draft) return null;
  const exercises = state.draft.exercises
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
  if (!allSets.length) return null;
  const rpes = allSets
    .map((set) => Number(set.rpe))
    .filter((value) => Number.isFinite(value) && value > 0);
  const session: Session = {
    id: state.draft.id,
    programId: state.draft.programId,
    programSnapshot: state.draft.programSnapshot,
    dayId: state.draft.dayId,
    startedAt: state.draft.startedAt,
    endedAt,
    totalSets: allSets.length,
    avgRpe: rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : null,
    exercises,
    note: state.draft.note,
    weeklyGoalAtCompletion: state.draft.weeklyGoalAtStart,
    feedback: feedback ? {
      energy: feedbackValue(feedback.energy),
      soreness: feedbackValue(feedback.soreness),
      note: feedback.note.slice(0, 1000),
    } : undefined,
  };
  const readiness = (state.draft as typeof state.draft & { readiness?: ReadinessSnapshot }).readiness ?? null;
  const recap = buildWorkoutRecap({
    session,
    historyBefore: state.history,
    readiness,
  });
  const progress = state.programProgress[session.programId] ?? {
    startedAt: todayISO(),
    currentWeek: 1,
    autoDeload: true,
  };
  return {
    ...state,
    draft: null,
    history: [session, ...state.history],
    lastRecap: recap,
    programProgress: {
      ...state.programProgress,
      [session.programId]: { ...progress, currentWeek: programWeek(progress.startedAt) },
    },
  };
};
