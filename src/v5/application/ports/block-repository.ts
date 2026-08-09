import type { EntityId } from "../../domain/common/types.js";
import type { TrainingBlock } from "../../domain/programming/training-block.js";

export interface BlockRepository {
  createIfNoActive(block: TrainingBlock): Promise<void>;
  get(id: EntityId): Promise<TrainingBlock | undefined>;
  getActive(): Promise<TrainingBlock | undefined>;
  listAll(): Promise<TrainingBlock[]>;
  save(block: TrainingBlock): Promise<void>;
}
