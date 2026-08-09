import type { EntityId, ISODateTime } from "../../domain/common/types.js";
import type { BlockReview } from "../../domain/programming/block-review.js";
import type { TrainingBlock } from "../../domain/programming/training-block.js";

export interface BlockRepository {
  createIfNoActive(block: TrainingBlock): Promise<void>;
  get(id: EntityId): Promise<TrainingBlock | undefined>;
  getActive(): Promise<TrainingBlock | undefined>;
  listAll(): Promise<TrainingBlock[]>;
  save(block: TrainingBlock): Promise<void>;
  saveReview(review: BlockReview, recordedAt: ISODateTime): Promise<void>;
  getReview(blockId: EntityId): Promise<BlockReview | undefined>;
}
