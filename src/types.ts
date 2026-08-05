export type BuiltInProgramId = "full-body-3" | "upper-lower-4" | "ppl-6";
export type ProgramId = BuiltInProgramId | `custom:${string}`;
export type DayId = string;
export type ExerciseId = string;
export type ThemePreference = "system" | "light" | "dark";
export type ExerciseType = "upper" | "lower" | "delt" | "arms" | "core";
export type SetKind = "warmup" | "working" | "drop";
export type TrainingGoal = "hypertrophy" | "strength" | "general" | "fat-loss";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type AvailableTrainingDays = 2 | 3 | 4 | 5 | 6;
export type EquipmentId =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "rack"
  | "bench";
export type MuscleGroup =
  | "Ngực"
  | "Lưng"
  | "Vai"
  | "Tay trước"
  | "Tay sau"
  | "Đùi trước"
  | "Đùi sau"
  | "Mông"
  | "Bắp chân"
  | "Core";

export type TrackingMode =
  | "weight-reps"
  | "bodyweight-reps"
  | "assisted-reps"
  | "weighted-bodyweight-reps"
  | "duration"
  | "distance";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontal-push"
  | "vertical-push"
  | "horizontal-pull"
  | "vertical-pull"
  | "lunge"
  | "isolation"
  | "carry"
  | "core";

export type EffortTarget =
  | { mode: "rir"; value: number }
  | { mode: "rpe"; value: number }
  | { mode: "simple"; repsInReserve: number };

export type LoggedEffort =
  | { mode: "rir"; value: number }
  | { mode: "rpe"; value: number }
  | null;

export type ProgressionStrategy =
  | { type: "double-progression"; incrementKg: number }
  | { type: "linear-load"; incrementKg: number }
  | { type: "rep-progression"; repStep: number }
  | { type: "duration-progression"; secondsStep: number }
  | { type: "manual" };

export type SetPrescription = {
  kind: SetKind;
  targetReps?: { min: number; max: number };
  targetSeconds?: { min: number; max: number };
  targetDistanceMeters?: { min: number; max: number };
};

export type ExercisePrescription = {
  id: string;
  exerciseId: ExerciseId;
  order: number;
  setScheme: SetPrescription[];
  restSeconds: number;
  targetEffort: EffortTarget;
  progression: ProgressionStrategy;
  coachingCue?: string;
  optional: boolean;
  priority: "primary" | "secondary" | "accessory";
  supersetGroup?: string;
};

type LoggedSetBase = {
  id: string;
  kind: SetKind;
  effort: LoggedEffort;
  done: boolean;
};

export type LoggedSet =
  | (LoggedSetBase & {
      trackingMode: "weight-reps";
      weightKg: number | null;
      reps: number | null;
    })
  | (LoggedSetBase & {
      trackingMode: "bodyweight-reps";
      reps: number | null;
    })
  | (LoggedSetBase & {
      trackingMode: "assisted-reps";
      assistanceKg: number | null;
      reps: number | null;
    })
  | (LoggedSetBase & {
      trackingMode: "weighted-bodyweight-reps";
      addedWeightKg: number | null;
      reps: number | null;
    })
  | (LoggedSetBase & {
      trackingMode: "duration";
      seconds: number | null;
    })
  | (LoggedSetBase & {
      trackingMode: "distance";
      distanceMeters: number | null;
      durationSeconds?: number | null;
    });

export type MigrationWarning = {
  code: string;
  path: string;
  message: string;
  recordId?: string;
};

export type Exercise = {
  id: ExerciseId;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: string;
  equipmentTags: EquipmentId[];
  sets: number;
  min: number;
  max: number;
  rest: number;
  technique: string;
  alternatives: ExerciseId[];
  type: ExerciseType;
  suffix: "reps" | "seconds" | "each side" | "each leg" | "total reps";
  incrementKg: number;
  trackingMode?: TrackingMode;
  movementPattern?: MovementPattern;
  unilateral?: boolean;
  contraindicationTags?: string[];
  custom?: boolean;
};

export type WorkoutDay = {
  id: DayId;
  name: string;
  shortName: string;
  focus: string;
  exercises: ExerciseId[];
};

export type TrainingProgram = {
  id: ProgramId;
  name: string;
  shortName: string;
  daysPerWeek: number;
  level: string;
  description: string;
  sessionMinutes: string;
  scheduleLabel: string;
  recommendedDays: number[];
  workouts: WorkoutDay[];
  version: number;
  custom?: boolean;
};

export type ExerciseSnapshot = {
  id: ExerciseId;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: string;
  suffix: Exercise["suffix"];
  incrementKg: number;
  trackingMode?: TrackingMode;
  movementPattern?: MovementPattern;
  unilateral?: boolean;
};

export type TargetSnapshot = {
  sets: number;
  min: number;
  max: number;
  rest: number;
  targetRpe: number;
  prescriptionId?: string;
  targetEffort?: EffortTarget;
  progression?: ProgressionStrategy;
};

export type SetEntry = {
  id: string;
  kind: SetKind;
  weight: string;
  reps: string;
  rpe: string;
  done: boolean;
};

export type ExerciseEntry = {
  exerciseId: ExerciseId;
  snapshot: ExerciseSnapshot;
  target: TargetSnapshot;
  sets: SetEntry[];
  loggedSets?: LoggedSet[];
  note: string;
  replacedExerciseId?: ExerciseId;
};

export type ProgramSnapshot = {
  id: ProgramId;
  name: string;
  version: number;
  dayId: DayId;
  workoutName: string;
};

export type Draft = {
  id: string;
  programId: ProgramId;
  programSnapshot: ProgramSnapshot;
  dayId: DayId;
  startedAt: string;
  currentEx: number;
  exercises: ExerciseEntry[];
  note: string;
  weeklyGoalAtStart: number;
};

export type SessionFeedback = {
  energy: 1 | 2 | 3 | 4 | 5;
  soreness: 1 | 2 | 3 | 4 | 5;
  note: string;
};

export type Session = {
  id: string;
  programId: ProgramId;
  programSnapshot: ProgramSnapshot;
  dayId: DayId;
  startedAt: string;
  endedAt: string;
  totalSets: number;
  avgRpe: number | null;
  exercises: ExerciseEntry[];
  note: string;
  weeklyGoalAtCompletion: number;
  feedback?: SessionFeedback;
};

export type BodyStat = {
  id: string;
  date: string;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
};

export type ProgramProgress = {
  startedAt: string;
  currentWeek: number;
  autoDeload: boolean;
};

export type UserProfile = {
  onboardingComplete: boolean;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  availableDays: AvailableTrainingDays;
  sessionMinutes: 40 | 60 | 75 | 90;
  equipment: EquipmentId[];
  priorityMuscles: MuscleGroup[];
  limitations: string;
};

export type Settings = {
  theme: ThemePreference;
  sound: boolean;
  vibration: boolean;
  notify: boolean;
  scheduleReminders: boolean;
  weeklyGoal: number;
  trainingDays: number[];
  reminderTime: string;
  programId: ProgramId;
  lastBackupAt: string | null;
};

export type PersonalRecord = {
  exerciseId: ExerciseId;
  exerciseName: string;
  type: "weight" | "reps" | "volume" | "estimated-1rm";
  previous: number;
  value: number;
  unit: string;
};

export type WorkoutRecap = {
  sessionId: string;
  durationMinutes: number;
  totalSets: number;
  volume: number;
  prs: PersonalRecord[];
  strongestExercise?: string;
  nextAction: string;
};

export type SyncConfig = {
  enabled: boolean;
  endpoint: string;
  token: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type AppState = {
  schemaVersion: 3 | 4;
  updatedAt: string;
  settings: Settings;
  profile: UserProfile;
  programProgress: Record<string, ProgramProgress>;
  draft: Draft | null;
  history: Session[];
  bodyStats: BodyStat[];
  customExercises: Exercise[];
  customPrograms: TrainingProgram[];
  lastRecap: WorkoutRecap | null;
  sync: SyncConfig;
  migrationWarnings?: MigrationWarning[];
};

export type ProgramSwitchOptions = {
  keepSchedule: boolean;
  resetCycle: boolean;
};

export type ProgressionRecommendation = {
  exerciseId: ExerciseId;
  headline: string;
  explanation: string;
  weight: number | null;
  minReps: number;
  maxReps: number;
  confidence: "low" | "medium" | "high";
};

export type WeeklyReview = {
  sessions: number;
  goal: number;
  completionRate: number;
  sets: number;
  volume: number;
  avgRpe: number | null;
  volumeChangePercent: number | null;
  adherenceLabel: string;
  deloadSuggested: boolean;
  messages: string[];
};

export type SyncEnvelope = {
  app: "liftpath";
  schemaVersion: 3 | 4;
  updatedAt: string;
  state: AppState;
};
