import type { BlockRepository } from "../../application/ports/block-repository.js";
import type { V5Database } from "../../application/ports/storage.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { EntityId, ISODateTime, VersionedRecord } from "../../domain/common/types.js";
import type { BlockReview } from "../../domain/programming/block-review.js";
import type { TrainingBlock } from "../../domain/programming/training-block.js";
import { BLOCK_STATUS_INDEX } from "../db/constants.js";
import { createIndexedDbDatabase } from "./indexed-db-database.js";

interface BlockReviewRecord extends VersionedRecord {
  value: BlockReview;
}

const reviewId = (blockId: EntityId) => `block-review:${blockId}`;

function indexedQuery(database: V5Database): NonNullable<V5Database["getAllByIndex"]> {
  if (!database.getAllByIndex) {
    throw new LiftPathV5Error("STORAGE_ERROR", "Indexed training-block queries are unavailable");
  }
  return database.getAllByIndex.bind(database);
}

export function createBlockRepository(
  database: V5Database = createIndexedDbDatabase(),
): BlockRepository {
  return {
    async createIfNoActive(block: TrainingBlock): Promise<void> {
      await database.transaction(["trainingBlocks"], "readwrite", async (tx) => {
        const active = await tx.getAllByIndex<TrainingBlock>(
          "trainingBlocks",
          BLOCK_STATUS_INDEX,
          "active",
        );
        if (active.length > 0) {
          throw new LiftPathV5Error("VALIDATION_ERROR", "An active training block already exists");
        }
        await tx.put("trainingBlocks", block);
      });
    },

    async get(id: EntityId): Promise<TrainingBlock | undefined> {
      return database.transaction(["trainingBlocks"], "readonly", (tx) =>
        tx.get<TrainingBlock>("trainingBlocks", id),
      );
    },

    async getActive(): Promise<TrainingBlock | undefined> {
      const matches = await indexedQuery(database)<TrainingBlock>(
        "trainingBlocks",
        BLOCK_STATUS_INDEX,
        "active",
      );
      if (matches.length > 1) {
        throw new LiftPathV5Error("CORRUPTED_DATA", "Multiple active training blocks found");
      }
      return matches[0];
    },

    async listAll(): Promise<TrainingBlock[]> {
      const blocks = await database.getAll<TrainingBlock>("trainingBlocks");
      return blocks.sort((left, right) => left.blockNumber - right.blockNumber || left.id.localeCompare(right.id));
    },

    async save(block: TrainingBlock): Promise<void> {
      await database.transaction(["trainingBlocks"], "readwrite", async (tx) => {
        await tx.put("trainingBlocks", block);
      });
    },

    async saveReview(review: BlockReview, recordedAt: ISODateTime): Promise<void> {
      await database.transaction(["metadata"], "readwrite", async (tx) => {
        const id = reviewId(review.blockId);
        const existing = await tx.get<BlockReviewRecord>("metadata", id);
        const record: BlockReviewRecord = {
          id,
          value: review,
          createdAt: existing?.createdAt ?? recordedAt,
          updatedAt: recordedAt,
          revision: (existing?.revision ?? 0) + 1,
        };
        await tx.put("metadata", record);
      });
    },

    async getReview(blockId: EntityId): Promise<BlockReview | undefined> {
      const record = await database.transaction(["metadata"], "readonly", (tx) =>
        tx.get<BlockReviewRecord>("metadata", reviewId(blockId)),
      );
      return record?.value;
    },
  };
}
