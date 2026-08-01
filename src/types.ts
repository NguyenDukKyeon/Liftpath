export type DayId = string;
export type ProgramId = "full-body-3" | "upper-lower-4" | "ppl-6";
export type ThemePreference = "system" | "light" | "dark";
export type ExerciseType = "upper" | "lower" | "delt" | "arms" | "core";

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

export type WorkoutDay = {
  id: DayId;
  name: string;
  shortName: string;
  focus: string;
  exercises: string[];
};

export type TrainingProgram = {
  id: ProgramId;
  name: string;
  shortName: string;
  daysPerWeek: 3 | 4 | 6;
  level: string;
  description: string;
  sessionMinutes: string;
  scheduleLabel: string;
  recommendedDays: number[];
  workouts: WorkoutDay[];
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
  programId?: ProgramId;
  dayId: DayId;
  startedAt: string;
  currentEx: number;
  exercises: ExerciseEntry[];
};

export type Session = {
  id: string;
  programId?: ProgramId;
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
  programId: ProgramId;
  theme: ThemePreference;
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
