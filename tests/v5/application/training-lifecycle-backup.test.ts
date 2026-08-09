import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKUP_SCHEMA_VERSION,
  BACKUP_STORE_NAMES,
} from "../../../src/v5/application/backup/backup-types.js";
import type {
  V5Database,
  V5StoreName,
  V5Transaction,
} from "../../../src/v5/application/ports/storage.js";
import type { EntityId, VersionedRecord } from "../../../src/v5/domain/common/types.js";
import { exportBackup } from "../../../src/v5/application/backup/export-backup.js";
import { importBackup, previewBackup } from "../../../src/v5/application/backup/import-backup.js";

class MemoryDatabase implements V5Database {
  readonly stores = new Map<V5StoreName, Map<EntityId, VersionedRecord>>();

  seed(store: V5StoreName, record: VersionedRecord): void {
    const records = this.stores.get(store) ?? new Map<EntityId, VersionedRecord>();
    records.set(record.id, structuredClone(record));
    this.stores.set(store, records);
  }

  async transaction<T>(
    _stores: V5StoreName[],
    _mode: IDBTransactionMode,
    work: (tx: V5Transaction) => Promise<T>,
  ): Promise<T> {
    const snapshot = structuredClone(this.stores);
    const tx: V5Transaction = {
      put: async (store, record) => this.seed(store, record),
      get: async <R>(store: V5StoreName, id: EntityId) =>
        structuredClone(this.stores.get(store)?.get(id)) as R | undefined,
      getAll: async <R>(store: V5StoreName) =>
        [...(this.stores.get(store)?.values() ?? [])].map((record) => structuredClone(record) as R),
      getAllByIndex: async () => [],
      delete: async (store, id) => { this.stores.get(store)?.delete(id); },
      clear: async (store) => { this.stores.set(store, new Map()); },
    };
    try {
      return await work(tx);
    } catch (error) {
      this.stores.clear();
      for (const [store, records] of snapshot) this.stores.set(store, records);
      throw error;
    }
  }

  async getAll<T>(store: V5StoreName): Promise<T[]> {
    return [...(this.stores.get(store)?.values() ?? [])].map((record) => structuredClone(record) as T);
  }
}

const clock = { now: () => "2026-08-09T03:00:00.000Z" } as const;
const ids = { next: (prefix: string) => `${prefix}-lifecycle` } as const;
const record = (id: string): VersionedRecord => ({
  id,
  createdAt: "2026-08-09T01:00:00.000Z",
  updatedAt: "2026-08-09T01:00:00.000Z",
  revision: 1,
});

test("backup schema includes readiness and training blocks as authoritative lifecycle state", async () => {
  assert.equal(BACKUP_SCHEMA_VERSION, 2);
  assert.ok(BACKUP_STORE_NAMES.includes("readinessEntries"));
  assert.ok(BACKUP_STORE_NAMES.includes("trainingBlocks"));

  const source = new MemoryDatabase();
  source.seed("readinessEntries", { ...record("readiness-1"), sessionId: "session-1" } as VersionedRecord);
  source.seed("trainingBlocks", { ...record("block-1"), status: "active" } as VersionedRecord);

  const encoded = await exportBackup(source, clock);
  const preview = await previewBackup(encoded);
  assert.equal(preview.manifest.recordCounts.readinessEntries, 1);
  assert.equal(preview.manifest.recordCounts.trainingBlocks, 1);

  const target = new MemoryDatabase();
  await importBackup(encoded, target, clock, ids);
  assert.deepEqual((await target.getAll<VersionedRecord>("readinessEntries")).map((item) => item.id), ["readiness-1"]);
  assert.deepEqual((await target.getAll<VersionedRecord>("trainingBlocks")).map((item) => item.id), ["block-1"]);
});
