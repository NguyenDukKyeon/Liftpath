import { LiftPathV5Error } from "../common/errors.js";
import type { EntityId } from "../common/types.js";
import type { MuscleId } from "../exercises/exercise.js";
import type { AdherenceStatus } from "../coaching/adherence.js";
import type { PerformanceTrend } from "../coaching/performance-trend.js";
import type { TrainingBlock } from "./training-block.js";

export interface BlockReview {
  blockId: EntityId;
  adherence: AdherenceStatus;
  specializationTrends: Partial<Record<MuscleId, PerformanceTrend>>;
  fatigueSignal: "low" | "normal" | "high";
  recommendation: "continue" | "adjust_next_block" | "deload_then_continue";
  evidenceIds: EntityId[];
}

export interface BlockReviewInput {
  block: TrainingBlock;
  adherence: AdherenceStatus;
  specializationTrends: Partial<Record<MuscleId, PerformanceTrend>>;
  fatigueSignal: BlockReview["fatigueSignal"];
  evidenceIds: EntityId[];
}

export function reviewCompletedBlock(input: BlockReviewInput): BlockReview {
  if (input.block.status !== "completed") {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Block review requires a completed training block");
  }

  const trends = Object.values(input.specializationTrends).filter(
    (trend): trend is PerformanceTrend => trend !== undefined && trend !== "insufficient_data",
  );
  const decliningCount = trends.filter((trend) => trend === "declining").length;
  const improvingCount = trends.filter((trend) => trend === "improving").length;
  const stableCount = trends.filter((trend) => trend === "stable").length;

  let recommendation: BlockReview["recommendation"] = "continue";
  if (
    input.fatigueSignal === "high" &&
    decliningCount >= 2 &&
    input.evidenceIds.length >= 5
  ) {
    recommendation = "deload_then_continue";
  } else if (
    input.adherence === "complete" &&
    input.fatigueSignal !== "high" &&
    improvingCount > 0 &&
    stableCount > 0
  ) {
    recommendation = "adjust_next_block";
  }

  return {
    blockId: input.block.id,
    adherence: input.adherence,
    specializationTrends: { ...input.specializationTrends },
    fatigueSignal: input.fatigueSignal,
    recommendation,
    evidenceIds: [...input.evidenceIds],
  };
}
