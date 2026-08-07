import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_SCHEMA_VERSION,
  BACKUP_STORE_NAMES,
  type BackupBundle,
  type BackupManifest,
  type BackupRecords,
  type UnsignedBackupPayload,
} from "../../application/backup/backup-types.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { ISODateTime, VersionedRecord } from "../../domain/common/types.js";

function backupError(message: string, cause?: unknown): LiftPathV5Error {
  return new LiftPathV5Error("BACKUP_ERROR", message, cause);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVersionedRecord(value: unknown): value is VersionedRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.revision === "number" &&
    Number.isInteger(value.revision) &&
    value.revision >= 0
  );
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = canonicalize(value[key]);
  }
  return result;
}

function canonicalRecords(records: BackupRecords): BackupRecords {
  const result = emptyBackupRecords();
  for (const store of BACKUP_STORE_NAMES) {
    result[store] = [...records[store]]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((record) => structuredClone(record));
  }
  return result;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createUnsignedPayload(createdAt: ISODateTime, records: BackupRecords): UnsignedBackupPayload {
  return {
    format: BACKUP_FORMAT,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt,
    records: canonicalRecords(records),
  };
}

function recordCounts(records: BackupRecords): Record<string, number> {
  return Object.fromEntries(BACKUP_STORE_NAMES.map((store) => [store, records[store].length]));
}

export async function encodeBackupBundle(
  createdAt: ISODateTime,
  records: BackupRecords,
): Promise<string> {
  const unsigned = createUnsignedPayload(createdAt, records);
  const checksum = await sha256(canonicalStringify(unsigned));
  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt,
    recordCounts: recordCounts(unsigned.records),
    checksum,
  };
  const bundle: BackupBundle = { manifest, records: unsigned.records };
  return canonicalStringify(bundle);
}

function parseRecords(value: unknown): BackupRecords {
  if (!isRecord(value)) throw backupError("Backup records are missing or invalid");

  const records = emptyBackupRecords();
  for (const store of BACKUP_STORE_NAMES) {
    const rawRecords = value[store];
    if (!Array.isArray(rawRecords) || !rawRecords.every(isVersionedRecord)) {
      throw backupError(`Backup store ${store} contains invalid records`);
    }
    records[store] = rawRecords.map((record) => structuredClone(record)) as VersionedRecord[];
  }
  return canonicalRecords(records);
}

function parseManifest(value: unknown): BackupManifest {
  if (!isRecord(value)) throw backupError("Backup manifest is missing or invalid");
  if (value.format !== BACKUP_FORMAT) throw backupError("Unsupported backup format");
  if (value.backupFormatVersion !== BACKUP_FORMAT_VERSION) {
    throw backupError("Unsupported backup format version");
  }
  if (value.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw backupError("Unsupported backup schema version");
  }
  if (typeof value.createdAt !== "string" || typeof value.checksum !== "string") {
    throw backupError("Backup manifest metadata is invalid");
  }
  if (!isRecord(value.recordCounts)) throw backupError("Backup record counts are invalid");

  const counts: Record<string, number> = {};
  for (const store of BACKUP_STORE_NAMES) {
    const count = value.recordCounts[store];
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
      throw backupError(`Backup count for ${store} is invalid`);
    }
    counts[store] = count;
  }

  return {
    format: BACKUP_FORMAT,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: value.createdAt,
    recordCounts: counts,
    checksum: value.checksum,
  };
}

export async function decodeBackupBundle(text: string): Promise<BackupBundle> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw backupError("Backup is not valid JSON", error);
  }

  if (!isRecord(parsed)) throw backupError("Backup root is invalid");
  const manifest = parseManifest(parsed.manifest);
  const records = parseRecords(parsed.records);

  const expectedCounts = recordCounts(records);
  for (const store of BACKUP_STORE_NAMES) {
    if (manifest.recordCounts[store] !== expectedCounts[store]) {
      throw backupError(`Backup count for ${store} does not match its records`);
    }
  }

  const unsigned = createUnsignedPayload(manifest.createdAt, records);
  const actualChecksum = await sha256(canonicalStringify(unsigned));
  if (actualChecksum !== manifest.checksum) {
    throw backupError("Backup checksum does not match its contents");
  }

  return { manifest, records };
}

export function emptyBackupRecords(): BackupRecords {
  return {
    metadata: [],
    profiles: [],
    programVersions: [],
    sessions: [],
    sessionExercises: [],
    sets: [],
    recommendations: [],
  };
}
