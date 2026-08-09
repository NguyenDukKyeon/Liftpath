import { BACKUP_STORE_NAMES } from "../application/backup/backup-types.js";
import { exportBackup } from "../application/backup/export-backup.js";
import { importBackup } from "../application/backup/import-backup.js";
import type { Clock } from "../application/ports/clock.js";
import type { IdGenerator } from "../application/ports/id-generator.js";
import type { V5StoreName } from "../application/ports/storage.js";
import type { VersionedRecord } from "../domain/common/types.js";
import { createIndexedDbDatabase } from "../infrastructure/repositories/indexed-db-database.js";

export interface BackupRoundTripResult {
  restoredProfileIds: string[];
  restoredSessionIds: string[];
  restoredSetIds: string[];
  recoverySnapshotCount: number;
}

function makeRecord(id: string): VersionedRecord {
  const now = "2026-08-07T04:40:00.000Z";
  return { id, createdAt: now, updatedAt: now, revision: 1 };
}

async function clearV5Stores(stores: V5StoreName[]): Promise<void> {
  const database = createIndexedDbDatabase();
  await database.transaction(stores, "readwrite", async (tx) => {
    for (const store of stores) {
      await tx.clear(store);
    }
  });
}

export async function verifyBackupRoundTrip(): Promise<BackupRoundTripResult> {
  const allRoundTripStores = [...BACKUP_STORE_NAMES, "recoverySnapshots"] as V5StoreName[];
  await clearV5Stores(allRoundTripStores);

  const database = createIndexedDbDatabase();
  const seededRecords: Array<{ store: V5StoreName; record: VersionedRecord }> = [
    { store: "profiles", record: makeRecord("profile-roundtrip-1") },
    { store: "sessions", record: makeRecord("session-roundtrip-1") },
    { store: "sessions", record: makeRecord("session-roundtrip-2") },
    { store: "sets", record: makeRecord("set-roundtrip-1") },
    { store: "sets", record: makeRecord("set-roundtrip-2") },
  ];

  await database.transaction(["profiles", "sessions", "sets"], "readwrite", async (tx) => {
    for (const item of seededRecords) {
      await tx.put(item.store, item.record);
    }
  });

  const clock: Clock = { now: () => "2026-08-07T04:40:00.000Z" };
  const ids: IdGenerator = { next: (prefix) => `${prefix}-roundtrip-snapshot` };
  const backupText = await exportBackup(database, clock);

  await clearV5Stores(allRoundTripStores);

  const restoredDatabase = createIndexedDbDatabase();
  await importBackup(backupText, restoredDatabase, clock, ids);

  const profiles = await restoredDatabase.getAll<VersionedRecord>("profiles");
  const sessions = await restoredDatabase.getAll<VersionedRecord>("sessions");
  const sets = await restoredDatabase.getAll<VersionedRecord>("sets");
  const snapshots = await restoredDatabase.getAll<VersionedRecord>("recoverySnapshots");

  return {
    restoredProfileIds: profiles.map((record) => record.id).sort(),
    restoredSessionIds: sessions.map((record) => record.id).sort(),
    restoredSetIds: sets.map((record) => record.id).sort(),
    recoverySnapshotCount: snapshots.length,
  };
}
