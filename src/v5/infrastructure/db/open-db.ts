import {
  BLOCK_STARTED_AT_INDEX,
  BLOCK_STATUS_INDEX,
  READINESS_CREATED_AT_INDEX,
  READINESS_SESSION_INDEX,
  RECOMMENDATION_CREATED_AT_INDEX,
  RECOMMENDATION_STATE_INDEX,
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

      const recommendations = upgradeTransaction.objectStore("recommendations");
      if (!recommendations.indexNames.contains(RECOMMENDATION_STATE_INDEX)) {
        recommendations.createIndex(RECOMMENDATION_STATE_INDEX, "decisionState", { unique: false });
      }
      if (!recommendations.indexNames.contains(RECOMMENDATION_CREATED_AT_INDEX)) {
        recommendations.createIndex(RECOMMENDATION_CREATED_AT_INDEX, "createdAt", { unique: false });
      }

      const readinessEntries = upgradeTransaction.objectStore("readinessEntries");
      if (!readinessEntries.indexNames.contains(READINESS_SESSION_INDEX)) {
        readinessEntries.createIndex(READINESS_SESSION_INDEX, "sessionId", { unique: true });
      }
      if (!readinessEntries.indexNames.contains(READINESS_CREATED_AT_INDEX)) {
        readinessEntries.createIndex(READINESS_CREATED_AT_INDEX, "createdAt", { unique: false });
      }

      const trainingBlocks = upgradeTransaction.objectStore("trainingBlocks");
      if (!trainingBlocks.indexNames.contains(BLOCK_STATUS_INDEX)) {
        trainingBlocks.createIndex(BLOCK_STATUS_INDEX, "status", { unique: false });
      }
      if (!trainingBlocks.indexNames.contains(BLOCK_STARTED_AT_INDEX)) {
        trainingBlocks.createIndex(BLOCK_STARTED_AT_INDEX, "startedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open LiftPath V5 database"));
    request.onblocked = () => reject(new Error("LiftPath V5 database upgrade is blocked"));
  });
}
