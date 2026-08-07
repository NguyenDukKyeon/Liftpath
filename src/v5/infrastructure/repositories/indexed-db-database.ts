import type {
  V5Database,
  V5StoreName,
  V5Transaction,
} from "../../application/ports/storage.js";
import type { EntityId, VersionedRecord } from "../../domain/common/types.js";
import { openLiftPathV5Db } from "../db/open-db.js";
import { requestToPromise, transactionDone } from "../db/transaction.js";

class IndexedDbTransaction implements V5Transaction {
  constructor(private readonly transaction: IDBTransaction) {}

  async put<T extends VersionedRecord>(store: V5StoreName, record: T): Promise<void> {
    await requestToPromise(this.transaction.objectStore(store).put(record));
  }

  async get<T>(store: V5StoreName, id: EntityId): Promise<T | undefined> {
    return requestToPromise(this.transaction.objectStore(store).get(id)) as Promise<T | undefined>;
  }

  async delete(store: V5StoreName, id: EntityId): Promise<void> {
    await requestToPromise(this.transaction.objectStore(store).delete(id));
  }
}

export function createIndexedDbDatabase(
  openDb: () => Promise<IDBDatabase> = openLiftPathV5Db,
): V5Database {
  return {
    async transaction<T>(stores, mode, work): Promise<T> {
      const db = await openDb();
      try {
        const nativeTransaction = db.transaction(stores, mode);
        const completion = transactionDone(nativeTransaction);
        const adaptedTransaction = new IndexedDbTransaction(nativeTransaction);

        try {
          const result = await work(adaptedTransaction);
          await completion;
          return result;
        } catch (error) {
          try {
            nativeTransaction.abort();
          } catch {
            // The transaction may already be aborting because IndexedDB raised an error.
          }
          try {
            await completion;
          } catch {
            // Preserve the original application/storage error below.
          }
          throw error;
        }
      } finally {
        db.close();
      }
    },

    async getAll<T>(store): Promise<T[]> {
      const db = await openDb();
      try {
        const nativeTransaction = db.transaction([store], "readonly");
        const completion = transactionDone(nativeTransaction);
        const records = await requestToPromise(nativeTransaction.objectStore(store).getAll());
        await completion;
        return records as T[];
      } finally {
        db.close();
      }
    },
  };
}
