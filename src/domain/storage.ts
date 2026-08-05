import {
  BUILT_IN_PROGRAMS,
  DEFAULT_PROGRAM_ID,
  todayISO,
} from "../data.js";
import { migrateV3ToV4, type V4TrainingProgram } from "./migrations/v3-to-v4.js";
import type {
  AppState,
  ProgramProgress,
  Session,
  Settings,
  SyncEnvelope,
  TrainingProgram,
  UserProfile,
} from "../types.js";

export const STORAGE_KEY = "liftpath-personal-v4";
export const LEGACY_KEYS = ["liftpath-personal-v3", "liftpath-personal-v2", "liftpath-min-v1"];
export const CURRENT_SCHEMA_VERSION = 4 as const;

const nowISO = () => new Date().toISOString();
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const legacyDayMap: Record<string, string> = { A: "FB-A", B: "FB-B", C: "FB-C" };
const normalizedDayId = (value: unknown) => typeof value === "string" ? legacyDayMap[value] ?? value : value;

const normalizeLegacyRecordDay = (value: unknown): unknown => {
  if (!isObject(value)) return value;
  const dayId = normalizedDayId(value.dayId);
  const snapshot = isObject(value.programSnapshot)
    ? { ...value.programSnapshot, dayId: normalizedDayId(value.programSnapshot.dayId) }
    : value.programSnapshot;
  return { ...value, dayId, programSnapshot: snapshot };
};

const prepareMigrationInput = (value: Record<string, unknown>) => ({
  ...value,
  history: Array.isArray(value.history) ? value.history.map(normalizeLegacyRecordDay) : value.history,
  draft: value.draft == null ? value.draft : normalizeLegacyRecordDay(value.draft),
});

const recommendedDaysFor = (availableDays: UserProfile["availableDays"]) => {
  if (availableDays >= 6) return [1, 2, 3, 4, 5, 6];
  if (availableDays >= 4) return [1, 2, 4, 5];
  if (availableDays === 2) return [1, 4];
  return [1, 3, 5];
};

const normalizeCoachProfile = (profile: UserProfile): UserProfile => ({
  ...profile,
  preferredDays: Array.isArray(profile.preferredDays) && profile.preferredDays.length
    ? profile.preferredDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : recommendedDaysFor(profile.availableDays),
  restrictions: Array.isArray(profile.restrictions) ? profile.restrictions : [],
  profileNotes: (profile.profileNotes ?? profile.limitations ?? "").slice(0, 500),
  effortLanguage: profile.effortLanguage === "rpe" ? "rpe" : "simple-rir",
  movementFamiliarity: ["new", "some", "comfortable"].includes(profile.movementFamiliarity ?? "")
    ? profile.movementFamiliarity
    : "new",
  consistencyWeeks: Math.max(0, Math.round(Number(profile.consistencyWeeks) || 0)),
  recentLoads: isObject(profile.recentLoads) ? profile.recentLoads : {},
});

export const defaultProfile = (): UserProfile => ({
  onboardingComplete: false,
  goal: "hypertrophy",
  experience: "beginner",
  availableDays: 3,
  sessionMinutes: 60,
  equipment: ["dumbbell", "machine", "cable", "bodyweight", "bench"],
  preferredDays: [1, 3, 5],
  priorityMuscles: [],
  restrictions: [],
  profileNotes: "",
  effortLanguage: "simple-rir",
  movementFamiliarity: "new",
  consistencyWeeks: 0,
  recentLoads: {},
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
  Object.keys(BUILT_IN_PROGRAMS).map((programId) => [
    programId,
    { startedAt: todayISO(), currentWeek: 1, autoDeload: true },
  ]),
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
  migrationWarnings: [],
});

const runtimeProgramView = (program: V4TrainingProgram): TrainingProgram => ({
  ...program,
  workouts: program.workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((prescription) => prescription.exerciseId),
  })),
});

/**
 * Normalize every persisted/imported payload through the pure v3→v4 migration.
 * Custom programs are temporarily exposed as ID arrays to the v3 UI/state layer;
 * the canonical migration output remains prescription-based.
 */
export const normalizeState = (value: unknown): AppState => {
  if (!isObject(value)) return defaultState();
  const { state, warnings } = migrateV3ToV4(prepareMigrationInput(value));
  return {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: normalizeCoachProfile(state.profile),
    customPrograms: state.customPrograms.map(runtimeProgramView),
    migrationWarnings: warnings,
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
  const next: AppState = {
    ...normalizeState(state),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: nowISO(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const makeSyncEnvelope = (state: AppState): SyncEnvelope => ({
  app: "liftpath",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  updatedAt: state.updatedAt,
  state: {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sync: { ...state.sync, token: "" },
  },
});

export const serializeBackup = (state: AppState) => JSON.stringify(makeSyncEnvelope(state), null, 2);

export const parseBackup = (raw: string): AppState => {
  const parsed: unknown = JSON.parse(raw);
  if (isObject(parsed) && parsed.app === "liftpath" && isObject(parsed.state)) {
    return normalizeState(parsed.state);
  }
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

export const backupFileName = (extension: "json" | "csv") =>
  `liftpath-backup-${todayISO()}.${extension}`;
