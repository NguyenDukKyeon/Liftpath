export type DayId = "A" | "B" | "C";
export type ExerciseType = "upper" | "lower" | "delt" | "core";

export type Exercise = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  equipment: string;
  sets: number;
  min: number;
  max: number;
  rest: number;
  technique: string;
  alternatives: string[];
  type: ExerciseType;
  suffix: string;
};

export type SetEntry = {
  weight: string;
  reps: string;
  rpe: string;
  done: boolean;
};

export type ExerciseEntry = {
  exerciseId: string;
  sets: SetEntry[];
  note: string;
};

export type Draft = {
  id: string;
  dayId: DayId;
  startedAt: string;
  currentEx: number;
  exercises: ExerciseEntry[];
};

export type Session = {
  id: string;
  dayId: DayId;
  startedAt: string;
  endedAt: string;
  totalSets: number;
  avgRpe: number | null;
  exercises: ExerciseEntry[];
};

export type Settings = {
  startDate: string;
  sound: boolean;
  vibration: boolean;
  notify: boolean;
  scheduleReminders: boolean;
  weeklyGoal: number;
  trainingDays: number[];
  reminderTime: string;
};

export type BodyStat = {
  id: string;
  date: string;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
};

export type AppState = {
  settings: Settings;
  draft: Draft | null;
  history: Session[];
  bodyStats: BodyStat[];
};

