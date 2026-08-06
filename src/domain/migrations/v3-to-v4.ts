import {
  BUILT_IN_EXERCISES,
  DEFAULT_PROGRAM_ID,
  defaultProgression,
  makePrescription,
  todayISO,
} from "../../data.js";
import type {
  AppState,
  BodyStat,
  Draft,
  EquipmentId,
  Exercise,
  ExerciseEntry,
  ExerciseId,
  ExercisePrescription,
  ExperienceLevel,
  LoggedSet,
  MigrationWarning,
  MovementPattern,
  MuscleGroup,
  ProgramId,
  ProgramProgress,
  Session,
  Settings,
  SyncConfig,
  ThemePreference,
  TrackingMode,
  TrainingGoal,
  TrainingProgram,
  UserProfile,
  WorkoutDay,
  WorkoutRecap,
} from "../../types.js";

export type V4WorkoutDay = Omit<WorkoutDay, "exercises"> & {
  exercises: ExercisePrescription[];
};

export type V4TrainingProgram = Omit<TrainingProgram, "workouts"> & {
  workouts: V4WorkoutDay[];
};

export type MigratedV4State = Omit<AppState, "schemaVersion" | "customPrograms" | "migrationWarnings"> & {
  schemaVersion: 4;
  customPrograms: V4TrainingProgram[];
  migrationWarnings: MigrationWarning[];
};

type MigrationResult = {
  state: MigratedV4State;
  warnings: MigrationWarning[];
};

const themes: ThemePreference[] = ["system", "light", "dark"];
const goals: TrainingGoal[] = ["hypertrophy", "strength", "general", "fat-loss"];
const experiences: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const equipmentValues: EquipmentId[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "rack", "bench"];
const muscleValues: MuscleGroup[] = ["Ngực", "Lưng", "Vai", "Tay trước", "Tay sau", "Đùi trước", "Đùi sau", "Mông", "Bắp chân", "Core"];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const booleanValue = (value: unknown, fallback = false) => typeof value === "boolean" ? value : fallback;
const finiteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const optionalNumber = (value: unknown) => {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const stringArray = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string")
  : [];
const isoValue = (value: unknown, fallback = new Date(0).toISOString()) =>
  typeof value === "string" && Number.isFinite(new Date(value).getTime()) ? value : fallback;
const dateValue = (value: unknown, fallback = todayISO()) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;

const fallbackExercise = (exerciseId: ExerciseId): Exercise => ({
  id: exerciseId,
  name: exerciseId.replaceAll("_", " "),
  primary: "Core",
  secondary: [],
  equipment: "Không xác định",
  equipmentTags: ["bodyweight"],
  sets: 1,
  min: 1,
  max: 20,
  rest: 60,
  technique: "Dữ liệu cũ; kiểm tra kỹ thuật trước khi tiếp tục.",
  alternatives: [],
  type: "core",
  suffix: "reps",
  incrementKg: 0,
  trackingMode: "bodyweight-reps",
  movementPattern: "core",
  unilateral: false,
  contraindicationTags: [],
});

const trackingModeFrom = (raw: Record<string, unknown>, meta: Exercise): TrackingMode => {
  const explicit = raw.trackingMode;
  if (["weight-reps", "bodyweight-reps", "assisted-reps", "weighted-bodyweight-reps", "duration", "distance"].includes(explicit as string)) {
    return explicit as TrackingMode;
  }
  const suffix = stringValue(raw.suffix, meta.suffix);
  if (suffix === "seconds") return "duration";
  if (meta.trackingMode) return meta.trackingMode;
  if (meta.incrementKg === 0 && meta.equipmentTags.includes("bodyweight")) return "bodyweight-reps";
  return "weight-reps";
};

const movementPatternFrom = (raw: Record<string, unknown>, meta: Exercise): MovementPattern => {
  const allowed: MovementPattern[] = ["squat", "hinge", "horizontal-push", "vertical-push", "horizontal-pull", "vertical-pull", "lunge", "isolation", "carry", "core"];
  return allowed.includes(raw.movementPattern as MovementPattern)
    ? raw.movementPattern as MovementPattern
    : meta.movementPattern ?? "isolation";
};

const enrichExercise = (raw: unknown): Exercise | null => {
  if (!isObject(raw)) return null;
  const id = stringValue(raw.id);
  const name = stringValue(raw.name);
  if (!id || !name) return null;
  const builtIn = BUILT_IN_EXERCISES[id];
  const base = builtIn ?? fallbackExercise(id);
  const equipmentTags = stringArray(raw.equipmentTags).filter((item): item is EquipmentId => equipmentValues.includes(item as EquipmentId));
  const secondary = stringArray(raw.secondary).filter((item): item is MuscleGroup => muscleValues.includes(item as MuscleGroup));
  const exercise: Exercise = {
    id,
    name: name.slice(0, 100),
    primary: muscleValues.includes(raw.primary as MuscleGroup) ? raw.primary as MuscleGroup : base.primary,
    secondary,
    equipment: stringValue(raw.equipment, base.equipment).slice(0, 100),
    equipmentTags: equipmentTags.length ? equipmentTags : base.equipmentTags,
    sets: Math.max(1, Math.round(finiteNumber(raw.sets, base.sets))),
    min: Math.max(1, Math.round(finiteNumber(raw.min, base.min))),
    max: Math.max(1, Math.round(finiteNumber(raw.max, base.max))),
    rest: Math.max(15, Math.round(finiteNumber(raw.rest, base.rest))),
    technique: stringValue(raw.technique, base.technique).slice(0, 1000),
    alternatives: stringArray(raw.alternatives),
    type: ["upper", "lower", "delt", "arms", "core"].includes(raw.type as string) ? raw.type as Exercise["type"] : base.type,
    suffix: ["reps", "seconds", "each side", "each leg", "total reps"].includes(raw.suffix as string) ? raw.suffix as Exercise["suffix"] : base.suffix,
    incrementKg: Math.max(0, finiteNumber(raw.incrementKg, base.incrementKg)),
    trackingMode: trackingModeFrom(raw, base),
    movementPattern: movementPatternFrom(raw, base),
    unilateral: booleanValue(raw.unilateral, base.unilateral ?? false),
    contraindicationTags: stringArray(raw.contraindicationTags),
    custom: booleanValue(raw.custom, id.startsWith("custom:")),
  };
  if (exercise.max < exercise.min) exercise.max = exercise.min;
  return exercise;
};

const effortFromRpe = (value: unknown): LoggedSet["effort"] => {
  const rpe = optionalNumber(value);
  return rpe != null && rpe >= 1 && rpe <= 10 ? { mode: "rpe", value: rpe } : null;
};

export const migrateV3Set = (raw: unknown, mode: TrackingMode): LoggedSet | null => {
  if (!isObject(raw)) return null;
  const base = {
    id: stringValue(raw.id, `migrated-set-${Math.random().toString(36).slice(2)}`),
    kind: ["warmup", "working", "drop"].includes(raw.kind as string) ? raw.kind as LoggedSet["kind"] : "working" as const,
    effort: effortFromRpe(raw.rpe),
    done: booleanValue(raw.done, false),
  };
  const reps = optionalNumber(raw.reps);
  if (mode === "duration") return { ...base, trackingMode: "duration", seconds: reps };
  if (mode === "distance") return { ...base, trackingMode: "distance", distanceMeters: reps };
  if (mode === "bodyweight-reps") return { ...base, trackingMode: "bodyweight-reps", reps };
  if (mode === "assisted-reps") return { ...base, trackingMode: "assisted-reps", assistanceKg: optionalNumber(raw.weight), reps };
  if (mode === "weighted-bodyweight-reps") return { ...base, trackingMode: "weighted-bodyweight-reps", addedWeightKg: optionalNumber(raw.weight), reps };
  return { ...base, trackingMode: "weight-reps", weightKg: optionalNumber(raw.weight), reps };
};

const legacySet = (raw: unknown) => {
  if (!isObject(raw)) return null;
  return {
    id: stringValue(raw.id, `migrated-set-${Math.random().toString(36).slice(2)}`),
    kind: ["warmup", "working", "drop"].includes(raw.kind as string) ? raw.kind as "warmup" | "working" | "drop" : "working" as const,
    weight: stringValue(raw.weight),
    reps: stringValue(raw.reps),
    rpe: stringValue(raw.rpe),
    done: booleanValue(raw.done, false),
  };
};

const migrateEntryWithExercises = (raw: unknown, exercises: Record<string, Exercise>): ExerciseEntry | null => {
  if (!isObject(raw)) return null;
  const exerciseId = stringValue(raw.exerciseId);
  if (!exerciseId) return null;
  const meta = exercises[exerciseId] ?? BUILT_IN_EXERCISES[exerciseId] ?? fallbackExercise(exerciseId);
  const snapshotRaw = isObject(raw.snapshot) ? raw.snapshot : {};
  const targetRaw = isObject(raw.target) ? raw.target : {};
  const snapshotMeta = { ...meta, ...snapshotRaw } as Exercise;
  const mode = trackingModeFrom(snapshotRaw, snapshotMeta);
  const sourceSets = Array.isArray(raw.sets) ? raw.sets : [];
  const sets = sourceSets.map(legacySet).filter((set): set is NonNullable<ReturnType<typeof legacySet>> => Boolean(set));
  if (!sets.length) return null;
  const loggedSets = sourceSets.map((set) => migrateV3Set(set, mode)).filter((set): set is LoggedSet => Boolean(set));
  return {
    exerciseId,
    snapshot: {
      id: stringValue(snapshotRaw.id, exerciseId),
      name: stringValue(snapshotRaw.name, meta.name),
      primary: muscleValues.includes(snapshotRaw.primary as MuscleGroup) ? snapshotRaw.primary as MuscleGroup : meta.primary,
      secondary: stringArray(snapshotRaw.secondary).filter((item): item is MuscleGroup => muscleValues.includes(item as MuscleGroup)),
      equipment: stringValue(snapshotRaw.equipment, meta.equipment),
      suffix: ["reps", "seconds", "each side", "each leg", "total reps"].includes(snapshotRaw.suffix as string) ? snapshotRaw.suffix as Exercise["suffix"] : meta.suffix,
      incrementKg: Math.max(0, finiteNumber(snapshotRaw.incrementKg, meta.incrementKg)),
      trackingMode: mode,
      movementPattern: movementPatternFrom(snapshotRaw, meta),
      unilateral: booleanValue(snapshotRaw.unilateral, meta.unilateral ?? false),
    },
    target: {
      sets: Math.max(1, Math.round(finiteNumber(targetRaw.sets, meta.sets))),
      min: Math.max(1, Math.round(finiteNumber(targetRaw.min, meta.min))),
      max: Math.max(1, Math.round(finiteNumber(targetRaw.max, meta.max))),
      rest: Math.max(15, Math.round(finiteNumber(targetRaw.rest, meta.rest))),
      targetRpe: Math.max(1, Math.min(10, finiteNumber(targetRaw.targetRpe, 7))),
      prescriptionId: stringValue(targetRaw.prescriptionId, `migrated:${exerciseId}`),
      targetEffort: { mode: "rpe", value: Math.max(1, Math.min(10, finiteNumber(targetRaw.targetRpe, 7))) },
      progression: defaultProgression(meta),
    },
    sets,
    loggedSets,
    note: stringValue(raw.note).slice(0, 1000),
    replacedExerciseId: typeof raw.replacedExerciseId === "string" ? raw.replacedExerciseId : undefined,
  };
};

export const migrateV3Entry = (raw: unknown): ExerciseEntry | null =>
  migrateEntryWithExercises(raw, BUILT_IN_EXERCISES);

const makeCustomPrescription = (
  workoutId: string,
  exerciseId: ExerciseId,
  order: number,
  exercises: Record<string, Exercise>,
): ExercisePrescription => {
  if (BUILT_IN_EXERCISES[exerciseId]) return makePrescription(workoutId, exerciseId, order);
  const meta = exercises[exerciseId] ?? fallbackExercise(exerciseId);
  return {
    id: `${workoutId}:${exerciseId}:${order}`,
    exerciseId,
    order,
    setScheme: Array.from({ length: meta.sets }, () => meta.trackingMode === "duration"
      ? { kind: "working" as const, targetSeconds: { min: meta.min, max: meta.max } }
      : { kind: "working" as const, targetReps: { min: meta.min, max: meta.max } }),
    restSeconds: meta.rest,
    targetEffort: { mode: "simple", repsInReserve: 2 },
    progression: defaultProgression(meta),
    coachingCue: meta.technique,
    optional: order >= 5,
    priority: order < 2 ? "primary" : order < 5 ? "secondary" : "accessory",
  };
};

const migrateProgramWithExercises = (raw: unknown, exercises: Record<string, Exercise>): V4TrainingProgram | null => {
  if (!isObject(raw)) return null;
  const id = stringValue(raw.id);
  const name = stringValue(raw.name);
  const rawWorkouts = Array.isArray(raw.workouts) ? raw.workouts : [];
  if (!id || !name || !rawWorkouts.length) return null;
  const workouts = rawWorkouts.flatMap((item, workoutIndex): V4WorkoutDay[] => {
    if (!isObject(item)) return [];
    const workoutId = stringValue(item.id, `${id}:day-${workoutIndex + 1}`);
    const rawExercises = Array.isArray(item.exercises) ? item.exercises : [];
    const prescriptions = rawExercises.flatMap((candidate, order): ExercisePrescription[] => {
      if (typeof candidate === "string") return [makeCustomPrescription(workoutId, candidate, order, exercises)];
      if (!isObject(candidate)) return [];
      const exerciseId = stringValue(candidate.exerciseId);
      return exerciseId ? [{ ...makeCustomPrescription(workoutId, exerciseId, order, exercises), ...candidate, exerciseId, order }] as ExercisePrescription[] : [];
    });
    if (!prescriptions.length) return [];
    return [{
      id: workoutId,
      name: stringValue(item.name, `Buổi ${workoutIndex + 1}`),
      shortName: stringValue(item.shortName, stringValue(item.name, `Buổi ${workoutIndex + 1}`)),
      focus: stringValue(item.focus, "Tùy chỉnh"),
      exercises: prescriptions,
    }];
  });
  if (!workouts.length) return null;
  return {
    id: id as ProgramId,
    name: name.slice(0, 120),
    shortName: stringValue(raw.shortName, name).slice(0, 60),
    daysPerWeek: Math.max(1, Math.min(7, Math.round(finiteNumber(raw.daysPerWeek, workouts.length)))),
    level: stringValue(raw.level, "Tùy chỉnh"),
    description: stringValue(raw.description),
    sessionMinutes: stringValue(raw.sessionMinutes, "45–60 phút"),
    scheduleLabel: stringValue(raw.scheduleLabel, "Linh hoạt"),
    recommendedDays: Array.isArray(raw.recommendedDays) ? raw.recommendedDays.map((day) => Math.round(finiteNumber(day))).filter((day) => day >= 0 && day <= 6) : [],
    workouts,
    version: Math.max(1, Math.round(finiteNumber(raw.version, 1))),
    custom: booleanValue(raw.custom, id.startsWith("custom:")),
  };
};

export const migrateV3Program = (raw: unknown): V4TrainingProgram | null =>
  migrateProgramWithExercises(raw, BUILT_IN_EXERCISES);

const defaultSettings = (): Settings => ({
  theme: "system",
  sound: true,
  vibration: true,
  notify: false,
  scheduleReminders: false,
  weeklyGoal: 3,
  trainingDays: [1, 3, 5],
  reminderTime: "18:30",
  programId: DEFAULT_PROGRAM_ID,
  lastBackupAt: null,
});

const migrateSettings = (raw: unknown): Settings => {
  const source = isObject(raw) ? raw : {};
  const defaults = defaultSettings();
  return {
    theme: themes.includes(source.theme as ThemePreference) ? source.theme as ThemePreference : defaults.theme,
    sound: booleanValue(source.sound, defaults.sound),
    vibration: booleanValue(source.vibration, defaults.vibration),
    notify: booleanValue(source.notify, defaults.notify),
    scheduleReminders: booleanValue(source.scheduleReminders, defaults.scheduleReminders),
    weeklyGoal: Math.max(1, Math.min(7, Math.round(finiteNumber(source.weeklyGoal, defaults.weeklyGoal)))),
    trainingDays: Array.isArray(source.trainingDays) ? source.trainingDays.map((day) => Math.round(finiteNumber(day))).filter((day) => day >= 0 && day <= 6) : defaults.trainingDays,
    reminderTime: typeof source.reminderTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(source.reminderTime) ? source.reminderTime : defaults.reminderTime,
    programId: stringValue(source.programId, DEFAULT_PROGRAM_ID) as ProgramId,
    lastBackupAt: source.lastBackupAt == null ? null : isoValue(source.lastBackupAt),
  };
};

const migrateProfile = (raw: unknown): UserProfile => {
  const source = isObject(raw) ? raw : {};
  const days = Math.round(finiteNumber(source.availableDays, 3));
  const minutes = Math.round(finiteNumber(source.sessionMinutes, 60));
  const equipment = stringArray(source.equipment).filter((item): item is EquipmentId => equipmentValues.includes(item as EquipmentId));
  return {
    onboardingComplete: booleanValue(source.onboardingComplete, true),
    goal: goals.includes(source.goal as TrainingGoal) ? source.goal as TrainingGoal : "hypertrophy",
    experience: experiences.includes(source.experience as ExperienceLevel) ? source.experience as ExperienceLevel : "beginner",
    availableDays: ([2, 3, 4, 5, 6].includes(days) ? days : 3) as UserProfile["availableDays"],
    sessionMinutes: ([40, 60, 75, 90].includes(minutes) ? minutes : 60) as UserProfile["sessionMinutes"],
    equipment: equipment.length ? equipment : ["bodyweight", "dumbbell"],
    priorityMuscles: stringArray(source.priorityMuscles).filter((item): item is MuscleGroup => muscleValues.includes(item as MuscleGroup)),
    limitations: stringValue(source.limitations).slice(0, 500),
  };
};

const migrateProgress = (raw: unknown): Record<string, ProgramProgress> => {
  if (!isObject(raw)) return {};
  return Object.fromEntries(Object.entries(raw).flatMap(([programId, value]) => {
    if (!isObject(value)) return [];
    return [[programId, {
      startedAt: dateValue(value.startedAt),
      currentWeek: Math.max(1, Math.round(finiteNumber(value.currentWeek, 1))),
      autoDeload: booleanValue(value.autoDeload, true),
    } satisfies ProgramProgress]];
  }));
};

const migrateProgramSnapshot = (raw: unknown, programId: ProgramId, dayId: string) => {
  const source = isObject(raw) ? raw : {};
  return {
    id: stringValue(source.id, programId) as ProgramId,
    name: stringValue(source.name, programId),
    version: Math.max(1, Math.round(finiteNumber(source.version, 1))),
    dayId: stringValue(source.dayId, dayId),
    workoutName: stringValue(source.workoutName, dayId),
  };
};

const migrateSession = (raw: unknown, exercises: Record<string, Exercise>): Session | null => {
  if (!isObject(raw)) return null;
  const programId = stringValue(raw.programId, DEFAULT_PROGRAM_ID) as ProgramId;
  const dayId = stringValue(raw.dayId, "FB-A");
  const entries = Array.isArray(raw.exercises)
    ? raw.exercises.map((entry) => migrateEntryWithExercises(entry, exercises)).filter((entry): entry is ExerciseEntry => Boolean(entry))
    : [];
  if (!entries.length) return null;
  const feedback = isObject(raw.feedback) ? {
    energy: Math.max(1, Math.min(5, Math.round(finiteNumber(raw.feedback.energy, 3)))) as 1 | 2 | 3 | 4 | 5,
    soreness: Math.max(1, Math.min(5, Math.round(finiteNumber(raw.feedback.soreness, 3)))) as 1 | 2 | 3 | 4 | 5,
    note: stringValue(raw.feedback.note).slice(0, 1000),
  } : undefined;
  return {
    id: stringValue(raw.id, `session-${Math.random().toString(36).slice(2)}`),
    programId,
    programSnapshot: migrateProgramSnapshot(raw.programSnapshot, programId, dayId),
    dayId,
    startedAt: isoValue(raw.startedAt),
    endedAt: isoValue(raw.endedAt),
    totalSets: Math.max(0, Math.round(finiteNumber(raw.totalSets, entries.reduce((sum, entry) => sum + entry.sets.filter((set) => set.done).length, 0)))),
    avgRpe: raw.avgRpe == null ? null : Math.max(1, Math.min(10, finiteNumber(raw.avgRpe, 7))),
    exercises: entries,
    note: stringValue(raw.note).slice(0, 2000),
    weeklyGoalAtCompletion: Math.max(1, Math.min(7, Math.round(finiteNumber(raw.weeklyGoalAtCompletion, 3)))),
    feedback,
  };
};

const migrateDraft = (raw: unknown, exercises: Record<string, Exercise>): Draft | null => {
  if (!isObject(raw)) return null;
  const programId = stringValue(raw.programId, DEFAULT_PROGRAM_ID) as ProgramId;
  const dayId = stringValue(raw.dayId, "FB-A");
  const entries = Array.isArray(raw.exercises)
    ? raw.exercises.map((entry) => migrateEntryWithExercises(entry, exercises)).filter((entry): entry is ExerciseEntry => Boolean(entry))
    : [];
  if (!entries.length) return null;
  return {
    id: stringValue(raw.id, `draft-${Math.random().toString(36).slice(2)}`),
    programId,
    programSnapshot: migrateProgramSnapshot(raw.programSnapshot, programId, dayId),
    dayId,
    startedAt: isoValue(raw.startedAt),
    currentEx: Math.max(0, Math.min(entries.length - 1, Math.round(finiteNumber(raw.currentEx, 0)))),
    exercises: entries,
    note: stringValue(raw.note).slice(0, 2000),
    weeklyGoalAtStart: Math.max(1, Math.min(7, Math.round(finiteNumber(raw.weeklyGoalAtStart, 3)))),
  };
};

const migrateBodyStat = (raw: unknown): BodyStat | null => {
  if (!isObject(raw)) return null;
  return {
    id: stringValue(raw.id, `body-${Math.random().toString(36).slice(2)}`),
    date: dateValue(raw.date),
    weight: raw.weight == null ? null : optionalNumber(raw.weight),
    waist: raw.waist == null ? null : optionalNumber(raw.waist),
    chest: raw.chest == null ? null : optionalNumber(raw.chest),
    arm: raw.arm == null ? null : optionalNumber(raw.arm),
  };
};

const migrateSync = (raw: unknown): SyncConfig => {
  const source = isObject(raw) ? raw : {};
  return {
    enabled: booleanValue(source.enabled, false),
    endpoint: stringValue(source.endpoint),
    token: stringValue(source.token),
    autoSync: booleanValue(source.autoSync, false),
    lastSyncedAt: source.lastSyncedAt == null ? null : isoValue(source.lastSyncedAt),
    lastError: source.lastError == null ? null : stringValue(source.lastError),
  };
};

export const migrateV3ToV4 = (input: unknown): MigrationResult => {
  const source = isObject(input) ? input : {};
  const warnings: MigrationWarning[] = [];
  const customExercises = (Array.isArray(source.customExercises) ? source.customExercises : []).flatMap((raw, index): Exercise[] => {
    const exercise = enrichExercise(raw);
    if (exercise) return [exercise];
    warnings.push({ code: "custom-exercise-dropped", path: `customExercises[${index}]`, message: "Bài tập tùy chỉnh không hợp lệ đã được bỏ qua." });
    return [];
  });
  const exerciseMap = {
    ...BUILT_IN_EXERCISES,
    ...Object.fromEntries(customExercises.map((exercise) => [exercise.id, exercise])),
  };
  const customPrograms = (Array.isArray(source.customPrograms) ? source.customPrograms : []).flatMap((raw, index): V4TrainingProgram[] => {
    const program = migrateProgramWithExercises(raw, exerciseMap);
    if (program) return [program];
    warnings.push({ code: "custom-program-dropped", path: `customPrograms[${index}]`, message: "Giáo án tùy chỉnh không hợp lệ đã được bỏ qua." });
    return [];
  });
  const history = (Array.isArray(source.history) ? source.history : []).flatMap((raw, index): Session[] => {
    const session = migrateSession(raw, exerciseMap);
    if (session) return [session];
    warnings.push({ code: "history-record-dropped", path: `history[${index}]`, message: "Một buổi tập lỗi đã được cô lập và bỏ qua." });
    return [];
  });
  const draft = source.draft == null ? null : migrateDraft(source.draft, exerciseMap);
  if (source.draft != null && !draft) warnings.push({ code: "draft-dropped", path: "draft", message: "Draft lỗi không thể phục hồi." });
  const bodyStats = (Array.isArray(source.bodyStats) ? source.bodyStats : []).flatMap((raw, index): BodyStat[] => {
    const stat = migrateBodyStat(raw);
    if (stat) return [stat];
    warnings.push({ code: "body-stat-dropped", path: `bodyStats[${index}]`, message: "Một số đo lỗi đã được bỏ qua." });
    return [];
  });
  const state: MigratedV4State = {
    schemaVersion: 4,
    updatedAt: isoValue(source.updatedAt, new Date().toISOString()),
    settings: migrateSettings(source.settings),
    profile: migrateProfile(source.profile),
    programProgress: migrateProgress(source.programProgress),
    draft,
    history,
    bodyStats,
    customExercises,
    customPrograms,
    lastRecap: isObject(source.lastRecap) ? source.lastRecap as WorkoutRecap : null,
    sync: migrateSync(source.sync),
    migrationWarnings: warnings,
  };
  return { state, warnings };
};
