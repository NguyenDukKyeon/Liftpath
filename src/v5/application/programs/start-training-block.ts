import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { BlockRepository } from "../ports/block-repository.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { TrainingProfile } from "../../domain/programming/profile.js";
import type { ProgramVersion } from "../../domain/programming/program.js";
import { validateTrainingBlock, type TrainingBlock } from "../../domain/programming/training-block.js";

export async function startTrainingBlock(
  profile: TrainingProfile,
  program: ProgramVersion,
  dependencies: { blocks: BlockRepository; clock: Clock; ids: IdGenerator },
): Promise<TrainingBlock> {
  if (!program.structureId) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Training block requires an approved program structure");
  }
  if (program.profileId && program.profileId !== profile.id) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Program/profile mismatch for training block");
  }

  const existing = await dependencies.blocks.listAll();
  const timestamp = dependencies.clock.now();
  const block: TrainingBlock = {
    id: dependencies.ids.next("block"),
    blockNumber: existing.reduce((max, candidate) => Math.max(max, candidate.blockNumber), 0) + 1,
    status: "active",
    goal: profile.goal,
    primarySpecialization: profile.primarySpecialization,
    secondaryFocus: profile.secondaryFocus,
    structureId: program.structureId,
    initialProgramVersionId: program.id,
    currentProgramVersionId: program.id,
    startedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
  };
  validateTrainingBlock(block);
  await dependencies.blocks.createIfNoActive(block);
  return block;
}
