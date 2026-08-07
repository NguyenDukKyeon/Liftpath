import type { EntityId, VersionedRecord } from "../../domain/common/types.js";

export type V5StoreName =
  | "metadata"
  | "profiles"
  | "programVersions"
  | "sessions"
  | "sessionExercises"
  | "sets"
  | "recommendations"
  | "recoverySnapshots"
  | "readinessEntries"
  | "trainingBlocks";

export interface V5Transaction {
  put<T extends VersionedRecord>(store: V5StoreName, record: T): Promise<void>;
  get<T>(store: V5StoreName, id: EntityId): Promise<T | undefined>;
  getAll<T>(store: V5StoreName): Promise<T[]>;
  delete(store: V5StoreName, id: EntityId): Promise<void>;
  clear(store: V5StoreName): Promise<void>;
}

export interface V5Database {
  transaction<T>(
    stores: V5StoreName[],
    mode: IDBTransactionMode,
    work: (tx: V5Transaction) => Promise<T>,
  ): Promise<T>;
  getAll<T>(store: V5StoreName): Promise<T[]>;
  getAllByIndex?<T>(
    store: V5StoreName,
    indexName: string,
    key: IDBValidKey | IDBKeyRange,
  ): Promise<T[]>;
}
