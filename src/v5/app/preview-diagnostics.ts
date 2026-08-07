import type { VersionedRecord } from "../domain/common/types.js";
import type { CompletedSet } from "../domain/training/set.js";
import type { TrainingSession } from "../domain/training/session.js";
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

interface V5PreviewDiagnostics {
  verifyTransactionRollback(): Promise<RollbackResult>;
  verifyBackupRoundTrip(): Promise<BackupRoundTripResult>;
  seedWorkoutRepositoryReloadProbe(): Promise<WorkoutRepositoryReloadSeed>;
  readWorkoutRepositoryReloadProbe(): Promise<WorkoutRepositoryReloadRead>;
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

async function seedWorkoutRepositoryReloadProbe(): Promise<WorkoutRepositoryReloadSeed> {
  const database = createIndexedDbDatabase();
  await database.transaction(["sessions", "sets"], "readwrite", async (tx) => {
    await tx.clear("sessions");
    await tx.clear("sets");
  });

  const now = "2026-08-07T07:55:00.000Z";
  const session: TrainingSession = {
    id: "session-reload-probe",
    programVersionId: "program-reload-probe",
    sessionKey: "upper-a",
    status: "active",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
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
  };

  return () => {
    delete window.__liftpathV5Diagnostics;
  };
}
