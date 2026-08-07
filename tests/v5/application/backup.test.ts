import assert from "node:assert/strict";
import test from "node:test";
import type {
  V5Database,
  V5StoreName,
  V5Transaction,
} from "../../../src/v5/application/ports/storage.js";
import type {
  EntityId,
  VersionedRecord,
} from "../../../src/v5/domain/common/types.js";
import { exportBackup } from "../../../src/v5/application/backup/export-backup.js";
import {
  importBackup,
  previewBackup,
} from "../../../src/v5/application/backup/import-backup.js";
import { LiftPathV5Error } from "../../../src/v5/domain/common/errors.js";
import {
  emptyBackupRecords,
  encodeBackupBundle,
} from "../../../src/v5/infrastructure/backup/json-backup-codec.js";

class MemoryDatabase implements V5Database {
  readonly stores = new Map<V5StoreName, Map<EntityId, VersionedRecord>>();
  mutationCount = 0;

  seed(store: V5StoreName, record: VersionedRecord): void {
    const records = this.stores.get(store) ?? new Map<EntityId, VersionedRecord>();
    records.set(record.id, structuredClone(record));
    this.stores.set(store, records);
  }

  async transaction<T>(
    stores: V5StoreName[],
    _mode: IDBTransactionMode,
    work: (tx: V5Transaction) => Promise<T>,
  ): Promise<T> {
    const tx: V5Transaction = {
      put: async (store, record) => {
        this.mutationCount += 1;
        this.seed(store, record);
      },
      get: async <R>(store: V5StoreName, id: EntityId) =>
        structuredClone(this.stores.get(store)?.get(id)) as R | undefined,
      delete: async (store, id) => {
        this.mutationCount += 1;
        this.stores.get(store)?.delete(id);
      },
      clear: async (store) => {
        this.mutationCount += 1;
        this.stores.set(store, new Map());
      },
    };
    void stores;
    return work(tx);
  }

  async getAll<T>(store: V5StoreName): Promise<T[]> {
    return [...(this.stores.get(store)?.values() ?? [])].map((record) =>
      structuredClone(record) as T,
    );
  }
}

const fixedClock = { now: () => "2026-08-07T04:30:00.000Z" } as const;
const fixedIds = { next: (prefix: string) => `${prefix}-1` } as const;

function record(id: string): VersionedRecord {
  return {
    id,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    revision: 1,
  };
}

test("valid backup previews record counts without mutating storage", async () => {
  const db = new MemoryDatabase();
  db.seed("profiles", record("profile-1"));
  db.seed("sessions", record("session-1"));

  const encoded = await exportBackup(db, fixedClock);
  const mutationsBeforePreview = db.mutationCount;
  const preview = await previewBackup(encoded);

  assert.equal(preview.totalRecords, 2);
  assert.equal(preview.manifest.recordCounts.profiles, 1);
  assert.equal(preview.manifest.recordCounts.sessions, 1);
  assert.deepEqual(preview.warnings, []);
  assert.equal(db.mutationCount, mutationsBeforePreview);
});

test("tampering with an authoritative record invalidates the backup checksum", async () => {
  const db = new MemoryDatabase();
  db.seed("sessions", record("session-1"));

  const encoded = await exportBackup(db, fixedClock);
  const tampered = JSON.parse(encoded) as {
    records: { sessions: Array<Record<string, unknown>> };
  };
  tampered.records.sessions[0].revision = 99;

  await assert.rejects(
    () => previewBackup(JSON.stringify(tampered)),
    (error: unknown) =>
      error instanceof LiftPathV5Error && error.code === "BACKUP_ERROR",
  );
});

test("backup preview rejects duplicate ids within one store before import", async () => {
  const records = emptyBackupRecords();
  records.sessions = [record("session-duplicate"), { ...record("session-duplicate"), revision: 2 }];
  const encoded = await encodeBackupBundle(fixedClock.now(), records);

  await assert.rejects(
    () => previewBackup(encoded),
    (error: unknown) =>
      error instanceof LiftPathV5Error && error.code === "BACKUP_ERROR",
  );
});

test("destructive import snapshots current V5 data before replacement", async () => {
  const target = new MemoryDatabase();
  target.seed("profiles", record("profile-old"));
  target.seed("sessions", record("session-old"));

  const source = new MemoryDatabase();
  source.seed("profiles", record("profile-imported"));
  source.seed("sessions", record("session-imported"));
  const encoded = await exportBackup(source, fixedClock);

  const preview = await importBackup(encoded, target, fixedClock, fixedIds);

  assert.equal(preview.totalRecords, 2);
  assert.deepEqual(
    (await target.getAll<VersionedRecord>("profiles")).map((item) => item.id),
    ["profile-imported"],
  );
  assert.deepEqual(
    (await target.getAll<VersionedRecord>("sessions")).map((item) => item.id),
    ["session-imported"],
  );

  const snapshots = await target.getAll<VersionedRecord & { backupText: string }>(
    "recoverySnapshots",
  );
  assert.equal(snapshots.length, 1);
  const oldPreview = await previewBackup(snapshots[0].backupText);
  assert.equal(oldPreview.totalRecords, 2);
  assert.equal(oldPreview.manifest.recordCounts.profiles, 1);
  assert.equal(oldPreview.manifest.recordCounts.sessions, 1);
});
