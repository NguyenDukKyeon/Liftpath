import { LiftPathV5Error } from "../common/errors.js";
import type { EntityId, ISODateTime, VersionedRecord } from "../common/types.js";
import type { PrimaryGoal } from "./goals.js";
import type { SpecializationId } from "./specializations.js";

export interface TrainingBlock extends VersionedRecord {
  blockNumber: number;
  status: "active" | "completed";
  goal: PrimaryGoal;
  primarySpecialization: SpecializationId;
  secondaryFocus?: SpecializationId;
  structureId: string;
  initialProgramVersionId: EntityId;
  currentProgramVersionId: EntityId;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
}

export function validateTrainingBlock(block: TrainingBlock): void {
  if (!block.id.trim() || !block.structureId.trim()) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Training block requires stable ids");
  }
  if (!Number.isInteger(block.blockNumber) || block.blockNumber < 1) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Training block number must be positive");
  }
  if (!block.initialProgramVersionId.trim() || !block.currentProgramVersionId.trim()) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Training block requires program version ids");
  }
  if (block.status === "completed" && !block.completedAt) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Completed training block requires completedAt");
  }
  if (block.status === "active" && block.completedAt) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Active training block cannot have completedAt");
  }
}

export function advanceTrainingBlockProgram(
  block: TrainingBlock,
  programVersionId: EntityId,
  updatedAt: ISODateTime,
): TrainingBlock {
  if (block.status !== "active") {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Only an active training block can advance");
  }
  const next: TrainingBlock = {
    ...block,
    currentProgramVersionId: programVersionId,
    updatedAt,
    revision: block.revision + 1,
  };
  validateTrainingBlock(next);
  return next;
}

export function completeTrainingBlock(
  block: TrainingBlock,
  completedAt: ISODateTime,
): TrainingBlock {
  if (block.status !== "active") {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Only an active training block can complete");
  }
  const completed: TrainingBlock = {
    ...block,
    status: "completed",
    completedAt,
    updatedAt: completedAt,
    revision: block.revision + 1,
  };
  validateTrainingBlock(completed);
  return completed;
}
