import type { V5StoreName } from "../ports/storage.js";
import type { ISODateTime, VersionedRecord } from "../../domain/common/types.js";

export const BACKUP_FORMAT = "liftpath-v5-backup" as const;
export const BACKUP_FORMAT_VERSION = 1 as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;

export const BACKUP_STORE_NAMES = [
  "metadata",
  "profiles",
  "programVersions",
  "sessions",
  "sessionExercises",
  "sets",
  "recommendations",
] as const satisfies readonly V5StoreName[];

export type BackupStoreName = (typeof BACKUP_STORE_NAMES)[number];
export type BackupRecords = Record<BackupStoreName, VersionedRecord[]>;

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  backupFormatVersion: typeof BACKUP_FORMAT_VERSION;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  createdAt: ISODateTime;
  recordCounts: Record<string, number>;
  checksum: string;
}

export interface BackupBundle {
  manifest: BackupManifest;
  records: BackupRecords;
}

export interface BackupPreview {
  manifest: BackupManifest;
  totalRecords: number;
  warnings: string[];
}

export interface UnsignedBackupPayload {
  format: typeof BACKUP_FORMAT;
  backupFormatVersion: typeof BACKUP_FORMAT_VERSION;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  createdAt: ISODateTime;
  records: BackupRecords;
}
