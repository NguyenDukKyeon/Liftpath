import type { Clock } from "../ports/clock.js";
import type { V5Database } from "../ports/storage.js";
import type { VersionedRecord } from "../../domain/common/types.js";
import {
  BACKUP_STORE_NAMES,
  type BackupRecords,
} from "./backup-types.js";
import { encodeBackupBundle } from "../../infrastructure/backup/json-backup-codec.js";

export async function exportBackup(database: V5Database, clock: Clock): Promise<string> {
  const records = {} as BackupRecords;
  for (const store of BACKUP_STORE_NAMES) {
    records[store] = await database.getAll<VersionedRecord>(store);
  }
  return encodeBackupBundle(clock.now(), records);
}
