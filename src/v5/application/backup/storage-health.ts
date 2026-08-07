import { LiftPathV5Error } from "../../domain/common/errors.js";
import { openLiftPathV5Db } from "../../infrastructure/db/open-db.js";

export interface StorageDatabaseInfo {
  name: string;
  stores: string[];
}

export type StorageHealth =
  | { status: "ready"; databaseInfo: StorageDatabaseInfo }
  | { status: "error"; message: string };

export type StorageHealthLoader = () => Promise<StorageHealth>;

export const loadStorageHealth: StorageHealthLoader = async () => {
  try {
    const db = await openLiftPathV5Db();
    try {
      return {
        status: "ready",
        databaseInfo: { name: db.name, stores: [...db.objectStoreNames] },
      };
    } finally {
      db.close();
    }
  } catch (error) {
    if (error instanceof LiftPathV5Error) {
      throw error;
    }
    throw new LiftPathV5Error("STORAGE_ERROR", "Unable to open LiftPath V5 storage", error);
  }
};
