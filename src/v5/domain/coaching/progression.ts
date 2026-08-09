import { classifyEffortStatus } from "./effort-status.js";
import type { PerformanceExposure } from "./performance-trend.js";
import type { ProgramPatch } from "./recommendation.js";
import type { EntityId } from "../common/types.js";

export interface ProgressionInput {
  exerciseId: EntityId;
  exposures: readonly PerformanceExposure[];
  minReps: number;
  maxReps: number;
  targetRir: number;
  loadIncrementKg: number;
}

function roundLoad(loadKg: number): number {
  return Math.round(loadKg * 100) / 100;
}

export function recommendProgression(input: ProgressionInput): ProgramPatch | null {
  const recent = input.exposures.slice(-3);
  if (recent.length < 3) return null;

  const effort = classifyEffortStatus(recent, input.targetRir);
  if (effort === "too_hard") {
    return { kind: "set_target_rir", exerciseId: input.exerciseId, targetRir: input.targetRir };
  }
  if (effort !== "on_target") return null;

  const topRangeAtComparableEffort = recent.every((exposure) =>
    exposure.reps >= input.maxReps
    && exposure.rir !== undefined
    && Math.abs(exposure.rir - input.targetRir) <= 1,
  );
  if (!topRangeAtComparableEffort || input.loadIncrementKg <= 0) return null;

  const latest = recent[recent.length - 1];
  if (!latest || latest.loadKg <= 0) return null;
  return {
    kind: "set_load",
    exerciseId: input.exerciseId,
    loadKg: roundLoad(latest.loadKg + input.loadIncrementKg),
  };
}
