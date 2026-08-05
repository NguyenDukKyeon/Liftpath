import { BUILT_IN_EXERCISES, todayISO } from "../../src/data.js";
import { defaultState } from "../../src/domain/storage.js";
import type {
  AppState,
  Exercise,
  ExerciseEntry,
  ProgramId,
  Session,
  TrainingProgram,
} from "../../src/types.js";
import {
  createDraftAfterReadiness,
  prepareWorkoutFromState,
} from "../../src/features/workout/preparation.js";
import type { WorkoutCoachRecap } from "../../src/features/coach/recap.js";

export const returningUserState = (): AppState => {
  const state = defaultState();
  state.profile = {
    ...state.profile,
    onboardingComplete: true,
    equipment: ["dumbbell", "machine", "cable", "bodyweight", "bench"],
    preferredDays: [1, 3, 5],
  };
  return state;
};

const withCustomProgram = (
  state: AppState,
  program: TrainingProgram,
): AppState => ({
  ...state,
  settings: {
    ...state.settings,
    programId: program.id,
    weeklyGoal: program.daysPerWeek,
    trainingDays: [...program.recommendedDays],
  },
  customPrograms: [
    ...state.customPrograms.filter((item) => item.id !== program.id),
    program,
  ],
  programProgress: {
    ...state.programProgress,
    [program.id]: { startedAt: todayISO(), currentWeek: 1, autoDeload: true },
  },
});

const benchEntry = (done = true): ExerciseEntry => {
  const exercise = BUILT_IN_EXERCISES.db_bench;
  const sets = [1, 2, 3].map((index) => ({
    id: `prior-set-${index}`,
    kind: "working" as const,
    weight: "20",
    reps: "12",
    rpe: "8",
    done,
  }));
  return {
    exerciseId: exercise.id,
    snapshot: {
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
    },
    target: {
      sets: 3,
      min: 8,
      max: 12,
      rest: 90,
      targetRpe: 8,
      prescriptionId: "progression:db_bench",
      targetEffort: { mode: "simple", repsInReserve: 2 },
      progression: { type: "double-progression", incrementKg: 2 },
    },
    sets,
    loggedSets: sets.map((set) => ({
      id: set.id,
      kind: set.kind,
      trackingMode: "weight-reps" as const,
      weightKg: 20,
      reps: 12,
      effort: { mode: "rpe" as const, value: 8 },
      done: set.done,
    })),
    note: "",
  };
};

export const progressionUserState = (): AppState => {
  const state = returningUserState();
  const programId = "custom:progression-e2e" as ProgramId;
  const program: TrainingProgram = {
    id: programId,
    name: "Progression Test Plan",
    shortName: "Progression",
    daysPerWeek: 1,
    level: "Kiểm thử",
    description: "One-day deterministic progression fixture.",
    sessionMinutes: "30 phút",
    scheduleLabel: "1 buổi",
    recommendedDays: [1],
    workouts: [{
      id: "progression-day",
      name: "Progression Day",
      shortName: "P1",
      focus: "Ngực",
      exercises: ["db_bench"],
    }],
    version: 1,
    custom: true,
  };
  const prior: Session = {
    id: "prior-session",
    programId,
    programSnapshot: {
      id: programId,
      name: program.name,
      version: program.version,
      dayId: "progression-day",
      workoutName: "Progression Day",
    },
    dayId: "progression-day",
    startedAt: "2026-08-03T09:00:00.000Z",
    endedAt: "2026-08-03T10:00:00.000Z",
    totalSets: 3,
    avgRpe: 8,
    exercises: [benchEntry()],
    note: "",
    weeklyGoalAtCompletion: 1,
  };
  return {
    ...withCustomProgram(state, program),
    history: [prior],
  };
};

export const shortSessionUserState = (): AppState => {
  const state = returningUserState();
  const programId = "custom:short-session-e2e" as ProgramId;
  const longAccessory: Exercise = {
    id: "custom:long-accessory",
    name: "Long Accessory Curl",
    primary: "Tay trước",
    secondary: [],
    equipment: "Tạ đơn",
    equipmentTags: ["dumbbell"],
    sets: 5,
    min: 10,
    max: 15,
    rest: 180,
    technique: "Giữ khuỷu tay ổn định và kiểm soát nhịp hạ tạ.",
    alternatives: [],
    type: "arms",
    suffix: "reps",
    incrementKg: 2,
    trackingMode: "weight-reps",
    movementPattern: "isolation",
    custom: true,
  };
  const program: TrainingProgram = {
    id: programId,
    name: "Short Session Test Plan",
    shortName: "Short session",
    daysPerWeek: 1,
    level: "Kiểm thử",
    description: "A deterministic existing-user plan with protected primary work and one removable long accessory.",
    sessionMinutes: "50 phút",
    scheduleLabel: "1 buổi",
    recommendedDays: [1],
    workouts: [{
      id: "short-session-day",
      name: "Short Session Day",
      shortName: "S1",
      focus: "Toàn thân",
      exercises: [
        "db_bench",
        "chest_row",
        "goblet_squat",
        "db_ohp",
        longAccessory.id,
      ],
    }],
    version: 1,
    custom: true,
  };
  return withCustomProgram({
    ...state,
    customExercises: [...state.customExercises, longAccessory],
  }, program);
};

export const activeWorkoutState = (): AppState => {
  const state = returningUserState();
  const program = state.settings.programId;
  const dayId = "FB-A";
  const prepared = prepareWorkoutFromState(state, dayId);
  if (!prepared) throw new Error(`Could not prepare ${program}/${dayId}`);
  const result = createDraftAfterReadiness(state, prepared, {
    energy: "normal",
    soreness: "manageable",
    pain: null,
    availableMinutes: 60,
  });
  if (!result.draft) throw new Error("Could not create active workout fixture");
  return { ...state, draft: result.draft };
};

export const recapUserState = (): AppState => {
  const state = returningUserState();
  const recap: WorkoutCoachRecap = {
    sessionId: "recap-session",
    generatedAt: "2026-08-05T14:00:00.000Z",
    durationMinutes: 48,
    totalSets: 9,
    volume: 2200,
    prs: [],
    strongestExercise: "Dumbbell Bench Press",
    nextAction: "Giữ kế hoạch hiện tại",
    wentWell: [{
      reasonCode: "recap-plan-adherence",
      headline: "Bạn hoàn thành bài chính",
      explanation: "Các working set chính được ghi lại đúng kế hoạch.",
    }],
    attention: [],
    nextTime: [{
      reasonCode: "progression-reps-still-building",
      headline: "Giữ tải và tích lũy reps",
      explanation: "Rep range chưa hoàn tất ở mọi working set.",
      exerciseId: "db_bench",
    }],
    exerciseDecisions: [],
    readinessEvidence: null,
  };
  return { ...state, lastRecap: recap };
};
