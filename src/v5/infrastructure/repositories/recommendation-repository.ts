import type { RecommendationRepository } from "../../application/ports/recommendation-repository.js";
import type { V5Database } from "../../application/ports/storage.js";
import type { EntityId } from "../../domain/common/types.js";
import type { CoachRecommendation } from "../../domain/coaching/recommendation.js";
import { RECOMMENDATION_STATE_INDEX } from "../db/constants.js";
import { createIndexedDbDatabase } from "./indexed-db-database.js";

function stableSort(records: CoachRecommendation[]): CoachRecommendation[] {
  return records.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function createRecommendationRepository(
  database: V5Database = createIndexedDbDatabase(),
): RecommendationRepository {
  return {
    async save(recommendation: CoachRecommendation): Promise<void> {
      await database.transaction(["recommendations"], "readwrite", async (tx) => {
        await tx.put("recommendations", recommendation);
      });
    },
    async get(id: EntityId): Promise<CoachRecommendation | undefined> {
      return database.transaction(["recommendations"], "readonly", (tx) =>
        tx.get<CoachRecommendation>("recommendations", id),
      );
    },
    async listPending(): Promise<CoachRecommendation[]> {
      if (database.getAllByIndex) {
        return stableSort(await database.getAllByIndex<CoachRecommendation>(
          "recommendations",
          RECOMMENDATION_STATE_INDEX,
          "pending",
        ));
      }
      return stableSort((await database.getAll<CoachRecommendation>("recommendations"))
        .filter((recommendation) => recommendation.decisionState === "pending"));
    },
    async update(recommendation: CoachRecommendation): Promise<void> {
      await database.transaction(["recommendations"], "readwrite", async (tx) => {
        await tx.put("recommendations", recommendation);
      });
    },
  };
}
