import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { V5Database } from "../ports/storage.js";
import type { VersionedRecord } from "../../domain/common/types.js";
import {
  BACKUP_SCHEMA_VERSION,
  BACKUP_STORE_NAMES,
  type BackupPreview,
  type RecoverySnapshotRecord,
} from "./backup-types.js";
import {
  decodeBackupBundle,
  emptyBackupRecords,
} from "../../infrastructure/backup/json-backup-codec.js";

export async function previewBackup(text: string): Promise<BackupPreview> {
  const bundle = await decodeBackupBundle(text);
  const totalRecords = BACKUP_STORE_NAMES.reduce(
    (total, store) => total + bundle.records[store].length,
    0,
  );

  return {
    manifest: bundle.manifest,
    totalRecords,
    warnings: [],
  };
}

export async function importBackup(
  text: string,
  database: V5Database,
  clock: Clock,
  ids: IdGenerator,
): Promise<BackupPreview> {
  const preview = await previewBackup(text);
  const incoming = await decodeBackupBundle(text);
  const now = clock.now();

  await database.transaction(
    [...BACKUP_STORE_NAMES, "recoverySnapshots"],
    "readwrite",
    async (tx) => {
      const currentRecords = emptyBackupRecords();
      for (const store of BACKUP_STORE_NAMES) {
        currentRecords[store] = await tx.getAll<VersionedRecord>(store);
      }

      const snapshot: RecoverySnapshotRecord = {
        id: ids.next("recovery"),
        kind: "pre-import",
        schemaVersion: BACKUP_SCHEMA_VERSION,
        records: currentRecords,
        createdAt: now,
        updatedAt: now,
        revision: 1,
      };
      await tx.put("recoverySnapshots", snapshot);

      for (const store of BACKUP_STORE_NAMES) {
        await tx.clear(store);
      }

      for (const store of BACKUP_STORE_NAMES) {
        for (const record of incoming.records[store]) {
          await tx.put(store, record);
        }
      }
    },
  );

  return preview;
}
