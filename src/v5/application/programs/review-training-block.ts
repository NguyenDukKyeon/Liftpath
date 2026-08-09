import type { Clock } from "../ports/clock.js";
import type { BlockRepository } from "../ports/block-repository.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { EntityId } from "../../domain/common/types.js";
import {
  reviewCompletedBlock,
  type BlockReview,
  type BlockReviewInput,
} from "../../domain/programming/block-review.js";

export async function reviewTrainingBlock(
  blockId: EntityId,
  evidence: Omit<BlockReviewInput, "block">,
  dependencies: { blocks: BlockRepository; clock: Clock },
): Promise<BlockReview> {
  const block = await dependencies.blocks.get(blockId);
  if (!block) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Training block not found");
  }
  const review = reviewCompletedBlock({ block, ...evidence });
  await dependencies.blocks.saveReview(review, dependencies.clock.now());
  return review;
}
