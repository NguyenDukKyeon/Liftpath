import { V5_DB_NAME, V5_DB_VERSION, V5_STORES } from "./constants.js";

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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open LiftPath V5 database"));
    request.onblocked = () => reject(new Error("LiftPath V5 database upgrade is blocked"));
  });
}
