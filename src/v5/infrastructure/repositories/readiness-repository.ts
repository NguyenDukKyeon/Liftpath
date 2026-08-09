import type { ReadinessRepository } from "../../application/ports/readiness-repository.js";
import type { V5Database } from "../../application/ports/storage.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { EntityId } from "../../domain/common/types.js";
import type { ReadinessEntry } from "../../domain/training/readiness.js";
import { READINESS_SESSION_INDEX } from "../db/constants.js";
import { createIndexedDbDatabase } from "./indexed-db-database.js";

function indexedQuery(database: V5Database): NonNullable<V5Database["getAllByIndex"]> {
  if (!database.getAllByIndex) {
    throw new LiftPathV5Error("STORAGE_ERROR", "Indexed readiness queries are unavailable");
  }
  return database.getAllByIndex.bind(database);
}

export function createReadinessRepository(
  database: V5Database = createIndexedDbDatabase(),
): ReadinessRepository {
  return {
    async save(entry: ReadinessEntry): Promise<void> {
      await database.transaction(["readinessEntries"], "readwrite", async (tx) => {
        const existing = await tx.getAllByIndex<ReadinessEntry>(
          "readinessEntries",
          READINESS_SESSION_INDEX,
          entry.sessionId,
        );
        if (existing.length > 0) {
          throw new LiftPathV5Error(
            "VALIDATION_ERROR",
            "Readiness has already been recorded for this session",
          );
        }
        await tx.put("readinessEntries", entry);
      });
    },

    async getForSession(sessionId: EntityId): Promise<ReadinessEntry | undefined> {
      const matches = await indexedQuery(database)<ReadinessEntry>(
        "readinessEntries",
        READINESS_SESSION_INDEX,
        sessionId,
      );
      if (matches.length > 1) {
        throw new LiftPathV5Error("CORRUPTED_DATA", "Multiple readiness entries found for one session");
      }
      return matches[0];
    },

    async listRecent(limit: number): Promise<ReadinessEntry[]> {
      if (!Number.isInteger(limit) || limit < 1) {
        throw new LiftPathV5Error("VALIDATION_ERROR", "Readiness history limit must be positive");
      }
      const entries = await database.getAll<ReadinessEntry>("readinessEntries");
      return entries
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
        .slice(0, limit);
    },
  };
}
