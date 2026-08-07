import type { BackupPreview } from "./backup-types.js";
import { BACKUP_STORE_NAMES } from "./backup-types.js";
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
