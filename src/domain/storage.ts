import {
  BUILT_IN_EXERCISES,
  BUILT_IN_PROGRAMS,
  DEFAULT_PROGRAM_ID,
  getProgram,
  isBuiltInProgramId,
  todayISO,
} from "../data.js";
import { uid } from "./training.js";
import type {
  AppState,
  BodyStat,
  Draft,
  EquipmentId,
  Exercise,
  ExerciseEntry,
  ExperienceLevel,
  MuscleGroup,
  ProgramId,
  ProgramProgress,
  Session,
  SetEntry,
  SetKind,
  Settings,
  SyncEnvelope,
  ThemePreference,
  TrainingGoal,
  TrainingProgram,
  UserProfile,
} from "../types.js";

export const STORAGE_KEY = "liftpath-personal-v3";
export const LEGACY_KEYS = ["liftpath-personal-v2", "liftpath-min-v1"];
export const CURRENT_SCHEMA_VERSION = 3 as const;

const nowISO = () => new Date().toISOString();
const themes: ThemePreference[] = ["system", "light", "dark"];
const goals: TrainingGoal[] = ["hypertrophy", "strength", "general", "fat-loss"];
const experiences: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const equipmentValues: EquipmentId[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "rack", "bench"];
const muscleValues: MuscleGroup[] = ["Ngực", "Lưng", "Vai", "Tay trước", "Tay sau", "Đùi trước", "Đùi sau", "Mông", "Bắp chân", "Core"];
const setKinds: SetKind[] = ["warmup", "working", "drop"];

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const stringValue = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const booleanValue = (value: unknown, fallback = false) => typeof value === "boolean" ? value : fallback;
const finiteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const arrayOfStrings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const validDate = (value: unknown, fallback = todayISO()) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
const validIso = (value: unknown, fallback = nowISO()) => typeof value === "string" && Number.isFinite(new Date(value).getTime()) ? value : fallback;

export const defaultProfile = (): UserProfile => ({
  onboardingComplete: false,
  goal: "hypertrophy",
  experience: "beginner",
  availableDays: 3,
  sessionMinutes: 60,
  equipment: ["dumbbell", "machine", "cable", "bodyweight", "bench"],
  priorityMuscles: [],
  limitations: "",
});

export const defaultSettings = (): Settings => ({
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

const defaultProgress = (): Record<string, ProgramProgress> => Object.fromEntries(
  Object.keys(BUILT_IN_PROGRAMS).map((programId) => [programId, { startedAt: todayISO(), currentWeek: 1, autoDeload: true }]),
);

export const defaultState = (): AppState => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  updatedAt: nowISO(),
  settings: defaultSettings(),
  profile: defaultProfile(),
  programProgress: defaultProgress(),
  draft: null,
  history: [],
  bodyStats: [],
  customExercises: [],
  customPrograms: [],
  lastRecap: null,
  sync: {
    enabled: false,
    endpoint: "",
    token: "",
    autoSync: false,
    lastSyncedAt: null,
    lastError: null,
  },
});

const normalizeProgramId = (value: unknown, customPrograms: TrainingProgram[] = []): ProgramId => {
  if (typeof value === "string" && (isBuiltInProgramId(value) || customPrograms.some((program) => program.id === value))) return value as ProgramId;
  return DEFAULT_PROGRAM_ID;
};

const normalizeSettings = (value: unknown, customPrograms: TrainingProgram[] = []): Settings => {
  const defaults = defaultSettings();
  const source = isObject(value) ? value : {};
  const programId = normalizeProgramId(source.programId, customPrograms);
  const program = getProgram(programId, customPrograms);
  const trainingDays = Array.isArray(source.trainingDays)
    ? [...new Set(source.trainingDays.map((day) => finiteNumber(day, -1)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : program.recommendedDays;
  const weeklyGoal = Math.max(1, Math.min(7, Math.round(finiteNumber(source.weeklyGoal, program.daysPerWeek))));
  return {
    theme: themes.includes(source.theme as ThemePreference) ? source.theme as ThemePreference : defaults.theme,
    sound: booleanValue(source.sound, true),
    vibration: booleanValue(source.vibration, true),
    notify: booleanValue(source.notify, false),
    scheduleReminders: booleanValue(source.scheduleReminders, false),
    weeklyGoal,
    trainingDays: trainingDays.length ? trainingDays : [...program.recommendedDays],
    reminderTime: typeof source.reminderTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(source.reminderTime) ? source.reminderTime : defaults.reminderTime,
    programId,
    lastBackupAt: source.lastBackupAt == null ? null : validIso(source.lastBackupAt),
  };
};

const normalizeProfile = (value: unknown, assumeExistingUser: boolean): UserProfile => {
  const defaults = defaultProfile();
  const source = isObject(value) ? value : {};
  const days = finiteNumber(source.availableDays, defaults.availableDays);
  const minutes = finiteNumber(source.sessionMinutes, defaults.sessionMinutes);
  return {
    onboardingComplete: booleanValue(source.onboardingComplete, assumeExistingUser),
    goal: goals.includes(source.goal as TrainingGoal) ? source.goal as TrainingGoal : defaults.goal,
    experience: experiences.includes(source.experience as ExperienceLevel) ? source.experience as ExperienceLevel : defaults.experience,
    availableDays: days === 6 ? 6 : days === 4 ? 4 : 3,
    sessionMinutes: minutes === 40 || minutes === 75 || minutes === 90 ? minutes : 60,
    equipment: arrayOfStrings(source.equipment).filter((item): item is EquipmentId => equipmentValues.includes(item as EquipmentId)).length
      ? arrayOfStrings(source.equipment).filter((item): item is EquipmentId => equipmentValues.includes(item as EquipmentId))
      : defaults.equipment,
    priorityMuscles: arrayOfStrings(source.priorityMuscles).filter((item): item is MuscleGroup => muscleValues.includes(item as MuscleGroup)),
    limitations: stringValue(source.limitations),
  };
};

const legacyDayMap: Record<string, string> = { A: "FB-A", B: "FB-B", C: "FB-C" };

const findLegacyExercise = (id: string) => BUILT_IN_EXERCISES[id] ?? {
  id,
  name: id.replaceAll("_", " "),
  primary: "Core" as const,
  secondary: [],
  equipment: "Không xác định",
  equipmentTags: ["bodyweight" as const],
  sets: 1,
  min: 1,
  max: 20,
  rest: 60,
  technique: "Dữ liệu bài tập cũ; hãy kiểm tra kỹ thuật trước khi tiếp tục.",
  alternatives: [],
  type: "core" as const,
  suffix: "reps" as const,
  incrementKg: 2.5,
};

const normalizeSet = (value: unknown): SetEntry | null => {
  if (!isObject(value)) return null;
  const reps = stringValue(value.reps);
  const rpe = stringValue(value.rpe);
  const weight = stringValue(value.weight);
  if (![reps, rpe, weight].every((item) => item.length <= 32)) return null;
  return {
    id: stringValue(value.id, uid()),
    kind: setKinds.includes(value.kind as SetKind) ? value.kind as SetKind : "working",
    weight,
    reps,
    rpe,
    done: booleanValue(value.done, false),
  };
};

const normalizeExerciseEntry = (value: unknown, targetRpe = 7): ExerciseEntry | null => {
  if (!isObject(value)) return null;
  const exerciseId = stringValue(value.exerciseId);
  if (!exerciseId) return null;
  const meta = findLegacyExercise(exerciseId);
  const snapshotSource = isObject(value.snapshot) ? value.snapshot : {};
  const targetSource = isObject(value.target) ? value.target : {};
  const sets = Array.isArray(value.sets) ? value.sets.map(normalizeSet).filter((set): set is SetEntry => Boolean(set)) : [];
  if (!sets.length) return null;
  return {
    exerciseId,
    snapshot: {
      id: stringValue(snapshotSource.id, meta.id),
      name: stringValue(snapshotSource.name, meta.name),
      primary: muscleValues.includes(snapshotSource.primary as MuscleGroup) ? snapshotSource.primary as MuscleGroup : meta.primary,
      secondary: arrayOfStrings(snapshotSource.secondary).filter((item): item is MuscleGroup => muscleValues.includes(item as MuscleGroup)).length
        ? arrayOfStrings(snapshotSource.secondary).filter((item): item is MuscleGroup => muscleValues.includes(item as MuscleGroup))
        : meta.secondary,
      equipment: stringValue(snapshotSource.equipment, meta.equipment),
      suffix: ["reps", "seconds", "each side", "each leg", "total reps"].includes(snapshotSource.suffix as string)
        ? snapshotSource.suffix as Exercise["suffix"]
        : meta.suffix,
      incrementKg: Math.max(0, finiteNumber(snapshotSource.incrementKg, meta.incrementKg)),
    },
    target: {
      sets: Math.max(1, Math.round(finiteNumber(targetSource.sets, meta.sets))),
      min: Math.max(1, Math.round(finiteNumber(targetSource.min, meta.min))),
      max: Math.max(1, Math.round(finiteNumber(targetSource.max, meta.max))),
      rest: Math.max(15, Math.round(finiteNumber(targetSource.rest, meta.rest))),
      targetRpe: Math.max(1, Math.min(10, finiteNumber(targetSource.targetRpe, targetRpe))),
    },
    sets,
    note: stringValue(value.note).slice(0, 1000),
    replacedExerciseId: typeof value.replacedExerciseId === "string" ? value.replacedExerciseId : undefined,
  };
};

const makeProgramSnapshot = (programId: ProgramId, dayId: string, customPrograms: TrainingProgram[] = []) => {
  const program = getProgram(programId, customPrograms);
  const normalizedDay = legacyDayMap[dayId] ?? dayId;
  const workout = program.workouts.find((item) => item.id === normalizedDay) ?? program.workouts[0];
  return {
    id: program.id,
    name: program.name,
    version: program.version,
    dayId: workout?.id ?? normalizedDay,
    workoutName: workout?.name ?? normalizedDay,
  };
};

const normalizeSession = (value: unknown, customPrograms: TrainingProgram[]): Session | null => {
  if (!isObject(value)) return null;
  const rawProgramId = typeof value.programId === "string" ? value.programId : DEFAULT_PROGRAM_ID;
  const programId = normalizeProgramId(rawProgramId, customPrograms);
  const rawDay = stringValue(value.dayId, getProgram(programId, customPrograms).workouts[0]?.id ?? "FB-A");
  const dayId = legacyDayMap[rawDay] ?? rawDay;
  const exercises = Array.isArray(value.exercises)
    ? value.exercises.map((entry) => normalizeExerciseEntry(entry)).filter((entry): entry is ExerciseEntry => Boolean(entry))
    : [];
  if (!exercises.length) return null;
  const snapshotSource = isObject(value.programSnapshot) ? value.programSnapshot : null;
  const fallbackSnapshot = makeProgramSnapshot(programId, dayId, customPrograms);
  return {
    id: stringValue(value.id, uid()),
    programId,
    programSnapshot: snapshotSource ? {
      id: normalizeProgramId(snapshotSource.id, customPrograms),
      name: stringValue(snapshotSource.name, fallbackSnapshot.name),
      version: Math.max(1, Math.round(finiteNumber(snapshotSource.version, fallbackSnapshot.version))),
      dayId: stringValue(snapshotSource.dayId, fallbackSnapshot.dayId),
      workoutName: stringValue(snapshotSource.workoutName, fallbackSnapshot.workoutName),
    } : fallbackSnapshot,
    dayId,
    startedAt: validIso(value.startedAt),
    endedAt: validIso(value.endedAt),
    totalSets: Math.max(0, Math.round(finiteNumber(value.totalSets, exercises.reduce((sum, entry) => sum + entry.sets.filter((set) => set.done).length, 0)))),
    avgRpe: value.avgRpe == null ? null : Math.max(1, Math.min(10, finiteNumber(value.avgRpe, 7))),
    exercises,
    note: stringValue(value.note).slice(0, 2000),
    weeklyGoalAtCompletion: Math.max(1, Math.min(7, Math.round(finiteNumber(value.weeklyGoalAtCompletion, 3)))),
    feedback: isObject(value.feedback) ? {
      energy: Math.max(1, Math.min(5, Math.round(finiteNumber(value.feedback.energy, 3)))) as 1 | 2 | 3 | 4 | 5,
      soreness: Math.max(1, Math.min(5, Math.round(finiteNumber(value.feedback.soreness, 3)))) as 1 | 2 | 3 | 4 | 5,
      note: stringValue(value.feedback.note).slice(0, 1000),
    } : undefined,
  };
};

const normalizeDraft = (value: unknown, customPrograms: TrainingProgram[]): Draft | null => {
  if (!isObject(value)) return null;
  const programId = normalizeProgramId(value.programId, customPrograms);
  const rawDay = stringValue(value.dayId, getProgram(programId, customPrograms).workouts[0]?.id ?? "FB-A");
  const dayId = legacyDayMap[rawDay] ?? rawDay;
  const exercises = Array.isArray(value.exercises)
    ? value.exercises.map((entry) => normalizeExerciseEntry(entry)).filter((entry): entry is ExerciseEntry => Boolean(entry))
    : [];
  if (!exercises.length) return null;
  return {
    id: stringValue(value.id, uid()),
    programId,
    programSnapshot: makeProgramSnapshot(programId, dayId, customPrograms),
    dayId,
    startedAt: validIso(value.startedAt),
    currentEx: Math.max(0, Math.min(exercises.length - 1, Math.round(finiteNumber(value.currentEx, 0)))),
    exercises,
    note: stringValue(value.note).slice(0, 2000),
    weeklyGoalAtStart: Math.max(1, Math.min(7, Math.round(finiteNumber(value.weeklyGoalAtStart, 3)))),
  };
};

const normalizeCustomExercise = (value: unknown): Exercise | null => {
  if (!isObject(value)) return null;
  const id = stringValue(value.id);
  const name = stringValue(value.name);
  if (!id.startsWith("custom:") || !name) return null;
  return {
    id,
    name: name.slice(0, 100),
    primary: muscleValues.includes(value.primary as MuscleGroup) ? value.primary as MuscleGroup : "Core",
    secondary: arrayOfStrings(value.secondary).filter((item): item is MuscleGroup => muscleValues.includes(item as MuscleGroup)),
    equipment: stringValue(value.equipment, "Tùy chỉnh").slice(0, 100),
    equipmentTags: arrayOfStrings(value.equipmentTags).filter((item): item is EquipmentId => equipmentValues.includes(item as EquipmentId)),
    sets: Math.max(1, Math.min(10, Math.round(finiteNumber(value.sets, 3)))),
    min: Math.max(1, Math.round(finiteNumber(value.min, 8))),
    max: Math.max(1, Math.round(finiteNumber(value.max, 12))),
    rest: Math.max(15, Math.min(600, Math.round(finiteNumber(value.rest, 90)))),
    technique: stringValue(value.technique).slice(0, 1000),
    alternatives: arrayOfStrings(value.alternatives),
    type: ["upper", "lower", "delt", "arms", "core"].includes(value.type as string) ? value.type as Exercise["type"] : "core",
    suffix: ["reps", "seconds", "each side", "each leg", "total reps"].includes(value.suffix as string) ? value.suffix as Exercise["suffix"] : "reps",
    incrementKg: Math.max(0, finiteNumber(value.incrementKg, 2.5)),
    custom: true,
  };
};

const normalizeCustomProgram = (value: unknown): TrainingProgram | null => {
  if (!isObject(value)) return null;
  const id = stringValue(value.id) as ProgramId;
  if (!id.startsWith("custom:")) return null;
  const workouts = Array.isArray(value.workouts) ? value.workouts.flatMap((workout) => {
    if (!isObject(workout)) return [];
    const exerciseIds = arrayOfStrings(workout.exercises);
    if (!exerciseIds.length) return [];
    return [{
      id: stringValue(workout.id, `day-${uid()}`),
      name: stringValue(workout.name, "Buổi tùy chỉnh").slice(0, 100),
      shortName: stringValue(workout.shortName, "Buổi tập").slice(0, 50),
      focus: stringValue(workout.focus, "Tùy chỉnh").slice(0, 100),
      exercises: exerciseIds,
    }];
  }) : [];
  if (!workouts.length) return null;
  const daysPerWeek = Math.max(1, Math.min(7, Math.round(finiteNumber(value.daysPerWeek, workouts.length))));
  return {
    id,
    name: stringValue(value.name, "Giáo án tùy chỉnh").slice(0, 100),
    shortName: stringValue(value.shortName, `${daysPerWeek} buổi`).slice(0, 50),
    daysPerWeek,
    level: stringValue(value.level, "Tùy chỉnh").slice(0, 100),
    description: stringValue(value.description).slice(0, 500),
    sessionMinutes: stringValue(value.sessionMinutes, "Tùy chỉnh").slice(0, 50),
    scheduleLabel: stringValue(value.scheduleLabel, "Lịch tùy chỉnh").slice(0, 100),
    recommendedDays: Array.isArray(value.recommendedDays)
      ? value.recommendedDays.map((day) => finiteNumber(day, -1)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [],
    workouts,
    version: Math.max(1, Math.round(finiteNumber(value.version, 1))),
    custom: true,
  };
};

const normalizeBodyStat = (value: unknown): BodyStat | null => {
  if (!isObject(value)) return null;
  const date = validDate(value.date, "");
  if (!date) return null;
  const metric = (input: unknown) => input == null || input === "" ? null : Math.max(0, finiteNumber(input, 0));
  return {
    id: stringValue(value.id, uid()),
    date,
    weight: metric(value.weight),
    waist: metric(value.waist),
    chest: metric(value.chest),
    arm: metric(value.arm),
  };
};

const normalizeProgress = (value: unknown, customPrograms: TrainingProgram[], legacyStartDate?: string) => {
  const defaults = defaultProgress();
  if (legacyStartDate && /^\d{4}-\d{2}-\d{2}$/.test(legacyStartDate)) {
    Object.keys(defaults).forEach((key) => { defaults[key] = { ...defaults[key], startedAt: legacyStartDate }; });
  }
  const source = isObject(value) ? value : {};
  customPrograms.forEach((program) => { defaults[program.id] = { startedAt: todayISO(), currentWeek: 1, autoDeload: true }; });
  Object.keys(defaults).forEach((programId) => {
    const item = isObject(source[programId]) ? source[programId] as Record<string, unknown> : {};
    defaults[programId] = {
      startedAt: validDate(item.startedAt),
      currentWeek: Math.max(1, Math.round(finiteNumber(item.currentWeek, 1))),
      autoDeload: booleanValue(item.autoDeload, true),
    };
  });
  return defaults;
};

export const normalizeState = (value: unknown): AppState => {
  const defaults = defaultState();
  if (!isObject(value)) return defaults;
  const customExercises = Array.isArray(value.customExercises)
    ? value.customExercises.map(normalizeCustomExercise).filter((item): item is Exercise => Boolean(item))
    : [];
  const customPrograms = Array.isArray(value.customPrograms)
    ? value.customPrograms.map(normalizeCustomProgram).filter((item): item is TrainingProgram => Boolean(item))
    : [];
  const rawHistory = Array.isArray(value.history) ? value.history : [];
  const assumeExistingUser = rawHistory.length > 0 || isObject(value.settings);
  const settings = normalizeSettings(value.settings, customPrograms);
  const history = rawHistory.map((session) => {
    const normalized = normalizeSession(session, customPrograms);
    if (!normalized) return null;
    const source = isObject(session) ? session : {};
    return source.weeklyGoalAtCompletion == null ? { ...normalized, weeklyGoalAtCompletion: settings.weeklyGoal } : normalized;
  }).filter((session): session is Session => Boolean(session));
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: validIso(value.updatedAt),
    settings,
    profile: normalizeProfile(value.profile, assumeExistingUser),
    programProgress: normalizeProgress(value.programProgress, customPrograms, isObject(value.settings) ? stringValue(value.settings.startDate) : undefined),
    draft: normalizeDraft(value.draft, customPrograms),
    history,
    bodyStats: Array.isArray(value.bodyStats) ? value.bodyStats.map(normalizeBodyStat).filter((item): item is BodyStat => Boolean(item)) : [],
    customExercises,
    customPrograms,
    lastRecap: isObject(value.lastRecap) ? value.lastRecap as AppState["lastRecap"] : null,
    sync: isObject(value.sync) ? {
      enabled: booleanValue(value.sync.enabled, false),
      endpoint: stringValue(value.sync.endpoint).slice(0, 500),
      token: stringValue(value.sync.token).slice(0, 1000),
      autoSync: booleanValue(value.sync.autoSync, false),
      lastSyncedAt: value.sync.lastSyncedAt == null ? null : validIso(value.sync.lastSyncedAt),
      lastError: value.sync.lastError == null ? null : stringValue(value.sync.lastError).slice(0, 500),
    } : defaults.sync,
  };
};

export const loadState = (): AppState => {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalizeState(JSON.parse(current));
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy) return normalizeState(JSON.parse(legacy));
    }
  } catch {
    return defaultState();
  }
  return defaultState();
};

export const saveState = (state: AppState) => {
  const next = { ...state, schemaVersion: CURRENT_SCHEMA_VERSION, updatedAt: nowISO() } as AppState;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const makeSyncEnvelope = (state: AppState): SyncEnvelope => ({
  app: "liftpath",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  updatedAt: state.updatedAt,
  state: { ...state, sync: { ...state.sync, token: "" } },
});

export const serializeBackup = (state: AppState) => JSON.stringify(makeSyncEnvelope(state), null, 2);

export const parseBackup = (raw: string): AppState => {
  const parsed: unknown = JSON.parse(raw);
  if (isObject(parsed) && parsed.app === "liftpath" && isObject(parsed.state)) return normalizeState(parsed.state);
  return normalizeState(parsed);
};

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export const sessionsToCsv = (history: Session[]) => {
  const rows = [["session_id", "date", "program", "workout", "exercise", "set", "kind", "weight_kg", "reps", "rpe", "note"]];
  history.forEach((session) => session.exercises.forEach((entry) => entry.sets.forEach((set, index) => {
    if (!set.done) return;
    rows.push([
      session.id,
      session.endedAt,
      session.programSnapshot.name,
      session.programSnapshot.workoutName,
      entry.snapshot.name,
      String(index + 1),
      set.kind,
      set.weight,
      set.reps,
      set.rpe,
      entry.note,
    ]);
  })));
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
};

export const backupFileName = (extension: "json" | "csv") => `liftpath-backup-${todayISO()}.${extension}`;
