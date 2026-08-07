import type { SessionRepository } from "../../application/ports/session-repository.js";
import type { V5Database } from "../../application/ports/storage.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { EntityId } from "../../domain/common/types.js";
import type { CompletedSet } from "../../domain/training/set.js";
import type { TrainingSession } from "../../domain/training/session.js";
import { SESSION_STATUS_INDEX, SET_SESSION_INDEX } from "../db/constants.js";
import { createIndexedDbDatabase } from "./indexed-db-database.js";

function indexedQuery(database: V5Database): NonNullable<V5Database["getAllByIndex"]> {
  if (!database.getAllByIndex) {
    throw new LiftPathV5Error("STORAGE_ERROR", "Indexed workout queries are unavailable");
  }
  return database.getAllByIndex.bind(database);
}

export function createSessionRepository(
  database: V5Database = createIndexedDbDatabase(),
): SessionRepository {
  return {
    async create(session: TrainingSession): Promise<void> {
      await database.transaction(["sessions"], "readwrite", async (tx) => {
        await tx.put("sessions", session);
      });
    },

    async update(session: TrainingSession): Promise<void> {
      await database.transaction(["sessions"], "readwrite", async (tx) => {
        await tx.put("sessions", session);
      });
    },

    async get(id: EntityId): Promise<TrainingSession | undefined> {
      return database.transaction(["sessions"], "readonly", (tx) =>
        tx.get<TrainingSession>("sessions", id),
      );
    },

    async getActive(): Promise<TrainingSession | undefined> {
      const matches = await indexedQuery(database)<TrainingSession>(
        "sessions",
        SESSION_STATUS_INDEX,
        "active",
      );
      if (matches.length > 1) {
        throw new LiftPathV5Error("CORRUPTED_DATA", "Multiple active workout sessions found");
      }
      return matches[0];
    },

    async listSets(sessionId: EntityId): Promise<CompletedSet[]> {
      const matches = await indexedQuery(database)<CompletedSet>(
        "sets",
        SET_SESSION_INDEX,
        sessionId,
      );
      return matches.sort(
        (left, right) => left.setOrdinal - right.setOrdinal || left.id.localeCompare(right.id),
      );
    },

    async saveSet(set: CompletedSet): Promise<void> {
      await database.transaction(["sets"], "readwrite", async (tx) => {
        await tx.put("sets", set);
      });
    },
  };
}
