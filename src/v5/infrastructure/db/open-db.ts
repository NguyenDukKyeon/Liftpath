import {
  SESSION_STATUS_INDEX,
  SET_SESSION_INDEX,
  V5_DB_NAME,
  V5_DB_VERSION,
  V5_STORES,
} from "./constants.js";

export function openLiftPathV5Db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(V5_DB_NAME, V5_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of V5_STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }

      const upgradeTransaction = request.transaction;
      if (!upgradeTransaction) {
        throw new Error("LiftPath V5 database upgrade transaction is unavailable");
      }

      const sessions = upgradeTransaction.objectStore("sessions");
      if (!sessions.indexNames.contains(SESSION_STATUS_INDEX)) {
        sessions.createIndex(SESSION_STATUS_INDEX, "status", { unique: false });
      }

      const sets = upgradeTransaction.objectStore("sets");
      if (!sets.indexNames.contains(SET_SESSION_INDEX)) {
        sets.createIndex(SET_SESSION_INDEX, "sessionId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open LiftPath V5 database"));
    request.onblocked = () => reject(new Error("LiftPath V5 database upgrade is blocked"));
  });
}
