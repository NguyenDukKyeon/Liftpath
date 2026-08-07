import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { V5Database } from "../ports/storage.js";
import {
  BACKUP_STORE_NAMES,
  type BackupPreview,
  type RecoverySnapshotRecord,
} from "./backup-types.js";
import { exportBackup } from "./export-backup.js";
import { decodeBackupBundle } from "../../infrastructure/backup/json-backup-codec.js";

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
  const currentBackup = await exportBackup(database, clock);
  const now = clock.now();
  const snapshot: RecoverySnapshotRecord = {
    id: ids.next("recovery"),
    kind: "pre-import",
    backupText: currentBackup,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };

  await database.transaction(
    [...BACKUP_STORE_NAMES, "recoverySnapshots"],
    "readwrite",
    async (tx) => {
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
