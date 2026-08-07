import type { VersionedRecord } from "../domain/common/types.js";
import type { CompletedSet } from "../domain/training/set.js";
import type { TrainingSession } from "../domain/training/session.js";
import { completeSet } from "../application/workouts/complete-set.js";
import { createIndexedDbDatabase } from "../infrastructure/repositories/indexed-db-database.js";
import { createSessionRepository } from "../infrastructure/repositories/session-repository.js";
import {
  verifyBackupRoundTrip,
  type BackupRoundTripResult,
} from "./backup-roundtrip-diagnostic.js";

interface RollbackResult {
  caught: boolean;
  firstExists: boolean;
  secondExists: boolean;
}

interface WorkoutRepositoryReloadSeed {
  sessionId: string;
  setIds: string[];
}

interface WorkoutRepositoryReloadRead {
  activeSessionId: string | null;
  setIds: string[];
}

interface CompletedSetProbeResult {
  setId: string;
  loadKg?: number;
  reps?: number;
  rir?: number;
}

interface V5PreviewDiagnostics {
  verifyTransactionRollback(): Promise<RollbackResult>;
  verifyBackupRoundTrip(): Promise<BackupRoundTripResult>;
  seedWorkoutRepositoryReloadProbe(): Promise<WorkoutRepositoryReloadSeed>;
  readWorkoutRepositoryReloadProbe(): Promise<WorkoutRepositoryReloadRead>;
  completeSetReloadProbe(): Promise<CompletedSetProbeResult>;
  readCommittedSetProbe(setId: string): Promise<CompletedSetProbeResult | null>;
}

declare global {
  interface Window {
    __liftpathV5Diagnostics?: V5PreviewDiagnostics;
  }
}

function makeRecord(id: string): VersionedRecord {
  const now = new Date().toISOString();
  return { id, createdAt: now, updatedAt: now, revision: 1 };
}

async function verifyTransactionRollback(): Promise<RollbackResult> {
  const database = createIndexedDbDatabase();
  const suffix = crypto.randomUUID();
  const first = makeRecord(`rollback-first-${suffix}`);
  const second = makeRecord(`rollback-second-${suffix}`);
  let caught = false;

  try {
    await database.transaction(["metadata"], "readwrite", async (tx) => {
      await tx.put("metadata", first);
      await tx.put("metadata", second);
      throw new Error("intentional rollback probe");
    });
  } catch {
    caught = true;
  }

  const records = await database.getAll<VersionedRecord>("metadata");
  return {
    caught,
    firstExists: records.some((record) => record.id === first.id),
    secondExists: records.some((record) => record.id === second.id),
  };
}

async function clearWorkoutProbeData(): Promise<void> {
  const database = createIndexedDbDatabase();
  await database.transaction(["sessions", "sets"], "readwrite", async (tx) => {
    await tx.clear("sessions");
    await tx.clear("sets");
  });
}

function probeSession(id: string): TrainingSession {
  const now = "2026-08-07T08:10:00.000Z";
  return {
    id,
    programVersionId: "program-reload-probe",
    sessionKey: "upper-a",
    status: "active",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
}

async function seedWorkoutRepositoryReloadProbe(): Promise<WorkoutRepositoryReloadSeed> {
  await clearWorkoutProbeData();
  const database = createIndexedDbDatabase();
  const session = probeSession("session-reload-probe");
  const now = session.startedAt;
  const sets: CompletedSet[] = [1, 2].map((ordinal) => ({
    id: `set-reload-probe-${ordinal}`,
    sessionId: session.id,
    exerciseId: "exercise-reload-probe",
    setOrdinal: ordinal,
    loadKg: 20,
    reps: 10,
    rir: 2,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  }));

  const sessions = createSessionRepository(database);
  await sessions.create(session);
  await database.transaction(["sets"], "readwrite", async (tx) => {
    for (const set of sets) await tx.put("sets", set);
  });

  return { sessionId: session.id, setIds: sets.map((set) => set.id) };
}

async function readWorkoutRepositoryReloadProbe(): Promise<WorkoutRepositoryReloadRead> {
  const sessions = createSessionRepository();
  const active = await sessions.getActive();
  if (!active) return { activeSessionId: null, setIds: [] };
  const sets = await sessions.listSets(active.id);
  return { activeSessionId: active.id, setIds: sets.map((set) => set.id) };
}

function setProbeResult(set: CompletedSet): CompletedSetProbeResult {
  return { setId: set.id, loadKg: set.loadKg, reps: set.reps, rir: set.rir };
}

async function completeSetReloadProbe(): Promise<CompletedSetProbeResult> {
  await clearWorkoutProbeData();
  const sessions = createSessionRepository();
  const session = probeSession("session-set-commit-probe");
  await sessions.create(session);
  const committed = await completeSet({
    input: {
      sessionId: session.id,
      exerciseId: "exercise-set-commit-probe",
      setOrdinal: 1,
      loadKg: 32.5,
      reps: 9,
      rir: 2,
    },
    sessions,
    ids: { next: () => "set-committed-probe" },
    clock: { now: () => "2026-08-07T08:12:00.000Z" },
  });
  return setProbeResult(committed);
}

async function readCommittedSetProbe(setId: string): Promise<CompletedSetProbeResult | null> {
  const database = createIndexedDbDatabase();
  const set = await database.transaction(["sets"], "readonly", (tx) =>
    tx.get<CompletedSet>("sets", setId),
  );
  return set ? setProbeResult(set) : null;
}

export function isPreviewDiagnosticsAllowed(search: string, hostname: string): boolean {
  const localHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  return localHost && new URLSearchParams(search).get("diagnostics") === "1";
}

export function installPreviewDiagnostics(search: string): () => void {
  if (!isPreviewDiagnosticsAllowed(search, window.location.hostname)) {
    return () => undefined;
  }

  window.__liftpathV5Diagnostics = {
    verifyTransactionRollback,
    verifyBackupRoundTrip,
    seedWorkoutRepositoryReloadProbe,
    readWorkoutRepositoryReloadProbe,
    completeSetReloadProbe,
    readCommittedSetProbe,
  };

  return () => {
    delete window.__liftpathV5Diagnostics;
  };
}
